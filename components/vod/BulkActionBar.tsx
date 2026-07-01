"use client";

import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

type Props = {
  count: number;
  onBlock: () => void;
  onUnblock: () => void;
  onManifest: () => void;
  onClear: () => void;
};

export function BulkActionBar({ count, onBlock, onUnblock, onManifest, onClear }: Props) {
  const canAdmin = usePermission([PERMISSIONS.VOD_ACTIONS]);
  if (!canAdmin || count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {count}
        </span>
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {count} VOD{count === 1 ? "" : "s"} selected
        </span>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <button
        onClick={onBlock}
        className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/40 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
      >
        Block
      </button>

      <button
        onClick={onUnblock}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700/40 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        Unblock
      </button>

      <button
        onClick={onManifest}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
      >
        Create Manifest
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <button
        onClick={onClear}
        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        Clear
      </button>
    </div>
  );
}
