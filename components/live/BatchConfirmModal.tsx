"use client";

import { BatchAction, ResolvedChannel } from "@/features/live/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function BatchConfirmModal({
  open,
  onClose,
  action,
  channels,
  onConfirm,
  loading
}: {
  open: boolean;
  onClose: () => void;
  action: BatchAction | null;
  channels: ResolvedChannel[];
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!action) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Batch: ${action.label}`} size="md">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p>{action.description}</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          Impact preview: {channels.length} channels will be affected.
        </div>
        <div className="max-h-32 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
          {channels.map((channel) => (
            <div key={channel.id} className="flex justify-between py-1">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{channel.name}</span>
              <span className="text-slate-500">{channel.id}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Running..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
