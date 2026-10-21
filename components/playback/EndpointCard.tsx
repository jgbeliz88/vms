import type { ReactNode } from "react";

type Row = { label: string; value: ReactNode };

export function EndpointCard({ title, rows, children }: { title: string; rows: Row[]; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="break-all">
          <span className="font-semibold">{row.label}</span> {row.value}
        </div>
      ))}
      {children ? (
        <div className="border-t border-slate-200 pt-1.5 dark:border-slate-700">{children}</div>
      ) : null}
    </div>
  );
}
