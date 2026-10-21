"use client";

import { Fragment, useRef, useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ColumnDef<T> = {
  header: string;
  render: (item: T) => ReactNode;
  sortKey?: string;
  filterKey?: string;
  filterType?: "text" | "select" | "date";
  filterOptions?: string[];
};

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  encoderLabel: string;
  encoderTone: "purple" | "warning";
  columns: ColumnDef<T>[];
  renderDetail: (item: T) => ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
  onFilterChange: (key: string, value: string) => void;
  onSortChange?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string | null;
  sortDir?: "asc" | "desc";
};

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-600";

function HeaderCheckbox({
  state,
  onToggle,
}: {
  state: "none" | "some" | "all";
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={onToggle}
      aria-label="Select all"
      className="h-4 w-4 rounded border-slate-300 accent-brand-500 dark:border-slate-600"
    />
  );
}

export function BaseVodTable<T>({
  items,
  getKey,
  encoderLabel,
  encoderTone,
  columns,
  renderDetail,
  selectable,
  selected,
  onSelectionChange,
  onFilterChange,
  onSortChange,
  sortKey,
  sortDir = "asc",
}: Props<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});
  // Pending text-input changes awaiting debounce
  const [pendingText, setPendingText] = useState<Record<string, string>>({});

  // Debounce text filter callbacks
  useEffect(() => {
    if (Object.keys(pendingText).length === 0) return;
    const timer = setTimeout(() => {
      Object.entries(pendingText).forEach(([key, value]) => onFilterChange(key, value));
      setPendingText({});
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingText, onFilterChange]);

  const handleTextInput = (key: string, value: string) => {
    setLocalInputs((prev) => ({ ...prev, [key]: value }));
    setPendingText((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectInput = (key: string, value: string) => {
    setLocalInputs((prev) => ({ ...prev, [key]: value }));
    onFilterChange(key, value);
  };

  const handleDateInput = (key: string, value: string) => {
    setLocalInputs((prev) => ({ ...prev, [key]: value }));
    onFilterChange(key, value);
  };

  const clearFilters = () => {
    setLocalInputs({});
    setPendingText({});
    columns.filter((c) => c.filterKey).forEach((c) => onFilterChange(c.filterKey!, ""));
  };

  const handleSortClick = (key: string) => {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    onSortChange?.(key, newDir);
  };

  const hasFilters = Object.values(localInputs).some(Boolean);
  const colSpan = columns.length + 1 + (selectable ? 1 : 0);

  const allKeys = items.map((item) => getKey(item));
  const selectedCount = selectable && selected ? allKeys.filter((k) => selected.has(k)).length : 0;
  const headerCheckState: "none" | "some" | "all" =
    selectedCount === 0 ? "none" : selectedCount === allKeys.length ? "all" : "some";

  const toggleAll = () => {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    if (headerCheckState === "all") {
      allKeys.forEach((k) => next.delete(k));
    } else {
      allKeys.forEach((k) => next.add(k));
    }
    onSelectionChange(next);
  };

  const toggleOne = (key: string) => {
    if (!onSelectionChange || !selected) return;
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge label={encoderLabel} tone={encoderTone} />
          <span className="text-xs text-slate-500">
            {items.length} result{items.length !== 1 ? "s" : ""}
          </span>
          {selectable && selected && selected.size > 0 && (
            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
              · {selected.size} selected
            </span>
          )}
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
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <HeaderCheckbox state={headerCheckState} onToggle={toggleAll} />
                  </th>
                )}
                {columns.map((col) =>
                  col.sortKey ? (
                    <th
                      key={col.header}
                      className="cursor-pointer select-none px-4 py-3 hover:text-slate-700 dark:hover:text-slate-300"
                      onClick={() => handleSortClick(col.sortKey!)}
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
                {selectable && <th className="px-4 py-2" />}
                {columns.map((col) => (
                  <th key={col.header} className="px-4 py-2">
                    {col.filterKey && col.filterType === "select" ? (
                      <select
                        className={inputCls}
                        value={localInputs[col.filterKey] ?? ""}
                        onChange={(e) => handleSelectInput(col.filterKey!, e.target.value)}
                      >
                        {(col.filterOptions ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt === "" ? "All" : opt}
                          </option>
                        ))}
                      </select>
                    ) : col.filterKey && col.filterType === "date" ? (
                      <input
                        type="date"
                        className={inputCls}
                        value={localInputs[col.filterKey] ?? ""}
                        onChange={(e) => handleDateInput(col.filterKey!, e.target.value)}
                      />
                    ) : col.filterKey ? (
                      <input
                        className={inputCls}
                        placeholder="Filter…"
                        value={localInputs[col.filterKey] ?? ""}
                        onChange={(e) => handleTextInput(col.filterKey!, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-6 text-center text-xs text-slate-400">
                    No results match the current filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const key = getKey(item);
                  const isExpanded = expandedId === key;
                  const isSelected = selectable && selected ? selected.has(key) : false;
                  return (
                    <Fragment key={key}>
                      <tr className={
                        isSelected
                          ? "bg-brand-50/40 dark:bg-brand-900/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }>
                        {selectable && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(key)}
                              aria-label={`Select item ${key}`}
                              className="h-4 w-4 rounded border-slate-300 accent-brand-500 dark:border-slate-600"
                            />
                          </td>
                        )}
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
