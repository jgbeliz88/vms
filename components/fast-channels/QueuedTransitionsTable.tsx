"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useChannelCronJobsQuery, useDeleteCronJob, useRunCronJob } from "@/features/fast-channels/hooks";
import { formatUtc, relativeTo } from "@/features/fast-channels/format";

type RunState = { status: "running" } | { status: "done" } | { status: "failed"; message: string };

export function QueuedTransitionsTable({ channelName }: { channelName: string }) {
  const { notify } = useToast();
  const { data: jobs, isLoading, isError } = useChannelCronJobsQuery(channelName);
  const runJob = useRunCronJob();
  const deleteJob = useDeleteCronJob();

  const [runStates, setRunStates] = useState<Record<string, RunState>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const rows = jobs ?? [];

  const handleRun = async (id: string) => {
    setRunStates((prev) => ({ ...prev, [id]: { status: "running" } }));
    try {
      await runJob.mutateAsync({ id, channelName });
      setRunStates((prev) => ({ ...prev, [id]: { status: "done" } }));
      notify({
        title: "Cron job executed",
        description: "The transition may take a few seconds to appear in the list.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run cron job";
      setRunStates((prev) => ({ ...prev, [id]: { status: "failed", message } }));
      notify({ title: "Run failed", description: message, variant: "error" });
    }
  };

  const handleDelete = (id: string) => {
    deleteJob.mutate(id, {
      onSuccess: () => {
        setRunStates((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        notify({ title: "Cron job deleted", description: id });
      },
      onError: (error) => {
        notify({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Unable to delete cron job",
          variant: "error",
        });
      },
      onSettled: () => setConfirmingId(null),
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Queued Transitions
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            {rows.length} pending
          </span>
        </div>
        <span className="text-[11px] text-text-muted">
          Cron jobs matching{" "}
          <span className="font-mono text-text-primary dark:text-slate-200">
            recreate-{channelName}-*
          </span>
        </span>
      </div>
      <p className="mb-3 text-xs text-text-secondary">
        Only shows transitions carried over from recreating a channel that already had them. Each
        job replays its original request against Enigma at its execution time — run one early, or
        delete it if the transition already exists. Transitions queued through the standard flow
        aren&apos;t shown here.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Transition</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Created</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Execution</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                  {isLoading
                    ? "Loading cron jobs…"
                    : isError
                      ? "Failed to load cron jobs."
                      : "No cron jobs queued for this channel."}
                </td>
              </tr>
            ) : (
              rows.map((job) => {
                const runState = runStates[job.id];
                const isConfirming = confirmingId === job.id;
                return (
                  <tr key={job.id} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {job.transitionName}
                      </div>
                      <div className="mt-0.5 break-all font-mono text-[10.5px] text-text-muted">
                        {job.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatUtc(job.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-800 dark:text-slate-200">
                        {formatUtc(job.executionTime)}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-text-muted">
                        {relativeTo(job.executionTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isConfirming ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-slate-500">Delete cron job?</span>
                          <Button
                            variant="danger"
                            disabled={deleteJob.isPending}
                            onClick={() => handleDelete(job.id)}
                          >
                            {deleteJob.isPending ? "Deleting…" : "Yes"}
                          </Button>
                          <Button variant="secondary" onClick={() => setConfirmingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : runState?.status === "running" ? (
                        <div className="flex items-center justify-end">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                            Running…
                          </span>
                        </div>
                      ) : runState?.status === "failed" ? (
                        <div className="flex items-center justify-end gap-2">
                          <span
                            title={runState.message}
                            className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
                          >
                            Run failed
                          </span>
                          <Button variant="secondary" onClick={() => handleRun(job.id)}>
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {runState?.status === "done" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              Ran manually
                            </span>
                          ) : (
                            <Button variant="secondary" onClick={() => handleRun(job.id)}>
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              Run now
                            </Button>
                          )}
                          <Button variant="danger" onClick={() => setConfirmingId(job.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
