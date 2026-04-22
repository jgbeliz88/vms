"use client";

import { Badge } from "@/components/ui/Badge";
import { VodContentDetail } from "@/components/vod/VodContentDetail";
import { BaseVodTable } from "@/components/vod/BaseVodTable";
import { formatDate } from "@/lib/utils/date";

type VodContent = {
  _id: string;
  name: string;
  status: string;
  labels: string[];
  startedAt: string;
  finishedAt: string;
  input: {
    videos: { duration: number; codec: string; fps: string; bitrate: string; width: number; height: number }[];
    audios: { codec: string; sampleRate: number; bitrate: string; channelFormat: string; language: string }[];
  };
  renditions: { filename: string; videoTracks: { frameWidth: number; frameHeight: number; bitRate: number }[] }[];
  subtitles: { lang: string; url: string }[];
};

type EncoderKey = "bitmovin" | "lightflow";

type Props = {
  items: VodContent[];
  encoder: EncoderKey;
};

const encoderTone: Record<EncoderKey, "purple" | "warning"> = {
  bitmovin: "purple",
  lightflow: "warning",
};

const encoderLabel: Record<EncoderKey, string> = {
  bitmovin: "Bitmovin",
  lightflow: "Lightflow",
};

const STATUS_OPTIONS = [
  "",
  "FINISHED",
  "ENCODING",
  "FAILED",
  "COPIED_ERROR",
  "ENCODING_ERROR",
  "RENDITION_ERROR",
  "MANIFEST_ERROR",
];

const ERROR_STATUSES = new Set(["FAILED", "COPIED_ERROR", "ENCODING_ERROR", "RENDITION_ERROR", "MANIFEST_ERROR"]);

export function VodTable({ items, encoder }: Props) {
  const columns = [
    {
      header: "ID",
      filterKey: "id",
      filterType: "text" as const,
      render: (item: VodContent) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{item._id}</span>
      ),
    },
    {
      header: "Status",
      filterKey: "status",
      filterType: "select" as const,
      filterOptions: STATUS_OPTIONS,
      render: (item: VodContent) => (
        <Badge
          label={item.status}
          tone={
            item.status === "FINISHED" ? "success"
            : ERROR_STATUSES.has(item.status) ? "error"
            : "warning"
          }
        />
      ),
    },
    {
      header: "Encoder",
      render: () => <Badge label={encoderLabel[encoder]} tone={encoderTone[encoder]} />,
    },
    {
      header: "Started At",
      filterKey: "startedAt",
      filterType: "text" as const,
      sortKey: "startedAt",
      render: (item: VodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.startedAt)}</span>
      ),
    },
    {
      header: "Finished At",
      filterKey: "finishedAt",
      filterType: "text" as const,
      sortKey: "finishedAt",
      render: (item: VodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.finishedAt)}</span>
      ),
    },
    {
      header: "Labels",
      filterKey: "labels",
      filterType: "text" as const,
      render: (item: VodContent) => (
        <div className="flex flex-wrap gap-1">
          {item.labels.map((label) => (
            <Badge key={label} label={label} tone="default" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <BaseVodTable
      items={items}
      getKey={(item) => item._id}
      encoderLabel={encoderLabel[encoder]}
      encoderTone={encoderTone[encoder]}
      columns={columns}
      getFilterValue={(item, key) => {
        if (key === "id") return item._id;
        if (key === "status") return item.status;
        if (key === "labels") return item.labels.join(" ");
        if (key === "startedAt") return formatDate(item.startedAt);
        if (key === "finishedAt") return formatDate(item.finishedAt);
        return "";
      }}
      getSortValue={(item, key) => {
        if (key === "startedAt") return item.startedAt;
        if (key === "finishedAt") return item.finishedAt;
        return "";
      }}
      renderDetail={(item) => <VodContentDetail item={item} />}
    />
  );
}
