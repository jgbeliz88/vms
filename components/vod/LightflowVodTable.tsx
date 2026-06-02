"use client";

import { Badge } from "@/components/ui/Badge";
import { LightflowVodContentDetail } from "@/components/vod/LightflowVodContentDetail";
import { BaseVodTable } from "@/components/vod/BaseVodTable";
import { formatDate } from "@/lib/utils/date";
import type { LightflowVodContent } from "@/features/vod/lightflow-types";

const STATUS_OPTIONS = ["", "finished", "running", "error", "failed"];

const statusTone = (s: string): "success" | "error" | "warning" => {
  if (s === "finished") return "success";
  if (s === "error" || s === "failed") return "error";
  return "warning";
};

export function LightflowVodTable({
  items,
  selectable,
  selected,
  onSelectionChange,
  onFilterChange,
  onSortChange,
  sortKey,
  sortDir,
}: {
  items: LightflowVodContent[];
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onFilterChange: (key: string, value: string) => void;
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
}) {
  const columns = [
    {
      header: "ID",
      filterKey: "id",
      filterType: "text" as const,
      render: (item: LightflowVodContent) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{item.uuid}</span>
      ),
    },
    {
      header: "Status",
      filterKey: "status",
      filterType: "select" as const,
      filterOptions: STATUS_OPTIONS,
      render: (item: LightflowVodContent) => (
        <Badge label={item.status} tone={statusTone(item.status)} />
      ),
    },
    {
      header: "Start Date",
      sortKey: "startDate",
      filterKey: "createdAtNewerThan",
      filterType: "date" as const,
      render: (item: LightflowVodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.startDate)}</span>
      ),
    },
    {
      header: "End Date",
      sortKey: "endDate",
      filterKey: "createdAtOlderThan",
      filterType: "date" as const,
      render: (item: LightflowVodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.endDate)}</span>
      ),
    },
  ];

  return (
    <BaseVodTable
      items={items}
      getKey={(item) => item.uuid}
      encoderLabel="Lightflow"
      encoderTone="warning"
      columns={columns}
      renderDetail={(item) => <LightflowVodContentDetail item={item} />}
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
