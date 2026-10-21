"use client";

import { CHANNEL_CONFIG_COLUMNS, type ResolvedChannel } from "@/features/live/types";
import { buildInitialRows } from "./ChannelConfigEditor";
import type { ConfigLayout } from "@/features/live/hooks";

export function ChannelConfigReadOnlyTable({
  channel,
  layout,
}: {
  channel: ResolvedChannel;
  layout: ConfigLayout;
}) {
  const rows = buildInitialRows(layout, channel);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-900">
          <tr>
            {CHANNEL_CONFIG_COLUMNS.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-3 py-2">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white dark:hover:bg-slate-800/40">
              {CHANNEL_CONFIG_COLUMNS.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300">
                  {row[col.key] || <span className="italic text-slate-400">N/A</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
