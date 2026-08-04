"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A detail-view card whose body collapses behind a clickable header. Closed by
 * default. The header is a single button: a chevron disc sits left of the title
 * for disclosure, and a Show/Hide affordance on the right spells out the action
 * (visual only — a span, so there is no nested button or extra tab stop).
 *
 * The body is hidden with `display:none` rather than unmounted, so stateful
 * children (config editors seeded once from props) keep unsaved edits across a
 * collapse/expand.
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
        className="group flex w-full select-none items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-800 dark:text-brand-300">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("h-3.5 w-3.5 transition-transform duration-150", open ? "rotate-0" : "-rotate-90")}
              aria-hidden
            >
              <polyline points="5,6 8,9 11,6" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
            {subtitle && (
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
            )}
          </span>
        </span>
        <span
          aria-hidden
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1C2434] transition-colors duration-150 group-hover:bg-[#F1F5F9] dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE] dark:group-hover:bg-[#333A48]"
        >
          {open ? "Hide" : "Show"}
        </span>
      </button>

      <div className={cn("mt-3", !open && "hidden")}>{children}</div>
    </div>
  );
}
