"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Target = { name: string; id: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "block" | "unblock";
  targets: Target[];
  onConfirm: () => void;
  isSubmitting?: boolean;
};

export function BlockVodModal({ open, onClose, mode, targets, onConfirm, isSubmitting }: Props) {
  const isBulk = targets.length > 1;
  const title = mode === "block"
    ? isBulk ? `Block ${targets.length} VODs` : "Block VOD"
    : isBulk ? `Unblock ${targets.length} VODs` : "Unblock VOD";

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {isBulk ? (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            {targets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-2 last:border-0 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</div>
                  <div className="font-mono text-xs text-slate-400">{t.id}</div>
                </div>
              </div>
            ))}
          </div>
        ) : targets[0] ? (
          <p>
            Are you sure you want to {mode}{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{targets[0].name}</span>?
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {mode === "block" ? (
            <Button variant="danger" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Blocking…" : isBulk ? `Block ${targets.length} VODs` : "Block VOD"}
            </Button>
          ) : (
            <Button variant="primary" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Unblocking…" : isBulk ? `Unblock ${targets.length} VODs` : "Unblock VOD"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
