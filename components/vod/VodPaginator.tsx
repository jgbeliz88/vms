"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatCount } from "@/lib/utils/number";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

const cellBase = "flex h-[30px] min-w-8 items-center justify-center bg-white text-xs dark:bg-slate-900";
const cellDefault =
  "px-2.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";
const cellActive =
  "px-2.5 font-bold text-brand-600 bg-brand-50 shadow-[inset_0_-2px_0_theme(colors.brand.500)] dark:bg-brand-900/40 dark:text-brand-300 dark:shadow-[inset_0_-2px_0_theme(colors.brand.400)]";
const cellGap = "px-2 font-medium text-slate-400 dark:text-slate-500";
const navDefault = "px-2 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";
const navDisabled = "px-2 text-slate-300 cursor-not-allowed dark:text-slate-600";

const controlBase =
  "h-8 rounded-lg border bg-white text-xs dark:bg-slate-900";
const goDefault =
  "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";
const goDisabled = "border-slate-200 text-slate-300 cursor-not-allowed dark:border-slate-700 dark:text-slate-600";

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

// Always at most 7 slots so the control keeps its width while paging.
function pageSequence(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", pages];
  if (page >= pages - 3) return [1, "gap", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "gap", page - 1, page, page + 1, "gap", pages];
}

export function VodPaginator({ page: rawPage, pageSize, total, onChange }: Props) {
  const inputId = useId();
  const [jump, setJump] = useState("");

  const pages = getPageCount(total, pageSize);
  const page = Math.min(Math.max(1, rawPage), pages);
  const atStart = page <= 1;
  const atEnd = page >= pages;

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), pages);
    if (next !== page) onChange(next);
  };

  const jumpNum = parseInt(jump, 10);
  const jumpEmpty = jump === "";
  const jumpInvalid = !jumpEmpty && (jumpNum < 1 || jumpNum > pages);
  const jumpDisabled = jumpEmpty || jumpInvalid;

  const submitJump = () => {
    if (jumpDisabled) return;
    go(jumpNum);
    setJump("");
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const navButton = (label: string, target: number, disabled: boolean, icon: ReactNode) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => go(target)}
      aria-label={label}
      className={`${cellBase} ${disabled ? navDisabled : navDefault}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="min-w-[110px] text-xs text-slate-500 dark:text-slate-400">
        {total > 0 ? (
          <>
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {formatCount(from)}–{formatCount(to)}
            </span>{" "}
            of <span className="font-bold text-slate-700 dark:text-slate-200">{formatCount(total)}</span> results
          </>
        ) : (
          "No results"
        )}
      </div>

      <div className="inline-flex gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
        {navButton("First page", 1, atStart, <ChevronsLeft size={16} />)}
        {navButton("Previous page", page - 1, atStart, <ChevronLeft size={16} />)}
        {pageSequence(page, pages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true" className={`${cellBase} ${cellGap}`}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`${cellBase} ${p === page ? cellActive : cellDefault}`}
            >
              {formatCount(p)}
            </button>
          )
        )}
        {navButton("Next page", page + 1, atEnd, <ChevronRight size={16} />)}
        {navButton("Last page", pages, atEnd, <ChevronsRight size={16} />)}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <label htmlFor={inputId}>Go to page</label>
        <input
          id={inputId}
          inputMode="numeric"
          value={jump}
          onChange={(e) => setJump(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitJump();
          }}
          placeholder={formatCount(page)}
          disabled={pages <= 1}
          aria-invalid={jumpInvalid}
          className={`${controlBase} w-16 px-2 text-center text-slate-700 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:placeholder-slate-500 ${
            jumpInvalid ? "border-rose-500 dark:border-rose-500" : "border-slate-200 dark:border-slate-700"
          }`}
        />
        <span>of {formatCount(pages)}</span>
        <button
          type="button"
          onClick={submitJump}
          disabled={jumpDisabled}
          className={`${controlBase} px-3 font-medium ${jumpDisabled ? goDisabled : goDefault}`}
        >
          Go
        </button>
      </div>
    </div>
  );
}
