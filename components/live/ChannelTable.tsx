"use client";

import { Fragment, useState } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow, MediaexcelChannel } from "@/features/live/types";
import type { AddLinearData } from "./ActionConfirmModal";
import type { ResolvedPod } from "@/features/live/types";
import { StatusPill } from "./StatusPill";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ChannelDetail } from "./ChannelDetail";
import { deriveOverallStatus, deriveStatusParts } from "@/features/live/status";
import type { ConfigLayout } from "@/features/live/hooks";

const CELL = "px-4 py-3 flex items-center";
const HEADER_CELL = cn(CELL, "border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950");
const ROW_BORDER = "border-b border-slate-100 dark:border-slate-800";

export function ChannelTable({
  channels,
  actions,
  selectedIds,
  onToggle,
  onToggleAll,
  onAction,
  onAdAction,
  onDelete,
  configLayout,
  onSaveConfig,
  savingConfigId,
  mediaexcelChannels = [],
  linkedByPod,
  onCreateLinear,
  onDeleteLinear,
  onDeletePod,
}: {
  channels: ResolvedChannel[];
  actions: ChannelAction[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onAction: (channel: ResolvedChannel, action: ChannelAction) => void;
  onAdAction: (channelId: number, actionId: string) => void;
  onDelete: (channel: ResolvedChannel) => void;
  configLayout?: ConfigLayout;
  onSaveConfig?: (channelId: number, rows: ChannelConfigRow[]) => Promise<void>;
  savingConfigId?: number | null;
  mediaexcelChannels?: MediaexcelChannel[];
  linkedByPod: Map<string, string>;
  onCreateLinear?: (channelId: number, data: AddLinearData) => Promise<void>;
  onDeleteLinear?: (channelId: number, pod: ResolvedPod, linearName: string) => Promise<void>;
  onDeletePod?: (channelId: number, pod: ResolvedPod, linearName: string | null) => Promise<void>;
}) {
  const canAdmin = usePermission([PERMISSIONS.LIVE_MANAGE_CHANNELS]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const toggleDetails = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const allSelected = channels.length > 0 && selectedIds.length === channels.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        {/*
          All header cells and row cells live in one shared grid so CSS grid
          sizes every column (including the auto-width actions column) the same
          across header and rows. The col-span-7 detail panels use overflow-x-clip
          + min-w-0 so their content never expands the grid tracks.
        */}
        <div className="grid min-w-[640px] grid-cols-[2.5rem_1fr_10rem_10rem_7rem_8rem_auto]">

          {/* ── Header ── */}
          <div className={HEADER_CELL}>
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
          </div>
          <div className={HEADER_CELL}>Channel</div>
          <div className={HEADER_CELL}>Encoder</div>
          <div className={HEADER_CELL}>Pods</div>
          <div className={HEADER_CELL}>Status</div>
          <div className={HEADER_CELL}>Last Sync</div>
          <div className={HEADER_CELL} />

          {/* ── Rows ── */}
          {channels.map((channel) => {
            const isExpanded = expandedId === channel.id;
            const isSelected = selectedIds.includes(channel.id);
            const podTooltip = channel.pods.map((pod) => pod.name).join("\n");
            const parts = deriveStatusParts((channel.metadata as Record<string, unknown>)?.statusParts, channel.status);
            const overall = deriveOverallStatus(parts);

            const isHovered = hoveredId === channel.id;
            const hoverClass = isHovered ? "bg-slate-50 dark:bg-slate-800/40" : "";
            const rowEvents = {
              onMouseEnter: () => setHoveredId(channel.id),
              onMouseLeave: () => setHoveredId(null),
            };

            return (
              <Fragment key={channel.id}>
                {/* Row cells — 6 items, one per column */}
                <div className={cn(CELL, ROW_BORDER, hoverClass)} {...rowEvents}>
                  <input type="checkbox" checked={isSelected} onChange={() => onToggle(channel.id)} />
                </div>
                <div className={cn(CELL, ROW_BORDER, hoverClass)} {...rowEvents}>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{channel.name}</div>
                </div>
                <div className={cn(CELL, ROW_BORDER, hoverClass)} {...rowEvents}>
                  {(() => {
                    const names = [...new Set(channel.linears.flatMap((l) => l.pods.flatMap((p) => p.encoders.map((e) => e.name))))];
                    return names.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {names.map((name) => (
                          <div key={name} className="text-sm text-slate-700 dark:text-slate-200">
                            {name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    );
                  })()}
                </div>
                <div className={cn(CELL, ROW_BORDER, hoverClass)} title={podTooltip} {...rowEvents}>
                  {channel.pods.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {channel.pods.map((pod, i) => (
                        <div key={i} className="text-sm text-slate-700 dark:text-slate-200">
                          {pod.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div className={cn(CELL, ROW_BORDER, hoverClass)} {...rowEvents}>
                  <StatusPill status={overall} />
                </div>
                <div className={cn(CELL, ROW_BORDER, "text-xs text-slate-500", hoverClass)} {...rowEvents}>
                  {channel.lastSync}
                </div>
                <div className={cn(CELL, ROW_BORDER, hoverClass)} {...rowEvents}>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant={isExpanded ? "primary" : "secondary"} onClick={() => toggleDetails(channel.id)}>
                      Details
                    </Button>
                    {canAdmin && (
                      <Button
                        variant="danger"
                        onClick={() => onDelete(channel)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Detail panel — spans all 6 columns, sits outside the row grid cells
                    overflow-x-clip + min-w-0 prevent it from expanding grid tracks */}
                {isExpanded && (
                  <div className={cn("col-span-7 min-w-0 overflow-x-clip", ROW_BORDER, "bg-slate-50 px-4 py-4 dark:bg-slate-950")}>
                    <ChannelDetail
                      channel={channel}
                      actions={actions}
                      onAction={(action) => onAction(channel, action)}
                      onAdAction={onAdAction}
                      configLayout={configLayout}
                      onSaveConfig={onSaveConfig}
                      savingConfig={savingConfigId === channel.id}
                      mediaexcelChannels={mediaexcelChannels}
                      linkedByPod={linkedByPod}
                      onCreateLinear={onCreateLinear ? (data) => onCreateLinear(channel.id, data) : undefined}
                      onDeleteLinear={onDeleteLinear ? (pod, linearName) => onDeleteLinear(channel.id, pod, linearName) : undefined}
                      onDeletePod={onDeletePod ? (pod, linearName) => onDeletePod(channel.id, pod, linearName) : undefined}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
