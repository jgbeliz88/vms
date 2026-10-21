"use client";

import type { ReactNode } from "react";
import { VodPlaybackPanel } from "@/components/vod/VodPlaybackPanel";

type Props = {
  actionsPanel?: ReactNode;
  configPanel?: ReactNode;
  infoChildren: ReactNode;
  editControls?: ReactNode;
  statusBadge: ReactNode;
  statCells: [ReactNode, ReactNode, ReactNode];
  contentId: string;
  encoder?: "bitmovin" | "lightflow";
  rawDataSection: ReactNode;
};

export function BaseVodContentDetail({
  actionsPanel,
  configPanel,
  infoChildren,
  editControls,
  statusBadge,
  statCells,
  contentId,
  encoder,
  rawDataSection,
}: Props) {
  return (
    <div className="space-y-4">
      {actionsPanel}

      {configPanel}

      {/* Content Information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Content Information
          </div>
          {editControls}
        </div>
        <div className="mt-3">{infoChildren}</div>
      </div>

      {/* Processing Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status</div>
          {statusBadge}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {statCells[0]}
          {statCells[1]}
          {statCells[2]}
        </div>
      </div>

      {/* Playback */}
      <VodPlaybackPanel contentId={contentId} encoder={encoder} />

      {/* Raw data */}
      {rawDataSection}
    </div>
  );
}
