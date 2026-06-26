"use client";

import { useState } from "react";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { BaseVodContentDetail } from "@/components/vod/BaseVodContentDetail";
import { VodActionsPanel } from "@/components/vod/VodActionsPanel";
import { VodConfigPanel } from "@/components/vod/VodConfigPanel";
import { formatDuration, formatBitrate } from "@/lib/utils/media";
import type { VodContent } from "@/features/vod/vod-types";

const errorStatuses = new Set(["FAILED", "COPIED_ERROR", "ENCODING_ERROR", "RENDITION_ERROR", "MANIFEST_ERROR"]);

function statusTone(s: string): "success" | "error" | "warning" {
  if (s === "FINISHED") return "success";
  if (errorStatuses.has(s)) return "error";
  return "warning";
}

export function VodContentDetail({
  item,
  mam = "bitmovin",
  onUpdate,
}: {
  item: VodContent;
  mam?: "bitmovin" | "lightflow";
  onUpdate?: (values: { id: string; name: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);

  const video = item.input?.videos?.[0];
  const audio = item.input?.audios?.[0];
  const renditions = item.renditions ?? [];
  const subtitles = item.subtitles ?? [];

  const handleSave = () => {
    onUpdate?.({ id: item._id, name });
    setEditing(false);
  };

  const infoChildren = editing ? (
    <>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </>
  ) : (
    <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
      <div><span className="font-semibold">ID:</span> {item._id}</div>
      <div><span className="font-semibold">Name:</span> {item.name}</div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="font-semibold">Labels:</span>
        {item.labels.map((l) => <Badge key={l} label={l} tone="default" />)}
      </div>
    </div>
  );

  const statCells: [React.ReactNode, React.ReactNode, React.ReactNode] = [
    <div key="input" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Input</div>
      {video ? (
        <>
          <div className="mt-1 text-slate-700 dark:text-slate-200">
            {video.codec.toUpperCase()} · {video.width}×{video.height}
          </div>
          <div className="mt-1 text-slate-400">{formatDuration(video.duration)} · {video.fps} fps</div>
        </>
      ) : (
        <div className="mt-1 text-slate-400">Not available yet</div>
      )}
    </div>,
    <div key="renditions" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Renditions ({renditions.length})</div>
      <div className="mt-1 space-y-0.5">
        {renditions.length === 0 ? (
          <div className="text-slate-400">Not available yet</div>
        ) : (
          renditions.map((r, i) => {
            const vt = r.videoTracks[0];
            return (
              <div key={i} className="flex justify-between text-slate-700 dark:text-slate-200">
                <span>{vt?.frameWidth}×{vt?.frameHeight}</span>
                <span className="text-slate-400">{vt ? formatBitrate(vt.bitRate) : "—"}</span>
              </div>
            );
          })
        )}
      </div>
    </div>,
    <div key="audio" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">Audio &amp; Subtitles</div>
      {audio ? (
        <div className="mt-1 text-slate-700 dark:text-slate-200">
          {audio.codec.toUpperCase()} · {(audio.sampleRate / 1000).toFixed(0)} kHz · {audio.channelFormat}ch
        </div>
      ) : (
        <div className="mt-1 text-slate-400">Not available yet</div>
      )}
      {subtitles.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {subtitles.map((s) => (
            <Badge key={s.lang} label={s.lang.toUpperCase()} tone="default" />
          ))}
        </div>
      ) : audio ? (
        <div className="mt-1 text-slate-400">No subtitles</div>
      ) : null}
    </div>,
  ];

  return (
    <BaseVodContentDetail
      actionsPanel={<VodActionsPanel mam={mam} uuid={item._id} contentName={item.name} />}
      configPanel={<VodConfigPanel />}
      infoChildren={infoChildren}
      editControls={
        onUpdate && (
          <Button variant="secondary" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        )
      }
      statusBadge={<Badge label={`Overall: ${item.status}`} tone={statusTone(item.status)} />}
      statCells={statCells}
      contentId={item._id}
      encoder={
        item.labels.includes("bitmovin") ? "bitmovin"
        : item.labels.includes("lightflow") ? "lightflow"
        : undefined
      }
      rawDataSection={
        <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100 select-none">
            Metadata
          </summary>
          <div className="mt-3">
            <JsonViewer data={item} />
          </div>
        </details>
      }
    />
  );
}
