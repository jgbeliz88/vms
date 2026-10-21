"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { HttpStatusPill } from "@/components/playback/HttpStatusPill";

type Tab = "ads" | "diag";

type Props = {
  /** Count shown next to the Ad Events tab, e.g. "3" or "2/5". */
  adCountLabel: string;
  /** HTTP statuses of the finished diagnostics runs, shown on the Diagnostics tab. */
  statuses: number[];
  adEvents: ReactNode;
  diagnostics: ReactNode;
  /** Tab selected on mount. */
  defaultTab?: Tab;
};

/**
 * Right-hand rail of the playback panel. On lg+ it is absolutely positioned
 * inside its grid cell so it takes the player column's height and scrolls
 * internally; below lg it stacks under the player with a capped height.
 */
export function DiagnosticsRail({ adCountLabel, statuses, adEvents, diagnostics, defaultTab = "ads" }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabClass = (active: boolean) =>
    cn(
      "flex items-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold transition-colors",
      active
        ? "text-slate-900 shadow-[inset_0_-2px_0_#3C50E0] dark:text-slate-100"
        : "text-[#64748B] hover:text-slate-700 dark:hover:text-slate-300"
    );

  return (
    <div className="relative lg:min-h-80">
      <div className="flex max-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:absolute lg:inset-0 lg:max-h-none dark:border-slate-700 dark:bg-slate-950">
        <div className="flex border-b border-slate-200 bg-white px-1.5 dark:border-slate-700 dark:bg-slate-900">
          <button onClick={() => setTab("ads")} className={tabClass(tab === "ads")}>
            Ad Events <span className="font-medium text-slate-400">({adCountLabel})</span>
          </button>
          <button onClick={() => setTab("diag")} className={tabClass(tab === "diag")}>
            Diagnostics
            {statuses.map((status, i) => (
              <HttpStatusPill key={i} status={status} />
            ))}
          </button>
        </div>
        {/* Both panes stay mounted so an opened manifest <details> survives a tab switch. */}
        <div className="min-h-0 flex-1 overflow-auto p-2.5">
          <div className={cn(tab !== "ads" && "hidden")}>{adEvents}</div>
          <div className={cn(tab !== "diag" && "hidden")}>{diagnostics}</div>
        </div>
      </div>
    </div>
  );
}
