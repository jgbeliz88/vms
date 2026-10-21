"use client";

import { HttpStatusPill } from "@/components/playback/HttpStatusPill";

type DiagnosticsData = {
  httpStatus?: number;
  error?: string;
  manifest?: string;
};

type Props = {
  diagnostics: {
    isPending: boolean;
    data?: DiagnosticsData | null;
  };
  idleText?: string;
};

export function DiagnosticsBlock({ diagnostics, idleText }: Props) {
  if (diagnostics.isPending) {
    return <div className="text-slate-400">Running diagnostics (curl)...</div>;
  }
  if (!diagnostics.data) {
    if (idleText) return <>{idleText}</>;
    return null;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <span className="font-semibold">HTTP Status:</span>{" "}
        {diagnostics.data.httpStatus != null ? <HttpStatusPill status={diagnostics.data.httpStatus} /> : "—"}
      </div>
      {diagnostics.data.error ? (
        <div className="text-rose-500">Error: {diagnostics.data.error}</div>
      ) : null}
      {diagnostics.data.manifest ? (
        <details className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
            Open Manifest
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-emerald-700 dark:text-emerald-200">
            {diagnostics.data.manifest}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
