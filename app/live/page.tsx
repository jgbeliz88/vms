"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useChannelsQuery,
  useChannelAction,
  useBatchAction,
  useBatchPodDelete,
  useCreateChannel,
  useDeleteChannel,
  useConfigLayoutQuery,
  useAddLinear,
  useDeleteLinearAction,
  useDeletePodReference,
  useUpdateChannelConfig,
} from "@/features/live/hooks";
import {
  useEncodersQuery,
  useCreateEncoder,
  useDeleteEncoder,
  useMediaexcelChannelsQuery,
} from "@/features/live/encoder-hooks";
import { channelActions, batchActions } from "@/features/live/config";
import { BatchAction, ResolvedChannel, ResolvedPod, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { ChannelTable } from "@/components/live/ChannelTable";
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


export default function LivePage() {
  const { notify } = useToast();
  const canAdmin = usePermission([ROLES.ADMIN]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<ChannelAction | null>(null);
  const [confirmChannel, setConfirmChannel] = useState<ResolvedChannel | null>(null);
  const [selectedPodIndices, setSelectedPodIndices] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePodLoading, setDeletePodLoading] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState<BatchAction | null>(null);
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<ResolvedChannel | null>(null);
  const [batchResults, setBatchResults] = useState<
    Array<{ channelId: number; status: "success" | "error"; actionId: string }>
  >([]);

  const channelsQuery = useChannelsQuery();
  const configLayoutQuery = useConfigLayoutQuery();
  const encodersQuery = useEncodersQuery();
  const mediaexcelChannelsQuery = useMediaexcelChannelsQuery();
  const [savingConfigId, setSavingConfigId] = useState<number | null>(null);
  const [channelFilter, setChannelFilter] = useState("");
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const actionMutation = useChannelAction();
  const batchMutation = useBatchAction();
  const batchPodDelete = useBatchPodDelete();
  const addLinear = useAddLinear();
  const deleteLinearAction = useDeleteLinearAction();
  const deletePodReference = useDeletePodReference();
  const updateChannelConfig = useUpdateChannelConfig();
  const createEncoder = useCreateEncoder();
  const deleteEncoder = useDeleteEncoder();

  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const encoders = useMemo(() => encodersQuery.data ?? [], [encodersQuery.data]);
  const mediaexcelChannels = useMemo(() => mediaexcelChannelsQuery.data ?? [], [mediaexcelChannelsQuery.data]);
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

  const toggleOne = (id: number) => {
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

  const handleAdAction = async (channelId: number, actionId: string) => {
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

  const handleCreateLinearForChannel = async (channelId: number, data: AddLinearData) => {
    try {
      await addLinear.mutateAsync({
        channelEntityId: channelId,
        podName: data.podName,
        linearName: data.linearName,
        drm: data.drm,
        adsReplacement: data.adsReplacement,
        fragmentLength: data.fragmentLength,
        disableDrmManifests: data.disableDrmManifests,
        drmVendor: data.drmVendor,
        contentId: data.contentId,
      });
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
    _channelId: number,
    pod: ResolvedPod,
    linearName: string
  ) => {
    try {
      await deleteLinearAction.mutateAsync({ podName: pod.name, linearName, action: "clear" });
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
    _channelId: number,
    pod: ResolvedPod,
    linearName: string | null
  ) => {
    if (!linearName) {
      try {
        await deletePodReference.mutateAsync({ podName: pod.name });
        notify({ title: "Pod removed", description: `${pod.name} removed.` });
      } catch (error) {
        notify({
          title: "Delete pod failed",
          description: error instanceof Error ? error.message : "Unable to delete pod",
          variant: "error",
        });
        throw error;
      }
      return;
    }
    try {
      await deleteLinearAction.mutateAsync({ podName: pod.name, linearName, action: "delete" });
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
        deletions.map(async ({ podName, linearName, deletePod }) => {
          if (!linearName) return { podName, status: "success" as const };
          try {
            await deleteLinearAction.mutateAsync({
              podName,
              linearName,
              action: deletePod ? "delete" : "clear",
            });
          } catch (e) {
            return { podName, status: "error" as const, message: e instanceof Error ? e.message : `HTTP error` };
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

  const handleCreateLinear = async (
    items: CreateLinearItem[],
    config: LinearFormConfig
  ): Promise<CreateLinearResult[]> => {
    const results = await Promise.all(
      items.map(async ({ channelEntityId, podName, linearName }) => {
        try {
          await addLinear.mutateAsync({
            channelEntityId,
            podName,
            linearName,
            ...config,
          });
          return { podName, linearName, status: "created" as const };
        } catch (e) {
          const err = e as Error & { curlCommand?: string };
          return {
            podName,
            linearName,
            status: "error" as const,
            message: err.message || "Failed",
            curlCommand: err.curlCommand,
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
    groups: Array<{ channelId: number; pods: Array<{ podName: string; podId: number; linear: import("@/features/live/types").Linear | null }> }>
  ) => {
    const allPods = groups.flatMap((g) => g.pods.map((p) => ({ name: p.podName, linear: p.linear })));
    return await batchPodDelete.mutateAsync(allPods);
  };

  const handleAddPod = async (data: AddLinearData) => {
    if (!confirmChannel) return;
    try {
      await addLinear.mutateAsync({
        channelEntityId: confirmChannel.id,
        podName: data.podName,
        linearName: data.linearName,
        drm: data.drm,
        adsReplacement: data.adsReplacement,
        fragmentLength: data.fragmentLength,
        disableDrmManifests: data.disableDrmManifests,
        drmVendor: data.drmVendor,
        contentId: data.contentId,
      });
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
      setBatchResults(result as Array<{ channelId: number; status: "success" | "error"; actionId: string }>);

      const coreActionId = batchConfirm.id.replace(/^batch-/, "");
      const allFailedPods = result.flatMap((r) =>
        (r.podResults ?? []).filter((p) => p.error)
      );

      if (allFailedPods.length === 0) {
        const verb =
          coreActionId === "sync" ? "synchronized" :
          coreActionId === "clean" ? "cleaned" : "processed";
        notify({ title: `Linears ${verb}` });
      } else {
        const description = allFailedPods
          .map((p) => `${p.linearName ?? p.podName} (${p.podName}) - Failed ${batchConfirm.label}: ${p.error}`)
          .join(" · ");
        notify({ title: "Batch completed with errors", description, variant: "error" });
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

  const handleSaveConfig = async (channelId: number, rows: ChannelConfigRow[]) => {
    setSavingConfigId(channelId);
    try {
      await updateChannelConfig.mutateAsync({ id: channelId, config: rows });
      const channel = channels.find((c) => c.id === channelId);
      notify({ title: "Config saved", description: `${channel?.name ?? ""} configuration updated.` });
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
              onDelete={setDeleteConfirmChannel}
              configLayout={configLayoutQuery.data}
              onSaveConfig={handleSaveConfig}
              savingConfigId={savingConfigId}
              mediaexcelChannels={mediaexcelChannels}
              onCreateLinear={handleCreateLinearForChannel}
              onDeleteLinear={handleDeleteLinearForChannel}
              onDeletePod={handleDeletePodForChannel}
            />
          )}

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
