"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function DeleteFastChannelModal({
  open,
  onClose,
  channelName,
  onDelete,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  channelName: string;
  onDelete: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Fast Channel" size="md">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p>
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{channelName}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="danger" onClick={onDelete} disabled={isSubmitting}>
            {isSubmitting ? "Deleting…" : "Delete Channel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
