"use client";

import { Fragment, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useChannelsQuery,
  useChannelAction,
  useBatchAction,
  useBatchPodDelete,
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useConfigLayoutQuery,
  useAddLinear,
  useDeleteLinear,
  useDeleteLinearAction,
  useUpdateChannelConfig,
  type ConfigLayout,
} from "@/features/live/hooks";
import {
  useEncodersQuery,
  useCreateEncoder,
  useDeleteEncoder,
} from "@/features/live/encoder-hooks";
import { channelActions, batchActions } from "@/features/live/config";
import { BatchAction, ResolvedChannel, ResolvedPod, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { ChannelTable } from "@/components/live/ChannelTable";
import { ChannelConfigReadOnlyTable } from "@/components/live/ChannelConfigReadOnlyTable";
import { ActionConfirmModal, AddLinearData, DeleteFlowDeletion } from "@/components/live/ActionConfirmModal";
import { BatchActionBar, CreateLinearItem, LinearFormConfig, CreateLinearResult } from "@/components/live/BatchActionBar";
import { BatchConfirmModal } from "@/components/live/BatchConfirmModal";
import { CreateChannelPanel } from "@/components/live/CreateChannelPanel";
import { EncoderConfigSection } from "@/components/live/EncoderConfigSection";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { getEnigmaBaseUrl } from "@/lib/utils/enigma-url";

function ChannelConfigOverview({
  channels,
  layout,
  showConfig,
  setShowConfig,
}: {
  channels: ResolvedChannel[];
  layout?: ConfigLayout;
  showConfig: boolean;
  setShowConfig: (fn: (v: boolean) => boolean) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setShowConfig((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Channel Configuration
          </div>
          <div className="text-xs text-slate-500">
            {channels.length} channel{channels.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span className="text-xs text-slate-400">{showConfig ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {showConfig && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          {channels.length === 0 ? (
            <p className="text-xs text-slate-400">No channels created yet.</p>
          ) : !layout ? (
            <p className="text-xs text-slate-400">Loading configuration layout…</p>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {channels.map((ch) => {
                      const isExpanded = expandedId === ch.id;
                      return (
                        <Fragment key={ch.id}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {ch.name}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant={isExpanded ? "primary" : "secondary"}
                                onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                              >
                                {isExpanded ? "Collapse" : "Details"}
                              </Button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={2} className="bg-slate-50 px-4 py-4 dark:bg-slate-950">
                                <ChannelConfigReadOnlyTable channel={ch} layout={layout} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LivePage() {
  const { notify } = useToast();
  const canAdmin = usePermission([ROLES.ADMIN]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<ChannelAction | null>(null);
  const [confirmChannel, setConfirmChannel] = useState<ResolvedChannel | null>(null);
  const [selectedPodIndices, setSelectedPodIndices] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePodLoading, setDeletePodLoading] = useState(false); // kept for batch delete flow
  const [batchConfirm, setBatchConfirm] = useState<BatchAction | null>(null);
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<ResolvedChannel | null>(null);
  const [batchResults, setBatchResults] = useState<
    Array<{ channelId: string; status: "success" | "error"; actionId: string }>
  >([]);

  const channelsQuery = useChannelsQuery();
  const configLayoutQuery = useConfigLayoutQuery();
  const encodersQuery = useEncodersQuery();
  const [savingConfigId, setSavingConfigId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const updateChannel = useUpdateChannel();
  const actionMutation = useChannelAction();
  const batchMutation = useBatchAction();
  const batchPodDelete = useBatchPodDelete();
  const addLinear = useAddLinear();
  const deleteLinearMutation = useDeleteLinear();
  const deleteLinearAction = useDeleteLinearAction();
  const updateChannelConfig = useUpdateChannelConfig();
  const createEncoder = useCreateEncoder();
  const deleteEncoder = useDeleteEncoder();

  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const encoders = useMemo(() => encodersQuery.data ?? [], [encodersQuery.data]);
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (!channelFilter.trim()) return true;
      return channel.name.toLowerCase().includes(channelFilter.toLowerCase());
    });
  }, [channels, channelFilter]);
  const selectedChannels = useMemo(
    () => channels.filter((channel) => selectedIds.includes(channel.id)),
    [channels, selectedIds]
  );

  const toggleAll = () => {
    if (selectedIds.length === filteredChannels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredChannels.map((channel) => channel.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAction = (channel: ResolvedChannel, action: ChannelAction) => {
    setConfirmChannel(channel);
    setConfirmAction(action);
    setSelectedPodIndices(channel.pods.map((_, i) => i));
  };

  const togglePodIndex = (index: number) => {
    setSelectedPodIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleAdAction = async (channelId: string, actionId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    try {
      await actionMutation.mutateAsync({ channel, actionId });
      notify({ title: "AdReplacement", description: `${actionId.toUpperCase()} sent to ${channel.name}.` });
    } catch (error) {
      notify({
        title: "AdReplacement failed",
        description: error instanceof Error ? error.message : `Unable to send ${actionId}`,
        variant: "error"
      });
    }
  };

  const handleCreateLinearForChannel = async (channelId: string, data: AddLinearData) => {
    try {
      await addLinear.mutateAsync({ ...data, channelInternalId: channelId });
      notify({ title: "Linear created", description: `${data.linearName} added.` });
    } catch (error) {
      notify({
        title: "Create linear failed",
        description: error instanceof Error ? error.message : "Unable to create linear",
        variant: "error",
      });
      throw error;
    }
  };

  const handleDeleteLinearForChannel = async (
    channelId: string,
    pod: ResolvedPod,
    linearName: string
  ) => {
    try {
      await deleteLinearAction.mutateAsync({ podName: pod.name, linearName });
      await deleteLinearMutation.mutateAsync({
        channelInternalId: channelId,
        pods: [{ encoderId: pod.encoderId, podId: pod.id, removeRef: false }],
      });
      notify({ title: "Linear deleted", description: `${linearName} removed.` });
    } catch (error) {
      notify({
        title: "Delete linear failed",
        description: error instanceof Error ? error.message : "Unable to delete linear",
        variant: "error",
      });
      throw error;
    }
  };

  const handleDeletePodForChannel = async (
    channelId: string,
    pod: ResolvedPod,
    linearName: string | null
  ) => {
    try {
      if (linearName) {
        await deleteLinearAction.mutateAsync({ podName: pod.name, linearName });
      }
      await deleteLinearMutation.mutateAsync({
        channelInternalId: channelId,
        pods: [{ encoderId: pod.encoderId, podId: pod.id, removeRef: true }],
      });
      notify({ title: "Pod removed", description: `${pod.name} removed.` });
    } catch (error) {
      notify({
        title: "Delete pod failed",
        description: error instanceof Error ? error.message : "Unable to delete pod",
        variant: "error",
      });
      throw error;
    }
  };

  const executeDeleteFlow = async (deletions: DeleteFlowDeletion[]) => {
    if (!confirmChannel) return;
    setDeletePodLoading(true);
    try {
      const results = await Promise.all(
        deletions.map(async ({ podName, encoderId, podId, linearName, deletePod }) => {
          // Delete linear via Enigma API if one is selected
          if (linearName) {
            try {
              await deleteLinearAction.mutateAsync({ podName, linearName });
            } catch (e) {
              return { podName, status: "error" as const, message: e instanceof Error ? e.message : `HTTP error` };
            }
          }

          // Update local store
          try {
            await deleteLinearMutation.mutateAsync({
              channelInternalId: confirmChannel.id,
              pods: [{ encoderId, podId, removeRef: deletePod }],
            });
          } catch (e) {
            return { podName, status: "error" as const, message: e instanceof Error ? e.message : "Store update failed" };
          }

          return { podName, status: "success" as const };
        })
      );

      const succeeded = results.filter((r) => r.status === "success").length;
      const failed = results.filter((r) => r.status === "error").length;
      if (failed > 0) {
        notify({
          title: "Delete Linear",
          description: `${succeeded} eliminado(s), ${failed} fallido(s).`,
          variant: failed === results.length ? "error" : undefined,
        });
      } else {
        notify({ title: "Delete Linear", description: `${succeeded} item(s) eliminado(s) de ${confirmChannel.name}.` });
      }
    } catch (error) {
      notify({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete pod",
        variant: "error",
      });
    } finally {
      setDeletePodLoading(false);
      setConfirmAction(null);
      setConfirmChannel(null);
      setSelectedPodIndices([]);
    }
  };

  const enigmaBaseUrl = `${getEnigmaBaseUrl()}/live`;

  const handleCreateLinear = async (
    items: CreateLinearItem[],
    config: LinearFormConfig
  ): Promise<CreateLinearResult[]> => {
    const results = await Promise.all(
      items.map(async ({ channelId, encoderId, podId, podName, linearName }) => {
        const enigmaPayload = {
          channelId: linearName,
          drm: config.drm,
          adsReplacement: config.adsReplacement,
          fragmentLength: config.fragmentLength,
          disableDrmManifests: config.disableDrmManifests,
          drmVendor: config.drmVendor,
          contentId: config.contentId,
        };
        const curlCommand = `curl -X POST "${enigmaBaseUrl}/${podName}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(enigmaPayload)}'`;
        try {
          await addLinear.mutateAsync({
            channelInternalId: channelId,
            encoderId,
            podId,
            podName,
            linearName,
            ...config,
          });
          return { podName, linearName, status: "created" as const };
        } catch (e) {
          return {
            podName,
            linearName,
            status: "error" as const,
            message: e instanceof Error ? e.message : "Failed",
            curlCommand,
          };
        }
      })
    );
    const created = results.filter((r) => r.status === "created").length;
    const failed = results.filter((r) => r.status === "error").length;
    if (failed > 0) {
      notify({ title: "Create Linear", description: `${created} created, ${failed} failed.`, variant: "error" });
    } else {
      notify({ title: "Create Linear", description: `${created} linear(s) created.` });
    }
    return results;
  };

  const executeAction = async () => {
    if (!confirmChannel || !confirmAction) return;

    const filteredChannel = {
      ...confirmChannel,
      pods: confirmChannel.pods.filter((_, i) => selectedPodIndices.includes(i))
    };

    try {
      const result = await actionMutation.mutateAsync({ channel: filteredChannel, actionId: confirmAction.id });
      const podSummary = result.podResults.map((p) => `${p.podName}: ${p.status}`).join(" · ");
      notify({ title: "Action executed", description: `${confirmAction.label} — ${podSummary}` });
    } catch (error) {
      notify({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unable to execute action",
        variant: "error"
      });
    } finally {
      setConfirmAction(null);
      setConfirmChannel(null);
      setSelectedPodIndices([]);
    }
  };

  const handleBatchDeleteLinear = async (
    groups: Array<{ channelId: string; pods: Array<{ podName: string; podId: number; encoderId: number; linear: import("@/features/live/types").Linear | null }> }>
  ) => {
    const allPods = groups.flatMap((g) => g.pods.map((p) => ({ name: p.podName, linear: p.linear })));
    const results = await batchPodDelete.mutateAsync(allPods);

    // Only update the local store for pods where Enigma returned 200
    const successfulPodNames = new Set(
      results.filter((r) => r.status >= 200 && r.status < 300).map((r) => r.podName)
    );

    const storeUpdates = groups
      .map((g) => {
        const successfulPods = g.pods.filter((pod) => successfulPodNames.has(pod.podName));
        if (successfulPods.length === 0) return null;
        return deleteLinearMutation.mutateAsync({
          channelInternalId: g.channelId,
          pods: successfulPods.map((pod) => ({ encoderId: pod.encoderId, podId: pod.podId, removeRef: false })),
        });
      })
      .filter(Boolean);

    await Promise.all(storeUpdates);
    return results;
  };

  const handleAddPod = async (data: AddLinearData) => {
    if (!confirmChannel) return;
    try {
      await addLinear.mutateAsync({ ...data, channelInternalId: confirmChannel.id });
      notify({ title: "Pod added", description: `Linear ${data.linearName} added.` });
      setConfirmAction(null);
      setConfirmChannel(null);
    } catch (error) {
      notify({
        title: "Add Pod failed",
        description: error instanceof Error ? error.message : "Unable to add pod",
        variant: "error"
      });
    }
  };

  const runBatch = (actionId: string) => {
    const action = batchActions.find((item) => item.id === actionId) ?? null;
    setBatchConfirm(action);
  };

  const executeBatch = async () => {
    if (!batchConfirm) return;
    try {
      const result = await batchMutation.mutateAsync({
        channels: selectedChannels,
        actionId: batchConfirm.id
      });
      setBatchResults(result as Array<{ channelId: string; status: "success" | "error"; actionId: string }>);
      const failures = result.filter((item) => item.status === "error");
      if (failures.length > 0) {
        notify({
          title: "Batch completed with errors",
          description: `${failures.length} channels failed.`,
          variant: "error"
        });
      } else {
        notify({ title: "Batch completed", description: "All channels processed." });
      }
    } catch (error) {
      notify({
        title: "Batch failed",
        description: error instanceof Error ? error.message : "Unable to run batch",
        variant: "error"
      });
    } finally {
      setBatchConfirm(null);
    }
  };

  const handleCreate = async (values: {
    name: string;
    channelPath: string;
    metadata: Record<string, unknown>;
  }) => {
    try {
      await createChannel.mutateAsync(values);
      notify({ title: "Channel created", description: `${values.name} added to the list.` });
      setChannelFilter("");
      setCreateOpen(false);
    } catch (error) {
      notify({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Unable to create channel",
        variant: "error"
      });
    }
  };

  const handleSaveConfig = async (channelId: string, rows: ChannelConfigRow[]) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    setSavingConfigId(channelId);
    try {
      await updateChannelConfig.mutateAsync({
        id: channelId,
        name: channel.name,
        channelPath: channel.channelPath ?? "",
        platform: channel.platform,
        metadata: channel.metadata,
        config: rows,
      });
      notify({ title: "Config saved", description: `${channel.name} configuration updated.` });
    } catch (error) {
      notify({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save config",
        variant: "error",
      });
    } finally {
      setSavingConfigId(null);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmChannel) return;
    const id = deleteConfirmChannel.id;
    setDeleteConfirmChannel(null);
    try {
      await deleteChannel.mutateAsync({ id });
      notify({ title: "Channel deleted", description: `${deleteConfirmChannel.name} removed.` });
    } catch (error) {
      notify({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete channel",
        variant: "error",
      });
    }
  };

  const handleUpdate = async (values: {
    id: string;
    name: string;
    channelPath: string;
    platform: string;
    metadata: Record<string, unknown>;
  }) => {
    try {
      await updateChannel.mutateAsync(values);
      notify({ title: "Channel updated", description: `${values.name} saved.` });
    } catch (error) {
      notify({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update channel",
        variant: "error"
      });
    }
  };

  const handleCreateEncoder = async (data: { encoderChannel: string; heroName: string }) => {
    try {
      await createEncoder.mutateAsync(data);
      notify({ title: "Encoder created", description: `${data.encoderChannel} added.` });
    } catch (error) {
      notify({
        title: "Create encoder failed",
        description: error instanceof Error ? error.message : "Unable to create encoder",
        variant: "error",
      });
    }
  };

  const handleDeleteEncoder = async (id: number) => {
    try {
      await deleteEncoder.mutateAsync({ id });
      notify({ title: "Encoder deleted" });
    } catch (error) {
      notify({
        title: "Delete encoder failed",
        description: error instanceof Error ? error.message : "Unable to delete encoder",
        variant: "error",
      });
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Live Channels</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Real-time operational view for live broadcast workflows.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                placeholder="Filter channels..."
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              {canAdmin && <Button onClick={() => setCreateOpen(true)}>Create Channel</Button>}
            </div>
          </div>

          {channelsQuery.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Loading channels...
            </div>
          ) : (
            <ChannelTable
              channels={filteredChannels}
              actions={channelActions}
              selectedIds={selectedIds}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              onAction={handleAction}
              onAdAction={handleAdAction}
              onUpdate={handleUpdate}
              onDelete={setDeleteConfirmChannel}
              configLayout={configLayoutQuery.data}
              onSaveConfig={handleSaveConfig}
              savingConfigId={savingConfigId}
              encoders={encoders}
              onCreateLinear={handleCreateLinearForChannel}
              onDeleteLinear={handleDeleteLinearForChannel}
              onDeletePod={handleDeletePodForChannel}
            />
          )}

          {/* Channel Configuration */}
          <ChannelConfigOverview channels={channels} layout={configLayoutQuery.data} showConfig={showConfig} setShowConfig={setShowConfig} />

          {/* Encoder Configuration */}
          <EncoderConfigSection
            encoders={encoders}
            onCreateEncoder={handleCreateEncoder}
            onDeleteEncoder={handleDeleteEncoder}
            loading={encodersQuery.isLoading}
          />

          {batchResults.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Batch Results</div>
              <div className="mt-3 grid gap-2">
                {batchResults.map((result) => (
                  <div
                    key={`${result.actionId}-${result.channelId}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-200"
                  >
                    <span>{result.channelId}</span>
                    <Badge label={result.status} tone={result.status === "success" ? "success" : "error"} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <BatchActionBar
          actions={batchActions}
          selected={selectedChannels}
          onAction={runBatch}
          onDeleteLinear={handleBatchDeleteLinear}
          deleteLinearLoading={batchPodDelete.isPending}
          onCreateLinear={handleCreateLinear}
        />

        <ActionConfirmModal
          open={Boolean(confirmAction)}
          onClose={() => {
            setConfirmAction(null);
            setConfirmChannel(null);
            setSelectedPodIndices([]);
          }}
          channel={confirmChannel}
          action={confirmAction}
          selectedPodIndices={selectedPodIndices}
          onPodToggle={togglePodIndex}
          onConfirm={executeAction}
          onAddPodConfirm={handleAddPod}
          onDeleteFlowConfirm={executeDeleteFlow}
          loading={confirmAction?.id === "delete-flow" ? deletePodLoading : actionMutation.isPending}
          encoders={encoders}
        />

        <BatchConfirmModal
          open={Boolean(batchConfirm)}
          onClose={() => setBatchConfirm(null)}
          action={batchConfirm}
          channels={selectedChannels}
          onConfirm={executeBatch}
          loading={batchMutation.isPending}
        />

        <CreateChannelPanel open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />

        <Modal
          open={Boolean(deleteConfirmChannel)}
          onClose={() => setDeleteConfirmChannel(null)}
          title="Delete channel"
          size="md"
        >
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteConfirmChannel?.name}</span>?
            This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmChannel(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={executeDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
