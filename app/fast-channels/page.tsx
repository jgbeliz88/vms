"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { FastChannelTable } from "@/components/fast-channels/FastChannelTable";
import { CreateFastChannelPanel } from "@/components/fast-channels/CreateFastChannelPanel";
import { DeleteFastChannelModal } from "@/components/fast-channels/DeleteFastChannelModal";
import {
  useFastChannelsQuery,
  useCreateFastChannel,
  useDeleteFastChannel,
} from "@/features/fast-channels/hooks";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default function FastChannelsPage() {
  const canAdmin = usePermission([PERMISSIONS.FC_MANAGE_CHANNELS]);
  const { notify } = useToast();
  const { data: channels, isLoading, isError } = useFastChannelsQuery();
  const createChannel = useCreateFastChannel();
  const deleteChannel = useDeleteFastChannel();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("");

  const handleCreate = async (values: { name: string; smil: string }) => {
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
              {canAdmin && <Button onClick={() => setCreateOpen(true)}>Create Channel</Button>}
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
            />
          )}
        </div>

        <CreateFastChannelPanel
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
          isSubmitting={createChannel.isPending}
        />

        <DeleteFastChannelModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          channelName={deleteTarget}
          onDelete={() => handleDelete(deleteTarget)}
          isSubmitting={deleteChannel.isPending}
        />
      </AppShell>
    </AuthGuard>
  );
}
