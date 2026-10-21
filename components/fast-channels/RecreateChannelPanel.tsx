"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useChannelCronJobsQuery } from "@/features/fast-channels/hooks";
import { RecreateChannelModal } from "./RecreateChannelModal";

export function RecreateChannelPanel({ channelName }: { channelName: string }) {
  const { data: cronJobs } = useChannelCronJobsQuery(channelName);
  const [modalOpen, setModalOpen] = useState(false);
  const [recreated, setRecreated] = useState(false);

  const queuedCount = cronJobs?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-text-secondary">
        Deletes{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-text-primary dark:bg-slate-800 dark:text-slate-100">
          {channelName}
        </code>{" "}
        and creates it again from its current SMIL. Its existing transitions are re-queued as cron
        jobs.
      </p>

      <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 dark:border-rose-500/30 dark:bg-rose-500/10">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-4 w-4 shrink-0 text-danger"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <div className="text-xs leading-relaxed text-rose-900 dark:text-rose-200">
          <div className="mb-0.5 font-bold">The channel goes down while it is rebuilt.</div>
          Playback for this channel will be interrupted. Queued transitions appear in{" "}
          <b>Queued Transitions</b> below and are executed by their cron jobs — or manually from
          there.
        </div>
      </div>

      {recreated && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          <svg
            viewBox="0 0 24 24"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <div>
            <b>Channel recreated.</b> {queuedCount} transition{queuedCount === 1 ? "" : "s"}{" "}
            {queuedCount === 1 ? "was" : "were"} re-queued as cron jobs.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-base pt-4 dark:border-slate-700">
        <Button variant="danger" onClick={() => setModalOpen(true)}>
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          Recreate Channel
        </Button>
      </div>

      <RecreateChannelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        channelName={channelName}
        queuedCount={queuedCount}
        onRecreated={() => setRecreated(true)}
      />
    </div>
  );
}
