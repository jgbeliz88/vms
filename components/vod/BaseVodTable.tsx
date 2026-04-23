"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ColumnDef<T> = {
  header: string;
  render: (item: T) => ReactNode;
  sortKey?: string;
  filterKey?: string;
  filterType?: "text" | "select";
  filterOptions?: string[];
};

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  encoderLabel: string;
  encoderTone: "purple" | "warning";
  columns: ColumnDef<T>[];
  getFilterValue: (item: T, filterKey: string) => string;
  getSortValue: (item: T, sortKey: string) => string;
  renderDetail: (item: T) => ReactNode;
};

type SortDir = "asc" | "desc";

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-600";

export function BaseVodTable<T>({
  items,
  getKey,
  encoderLabel,
  encoderTone,
  columns,
  getFilterValue,
  getSortValue,
  renderDetail,
}: Props<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setExpandedId(null);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const clearFilters = () => {
    const empty = Object.fromEntries(
      columns.filter((c) => c.filterKey).map((c) => [c.filterKey!, ""])
    );
    setFilters(empty);
  };

  const filtered = items.filter((item) =>
    columns.every((col) => {
      if (!col.filterKey) return true;
      const filterVal = filters[col.filterKey] ?? "";
      if (!filterVal) return true;
      const itemVal = getFilterValue(item, col.filterKey).toLowerCase();
      if (col.filterType === "select") return itemVal === filterVal.toLowerCase();
      return itemVal.includes(filterVal.toLowerCase());
    })
  );

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const aVal = new Date(getSortValue(a, sortKey)).getTime();
        const bVal = new Date(getSortValue(b, sortKey)).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      })
    : filtered;

  const hasFilters = Object.values(filters).some(Boolean);
  const colSpan = columns.length + 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge label={encoderLabel} tone={encoderTone} />
          <span className="text-xs text-slate-500">
            {filtered.length} of {items.length} contents
          </span>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                {columns.map((col) =>
                  col.sortKey ? (
                    <th
                      key={col.header}
                      className="cursor-pointer select-none px-4 py-3 hover:text-slate-700 dark:hover:text-slate-300"
                      onClick={() => toggleSort(col.sortKey!)}
                    >
                      <span className="flex items-center gap-1">
                        {col.header}
                        <span className="text-[10px]">
                          {sortKey === col.sortKey ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </span>
                    </th>
                  ) : (
                    <th key={col.header} className="px-4 py-3">
                      {col.header}
                    </th>
                  )
                )}
                <th className="px-4 py-3"></th>
              </tr>
              {/* Filter row */}
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {columns.map((col) => (
                  <th key={col.header} className="px-4 py-2">
                    {col.filterKey && col.filterType === "select" ? (
                      <select
                        className={inputCls}
                        value={filters[col.filterKey] ?? ""}
                        onChange={(e) => setFilter(col.filterKey!, e.target.value)}
                      >
                        {(col.filterOptions ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt === "" ? "All" : opt}
                          </option>
                        ))}
                      </select>
                    ) : col.filterKey ? (
                      <input
                        className={inputCls}
                        placeholder="Filter…"
                        value={filters[col.filterKey] ?? ""}
                        onChange={(e) => setFilter(col.filterKey!, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-6 text-center text-xs text-slate-400">
                    No results match the current filters.
                  </td>
                </tr>
              ) : (
                sorted.map((item) => {
                  const key = getKey(item);
                  const isExpanded = expandedId === key;
                  return (
                    <Fragment key={key}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {columns.map((col) => (
                          <td key={col.header} className="px-4 py-3">
                            {col.render(item)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={isExpanded ? "primary" : "secondary"}
                            onClick={() => setExpandedId(isExpanded ? null : key)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={colSpan} className="bg-slate-50 px-4 py-4 dark:bg-slate-950">
                            {renderDetail(item)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
