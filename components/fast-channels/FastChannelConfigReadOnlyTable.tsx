"use client";

import {
  FAST_CHANNEL_CONFIG_COLUMNS,
  type FastChannelConfigRow,
} from "@/features/fast-channels/types";
import { buildInitialRows } from "./FastChannelConfigEditor";
import type { ConfigLayout } from "@/features/live/hooks";

export function FastChannelConfigReadOnlyTable({
  layout,
  config,
}: {
  layout: ConfigLayout;
  config: FastChannelConfigRow[];
}) {
  const rows = buildInitialRows(layout, config);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-900">
          <tr>
            {FAST_CHANNEL_CONFIG_COLUMNS.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-3 py-2">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white dark:hover:bg-slate-800/40">
              {FAST_CHANNEL_CONFIG_COLUMNS.map((col) => (
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
