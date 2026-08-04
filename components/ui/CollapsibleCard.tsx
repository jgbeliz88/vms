"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A detail-view card whose body collapses behind a clickable header. Closed by
 * default. The body is hidden with `display:none` rather than unmounted, so
 * stateful children (config editors seeded once from props) keep unsaved edits
 * across a collapse/expand.
 */
export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full select-none items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open ? "rotate-0" : "-rotate-90")}
          aria-hidden
        >
          <polyline points="5,6 8,9 11,6" />
        </svg>
      </button>

      <div className={cn("mt-3", !open && "hidden")}>{children}</div>
    </div>
  );
}
