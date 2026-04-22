"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { FastChannelTable } from "@/components/fast-channels/FastChannelTable";
import { CreateFastChannelPanel } from "@/components/fast-channels/CreateFastChannelPanel";
import { DeleteFastChannelModal } from "@/components/fast-channels/DeleteFastChannelModal";
import { CreateTransitionPanel } from "@/components/fast-channels/CreateTransitionPanel";
import {
  useFastChannelsQuery,
  useCreateFastChannel,
  useDeleteFastChannel,
  useCreateFastChannelTransition
} from "@/features/fast-channels/hooks";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function FastChannelsPage() {
  const { notify } = useToast();
  const { data: channels, isLoading, isError } = useFastChannelsQuery();
  const createChannel = useCreateFastChannel();
  const deleteChannel = useDeleteFastChannel();
  const createTransition = useCreateFastChannelTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");
  const [transitionTarget, setTransitionTarget] = useState("");

  const handleCreate = async (values: { name: string; uri: string }) => {
    try {
      await createChannel.mutateAsync(values);
      notify({ title: "Channel created", description: `${values.name} added.` });
      setCreateOpen(false);
    } catch (error) {
      notify({ title: "Create failed", description: error instanceof Error ? error.message : "Unable to create channel", variant: "error" });
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await deleteChannel.mutateAsync(name);
      notify({ title: "Channel deleted", description: `${name} removed.` });
      setDeleteOpen(false);
    } catch (error) {
      notify({ title: "Delete failed", description: error instanceof Error ? error.message : "Unable to delete channel", variant: "error" });
    }
  };

  const handleCreateTransition = async (values: { channel: string; type: string; duration: number; description: string }) => {
    try {
      await createTransition.mutateAsync(values);
      notify({ title: "Transition created", description: `${values.type} transition scheduled for ${values.channel}.` });
      setTransitionOpen(false);
    } catch (error) {
      notify({ title: "Transition failed", description: error instanceof Error ? error.message : "Unable to create transition", variant: "error" });
    }
  };

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">FastChannels</h1>
              {channels && (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {channels.length} total channels
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setCreateOpen(true)}>Create Channel</Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-sm text-slate-500">Loading channels…</div>
          )}

          {isError && (
            <div className="text-sm text-rose-500">Failed to load channels.</div>
          )}

          {channels && (
            <FastChannelTable
              channels={channels}
              onDelete={(name) => { setDeleteTarget(name); setDeleteOpen(true); }}
              onCreateTransition={(name) => { setTransitionTarget(name); setTransitionOpen(true); }}
            />
          )}
        </div>

        <CreateFastChannelPanel
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />

        <DeleteFastChannelModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          channels={channels ?? []}
          onDelete={handleDelete}
          defaultChannel={deleteTarget}
        />

        <CreateTransitionPanel
          open={transitionOpen}
          onClose={() => setTransitionOpen(false)}
          channels={channels ?? []}
          onCreate={handleCreateTransition}
          defaultChannel={transitionTarget}
        />
      </AppShell>
    </AuthGuard>
  );
}
