"use client";

import { Badge } from "@/components/ui/Badge";
import { VodContentDetail } from "@/components/vod/VodContentDetail";
import { BaseVodTable } from "@/components/vod/BaseVodTable";
import { formatDate } from "@/lib/utils/date";
import type { VodContent } from "@/features/vod/vod-types";

type EncoderKey = "bitmovin" | "lightflow";

type Props = {
  items: VodContent[];
  encoder: EncoderKey;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onFilterChange: (key: string, value: string) => void;
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
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

export function VodTable({ items, encoder, selectable, selected, onSelectionChange, onFilterChange, onSortChange, sortKey, sortDir }: Props) {
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
      header: "Name",
      filterKey: "name",
      filterType: "text" as const,
      render: (item: VodContent) => (
        <span className="max-w-[200px] truncate text-xs text-slate-600 dark:text-slate-300 block">{item.name}</span>
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
    {
      header: "Started At",
      sortKey: "startedAt",
      filterKey: "createdAtNewerThan",
      filterType: "date" as const,
      render: (item: VodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.startedAt)}</span>
      ),
    },
    {
      header: "Finished At",
      sortKey: "finishedAt",
      filterKey: "createdAtOlderThan",
      filterType: "date" as const,
      render: (item: VodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.finishedAt)}</span>
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
      renderDetail={(item) => <VodContentDetail item={item} mam={encoder} />}
      selectable={selectable}
      selected={selected}
      onSelectionChange={onSelectionChange}
      onFilterChange={onFilterChange}
      onSortChange={onSortChange}
      sortKey={sortKey}
      sortDir={sortDir}
    />
  );
}
