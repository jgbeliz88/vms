"use client";

import { useState } from "react";
import type { Encoder } from "@/features/live/types";
import { EncoderConfigPanel } from "./EncoderConfigPanel";

export function EncoderConfigSection({
  encoders,
  onCreateEncoder,
  onDeleteEncoder,
  loading,
}: {
  encoders: Encoder[];
  onCreateEncoder: (data: { encoderChannel: string; heroName: string }) => void;
  onDeleteEncoder: (id: number) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Encoder Configuration
          </div>
          <div className="text-xs text-slate-500">
            {loading ? "Loading…" : `${encoders.length} encoder${encoders.length !== 1 ? "s" : ""} — manage pods and infrastructure`}
          </div>
        </div>
        <span className="text-xs text-slate-400">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          {loading ? (
            <div className="text-sm text-slate-500">Loading encoders…</div>
          ) : (
            <EncoderConfigPanel
              encoders={encoders}
              onCreateEncoder={onCreateEncoder}
              onDeleteEncoder={onDeleteEncoder}
            />
          )}
        </div>
      )}
    </div>
  );
}
