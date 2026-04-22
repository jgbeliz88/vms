"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { FastChannel } from "@/features/fast-channels/types";

export function DeleteFastChannelModal({
  open,
  onClose,
  channels,
  onDelete,
  defaultChannel
}: {
  open: boolean;
  onClose: () => void;
  channels: FastChannel[];
  onDelete: (name: string) => void;
  defaultChannel?: string;
}) {
  const [selected, setSelected] = useState(defaultChannel ?? "");

  useEffect(() => {
    if (open) setSelected(defaultChannel ?? "");
  }, [open, defaultChannel]);

  const options = channels.map((ch) => ({ label: ch.name, value: ch.name }));

  const handleConfirm = () => {
    if (!selected) return;
    onDelete(selected);
    setSelected("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Fast Channel" size="md">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <p>Select the channel you want to delete. This action cannot be undone.</p>
        <Select
          label="Channel"
          options={[{ label: "— Select a channel —", value: "" }, ...options]}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        />
        {selected && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-200">
            You are about to permanently delete <span className="font-semibold">{selected}</span>.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!selected}>
            Delete Channel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
