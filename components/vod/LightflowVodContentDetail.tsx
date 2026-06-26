"use client";

import { useMemo } from "react";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Badge } from "@/components/ui/Badge";
import { BaseVodContentDetail } from "@/components/vod/BaseVodContentDetail";
import { VodActionsPanel } from "@/components/vod/VodActionsPanel";
import { VodConfigPanel } from "@/components/vod/VodConfigPanel";
import { formatDuration, formatBitrate } from "@/lib/utils/media";
import type { LightflowVodContent } from "@/features/vod/lightflow-types";

const STATUS_TONE = (s: string): "success" | "error" | "warning" => {
  if (s === "finished") return "success";
  if (s === "error" || s === "failed") return "error";
  return "warning";
};

export function LightflowVodContentDetail({ item }: { item: LightflowVodContent }) {
  const video = item.assetInfo.streams.find((s) => s.codec_type === "video");
  const audio = item.assetInfo.streams.find((s) => s.codec_type === "audio");
  const renditions = item.ladderFull?.x264 ?? [];
  const durationSec = parseFloat(item.assetInfo.format.duration);

  const assetMetadata = useMemo(
    () => ({ streams: item.assetInfo.streams, format: item.assetInfo.format }),
    [item.assetInfo]
  );

  const infoChildren = (
    <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
      <div><span className="font-semibold">ID:</span> {item._id}</div>
      <div><span className="font-semibold">UUID:</span> {item.uuid}</div>
      <div className="mt-1">
        <JsonViewer data={assetMetadata} />
      </div>
    </div>
  );

  const statCells: [React.ReactNode, React.ReactNode, React.ReactNode] = [
    <div key="input" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Input</div>
      {video ? (
        <>
          <div className="mt-1 text-slate-700 dark:text-slate-200">
            {video.codec_name.toUpperCase()} · {video.width}×{video.height}
          </div>
          <div className="mt-1 text-slate-400">
            {formatDuration(durationSec)} · {formatBitrate(video.bit_rate)}
          </div>
        </>
      ) : (
        <div className="mt-1 text-slate-400">—</div>
      )}
    </div>,
    <div key="ladder" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Encoding Ladder ({renditions.length})</div>
      <div className="mt-1 space-y-0.5">
        {renditions.length === 0 ? (
          <div className="text-slate-400">—</div>
        ) : (
          renditions.map((r, i) => (
            <div key={`${r.resolution}-${r.bitrate}-${i}`} className="flex justify-between text-slate-700 dark:text-slate-200">
              <span>{r.resolution}p</span>
              <span className="text-slate-400">{r.bitrate} kbps</span>
            </div>
          ))
        )}
      </div>
    </div>,
    <div key="audio" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Audio</div>
      {audio ? (
        <div className="mt-1 text-slate-700 dark:text-slate-200">
          {audio.codec_name.toUpperCase()} · {formatBitrate(audio.bit_rate)}
        </div>
      ) : (
        <div className="mt-1 text-slate-400">—</div>
      )}
      {item.error && (
        <div className="mt-2 text-rose-500">Error: {item.error}</div>
      )}
    </div>,
  ];

  return (
    <BaseVodContentDetail
      actionsPanel={<VodActionsPanel mam="lightflow" uuid={item.uuid} contentName={item._id} />}
      configPanel={<VodConfigPanel />}
      infoChildren={infoChildren}
      statusBadge={<Badge label={item.status} tone={STATUS_TONE(item.status)} />}
      statCells={statCells}
      contentId={item.uuid}
      encoder="lightflow"
      rawDataSection={
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Raw Data</div>
          <div className="mt-3">
            <JsonViewer data={item} />
          </div>
        </div>
      }
    />
  );
}
