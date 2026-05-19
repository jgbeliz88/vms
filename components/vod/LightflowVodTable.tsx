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
}: {
  items: LightflowVodContent[];
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
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
      filterKey: "startDate",
      filterType: "text" as const,
      sortKey: "startDate",
      render: (item: LightflowVodContent) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{formatDate(item.startDate)}</span>
      ),
    },
    {
      header: "End Date",
      filterKey: "endDate",
      filterType: "text" as const,
      sortKey: "endDate",
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
      getFilterValue={(item, key) => {
        if (key === "id") return item.uuid;
        if (key === "status") return item.status;
        if (key === "startDate") return formatDate(item.startDate);
        if (key === "endDate") return formatDate(item.endDate);
        return "";
      }}
      getSortValue={(item, key) => {
        if (key === "startDate") return item.startDate;
        if (key === "endDate") return item.endDate;
        return "";
      }}
      renderDetail={(item) => <LightflowVodContentDetail item={item} />}
      selectable={selectable}
      selected={selected}
      onSelectionChange={onSelectionChange}
    />
  );
}
