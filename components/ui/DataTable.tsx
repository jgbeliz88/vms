"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useColumnResize } from "./useColumnResize";

type SortDir = "asc" | "desc";

export type ColumnDef<T> = {
  key: string;
  header: string;
  defaultWidth?: number;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFn: (row: T, query: string) => boolean;
  className?: string;
};

export function DataTable<T,>({
  columns,
  data,
  getRowKey,
  searchable,
  searchPlaceholder = "Search…",
  searchFn,
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { tableRef, getColStyle, getTableStyle, startResize } = useColumnResize(
    columns.map((c) => ({ key: c.key, defaultWidth: c.defaultWidth ?? 150 }))
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered =
    searchable && query.trim()
      ? data.filter((row) => searchFn(row, query))
      : data;

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey);
        const aVal = col?.sortValue ? col.sortValue(a) : "";
        const bVal = col?.sortValue ? col.sortValue(b) : "";
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  return (
    <div className={className}>
      {searchable && (
        <div className="border-b border-[#E2E8F0] px-4 py-3 dark:border-[#2E3A47]">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899A8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-[#E2E8F0] bg-[#F1F5F9] py-1.5 pl-9 pr-3 text-sm text-[#1C2434] placeholder:text-[#8899A8] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2E3A47] dark:bg-[#1A222C] dark:text-[#DEE4EE]"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="text-xs" style={getTableStyle()}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={getColStyle(col.key)} />
            ))}
          </colgroup>
          <thead className="border-b border-[#E2E8F0] bg-[#F7F9FC] text-[10px] uppercase tracking-wide text-[#64748B] dark:border-[#2E3A47] dark:bg-[#1A222C]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="relative select-none px-4 py-3 text-left font-semibold"
                  style={getColStyle(col.key)}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-[#1C2434] dark:hover:text-white"
                    >
                      {col.header}
                      <span className="text-[#E2E8F0] dark:text-[#2E3A47]">
                        {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                  <div
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-brand-500/30"
                    onMouseDown={(e) => startResize(col.key, e)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E3A47]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-[#8899A8]">
                  No results
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={getRowKey(row)} className="text-[#1C2434] hover:bg-[#F7F9FC] dark:text-[#DEE4EE] dark:hover:bg-[#333A48]/40">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2.5"
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
