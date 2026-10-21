"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import {
  useChannelsQuery,
  useChannelAction,
  useCreateChannel,
  useDeleteChannel,
  useConfigLayoutQuery,
  useAddLinear,
  useDeleteLinearAction,
  useDeletePodReference,
  useUpdateChannelConfig,
} from "@/features/live/hooks";
import { useMediaexcelChannelsQuery } from "@/features/live/encoder-hooks";
import { channelActions } from "@/features/live/config";
import { ResolvedChannel, ResolvedPod, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { ChannelTable } from "@/components/live/ChannelTable";
import { ActionConfirmModal, AddLinearData, DeleteFlowDeletion } from "@/components/live/ActionConfirmModal";
import { BatchActionBar } from "@/components/live/BatchActionBar";
import { CreateChannelPanel } from "@/components/live/CreateChannelPanel";
import { PodCommands } from "@/components/live/PodCommands";
import { IconPod } from "@/components/live/linear-ui";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

type LiveTab = "channels" | "pods";

export default function LivePage() {
  const { notify } = useToast();
  const canAdmin = usePermission([PERMISSIONS.LIVE_MANAGE_CHANNELS]);
  const canPodActions = usePermission([PERMISSIONS.LINEAR_ACTIONS]);
  const [tab, setTab] = useState<LiveTab>("channels");
  const activeTab: LiveTab = canPodActions ? tab : "channels";
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<ChannelAction | null>(null);
  const [confirmChannel, setConfirmChannel] = useState<ResolvedChannel | null>(null);
  const [selectedPodIndices, setSelectedPodIndices] = useState<number[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePodLoading, setDeletePodLoading] = useState(false);
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<ResolvedChannel | null>(null);

  const channelsQuery = useChannelsQuery();
  const configLayoutQuery = useConfigLayoutQuery();
  const mediaexcelChannelsQuery = useMediaexcelChannelsQuery();
  const [savingConfigId, setSavingConfigId] = useState<number | null>(null);
  const [channelFilter, setChannelFilter] = useState("");
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const actionMutation = useChannelAction();
  const addLinear = useAddLinear();
  const deleteLinearAction = useDeleteLinearAction();
  const deletePodReference = useDeletePodReference();
  const updateChannelConfig = useUpdateChannelConfig();
  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const mediaexcelChannels = useMemo(() => mediaexcelChannelsQuery.data ?? [], [mediaexcelChannelsQuery.data]);
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (!channelFilter.trim()) return true;
      return channel.name.toLowerCase().includes(channelFilter.toLowerCase());
    });
  }, [channels, channelFilter]);
  const linkedByPod = useMemo(() => {
    const map = new Map<string, string>();
    for (const pod of channels.flatMap((c) => c.pods)) {
      if (pod.linear?.linearName) map.set(pod.name, pod.linear.linearName);
    }
    return map;
  }, [channels]);
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
        channelId,
        name: data.linearName,
        pods: data.pods,
        tags: data.tags,
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
          title: "Clear Linears",
          description: `${succeeded} eliminado(s), ${failed} fallido(s).`,
          variant: failed === results.length ? "error" : undefined,
        });
      } else {
        notify({ title: "Clear Linears", description: `${succeeded} item(s) eliminado(s) de ${confirmChannel.name}.` });
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

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Live</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Real-time operational view for live broadcast workflows.
              </p>
            </div>
            {canPodActions && (
              <div className="flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 text-[13px] font-semibold dark:border-slate-300 dark:bg-[#24303F]">
                {(["channels", "pods"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    aria-pressed={activeTab === t}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors",
                      activeTab === t
                        ? "bg-brand-500 text-white"
                        : "text-[#64748B] hover:bg-[#F1F5F9] dark:text-[#8899A8] dark:hover:bg-[#333A48]"
                    )}
                  >
                    {t === "pods" ? <IconPod className="h-[13px] w-[13px]" /> : <Radio size={13} aria-hidden />}
                    {t === "channels" ? "Channels" : "Pods"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeTab === "pods" ? (
            mediaexcelChannelsQuery.isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Loading pods...
              </div>
            ) : (
              <PodCommands mediaexcelChannels={mediaexcelChannels} linkedByPod={linkedByPod} />
            )
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  placeholder="Filter channels..."
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                {canAdmin && <Button onClick={() => setCreateOpen(true)}>Create Channel</Button>}
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
                  linkedByPod={linkedByPod}
                  onCreateLinear={handleCreateLinearForChannel}
                  onDeleteLinear={handleDeleteLinearForChannel}
                  onDeletePod={handleDeletePodForChannel}
                />
              )}
            </>
          )}

        </div>

        {activeTab === "channels" && <BatchActionBar selected={selectedChannels} />}

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
          onDeleteFlowConfirm={executeDeleteFlow}
          loading={confirmAction?.id === "delete-flow" ? deletePodLoading : actionMutation.isPending}
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
