"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useRecreateFastChannel } from "@/features/fast-channels/hooks";

export function RecreateChannelModal({
  open,
  onClose,
  channelName,
  queuedCount,
  onRecreated,
}: {
  open: boolean;
  onClose: () => void;
  channelName: string;
  queuedCount: number;
  onRecreated: () => void;
}) {
  const { notify } = useToast();
  const recreate = useRecreateFastChannel();
  const [confirmText, setConfirmText] = useState("");

  const canConfirm = confirmText.trim() === channelName && !recreate.isPending;

  const close = () => {
    if (recreate.isPending) return;
    setConfirmText("");
    onClose();
  };

  const handleRecreate = async () => {
    if (!canConfirm) return;
    try {
      await recreate.mutateAsync(channelName);
      notify({
        title: "Channel recreated",
        description: `${channelName} was rebuilt and its transitions re-queued as cron jobs.`,
        variant: "success",
      });
      setConfirmText("");
      onRecreated();
      onClose();
    } catch (error) {
      notify({
        title: "Recreate failed",
        description: error instanceof Error ? error.message : "Unable to recreate the channel",
        variant: "error",
      });
    }
  };

  return (
    <Modal open={open} onClose={close} title="Recreate Fast Channel" size="md">
      <div className="flex flex-col gap-4 text-sm text-text-secondary">
        <p>
          This deletes <span className="font-semibold text-text-primary dark:text-slate-100">{channelName}</span> and
          creates it again, then re-queues its{" "}
          {queuedCount > 0 ? `${queuedCount} existing transitions` : "existing transitions"} as cron
          jobs. Playback is interrupted while it rebuilds.
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-text-muted">
            Type the channel name to confirm
          </span>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRecreate();
            }}
            placeholder={channelName}
            disabled={recreate.isPending}
            spellCheck={false}
            className="w-full rounded-md border border-border-base bg-white px-3.5 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-muted transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={recreate.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRecreate} disabled={!canConfirm}>
            {recreate.isPending ? "Recreating…" : "Recreate Channel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
