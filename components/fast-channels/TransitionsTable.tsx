"use client";

import { Badge } from "@/components/ui/Badge";
import type { FastChannelTransitions } from "@/features/fast-channels/types";

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "success") return "success" as const;
  if (s === "failed" || s === "error") return "error" as const;
  if (s === "running" || s === "pending") return "warning" as const;
  return "default" as const;
}

function formatKey(key: string): string {
  if (key === "creation") return "Creation";
  const date = new Date(key);
  if (!isNaN(date.getTime())) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const s = String(date.getUTCSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}:${s} UTC`;
  }
  return key;
}

function sortKey(key: string): number {
  if (key === "creation") return -Infinity;
  const d = new Date(key);
  return isNaN(d.getTime()) ? Infinity : d.getTime();
}

export function TransitionsTable({ transitions }: { transitions: FastChannelTransitions }) {
  const entries = Object.entries(transitions).sort(([a], [b]) => sortKey(a) - sortKey(b));

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950">
        No transitions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Nombre</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map(([key, status]) => (
            <tr key={key} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{formatKey(key)}</td>
              <td className="px-4 py-3">
                <Badge label={status} tone={statusTone(status)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
