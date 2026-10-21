"use client";

import { useMemo, useState } from "react";
import { EnigmaLinear, LinearBatchResult } from "@/features/live/types";
import { useBatchLinearMove, useChannelsQuery } from "@/features/live/hooks";
import { deriveOverallStatus, deriveStatusParts } from "@/features/live/status";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TagChip } from "@/components/ui/TagChip";
import { cn } from "@/lib/utils/cn";
import {
  IconLinear,
  IconEncoder,
  IconArrowsSwap,
  IconArrowRight,
  IconWarning,
  linearEncoderNames,
  countLinearPods,
  countLinearEncoders,
} from "./linear-ui";

export type MoveSource = {
  id: number;
  name: string;
  /** Active (named) linears on the source channel when the modal was opened. */
  activeCount: number;
};

type Step = "pick" | "review" | "results";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const STATUS_PILL = {
  ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
} as const;

function StepBadge({ n, label, current }: { n: number; label: string; current: number }) {
  const state = n === current ? "current" : n < current ? "done" : "upcoming";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium",
        state === "current" && "text-slate-900 dark:text-slate-100",
        state === "done" && "text-slate-500 dark:text-slate-400",
        state === "upcoming" && "text-slate-400 dark:text-slate-500"
      )}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold",
          state === "current" && "bg-brand-500 text-white",
          state === "done" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
          state === "upcoming" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        {n}
      </span>
      {label}
    </span>
  );
}

export function MoveLinearsModal({
  onClose,
  source,
  linears,
  onMoved,
}: {
  onClose: () => void;
  source: MoveSource;
  /** Snapshot of the selected linears — must not change while the modal is open. */
  linears: EnigmaLinear[];
  onMoved: (linearIds: number[]) => void;
}) {
  const { data: channels = [] } = useChannelsQuery();
  const move = useBatchLinearMove();
  const { notify } = useToast();

  const [step, setStep] = useState<Step>("pick");
  const [destId, setDestId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinearBatchResult[] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const running = move.isPending || isRetrying;

  // Destination rows are derived from the live query. Pin the destination's
  // pre-move linear count so the review/results labels don't shift after refetch.
  const destinations = useMemo(
    () =>
      channels
        .filter((c) => c.id !== source.id)
        .map((c) => {
          const status = deriveOverallStatus(
            deriveStatusParts((c.metadata as Record<string, unknown> | null)?.statusParts, c.status)
          );
          const encoders = [...new Set(c.linears.flatMap(linearEncoderNames))];
          return {
            id: c.id,
            name: c.name,
            status,
            linearCount: c.linears.filter((l) => l.name !== null).length,
            encoders,
          };
        }),
    [channels, source.id]
  );

  const [destSnapshot, setDestSnapshot] = useState<{ id: number; name: string; linearCount: number } | null>(null);
  const pickedDest = destinations.find((d) => d.id === destId) ?? null;
  const dest = step === "pick" ? pickedDest : destSnapshot;

  const q = query.trim().toLowerCase();
  const filteredDestinations = q
    ? destinations.filter((d) => d.name.toLowerCase().includes(q) || String(d.id).includes(q))
    : destinations;

  const k = linears.length;
  const podCount = countLinearPods(linears);
  const encoderCount = countLinearEncoders(linears);

  const okCount = results?.filter((r) => r.status === "success").length ?? 0;
  const failCount = (results?.length ?? 0) - okCount;

  const handleClose = () => {
    if (running) return;
    onClose();
  };

  const goToReview = () => {
    if (!pickedDest) return;
    setDestSnapshot({ id: pickedDest.id, name: pickedDest.name, linearCount: pickedDest.linearCount });
    setStep("review");
  };

  const settle = (all: LinearBatchResult[], justSucceeded: LinearBatchResult[], destName: string) => {
    if (justSucceeded.length > 0) onMoved(justSucceeded.map((r) => r.linearId));
    if (all.every((r) => r.status === "success")) {
      notify({
        title: "Linears moved",
        description: `${plural(all.length, "linear")} moved to ${destName}.`,
        variant: "success",
      });
    }
  };

  const execute = async () => {
    if (!destSnapshot || running) return;
    const inputs = linears.map((l) => ({
      linearId: l.id,
      linearName: l.name,
      channelId: source.id,
      channelName: source.name,
      tags: l.tags,
    }));
    try {
      const res = await move.mutateAsync({ linears: inputs, targetChannelId: destSnapshot.id });
      setResults(res);
      setStep("results");
      settle(res, res.filter((r) => r.status === "success"), destSnapshot.name);
    } catch (error) {
      notify({
        title: "Move failed",
        description: error instanceof Error ? error.message : "Unable to move linears",
        variant: "error",
      });
    }
  };

  const retry = async () => {
    if (!results || !destSnapshot || running) return;
    const failed = results.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    setIsRetrying(true);
    try {
      const retryRes = await move.mutateAsync({
        linears: failed.map(({ linearId, linearName, channelId, channelName, tags }) => ({
          linearId,
          linearName,
          channelId,
          channelName,
          tags,
        })),
        targetChannelId: destSnapshot.id,
      });
      const retryMap = new Map(retryRes.map((r) => [r.linearId, r]));
      const merged = results.map((r) => retryMap.get(r.linearId) ?? r);
      setResults(merged);
      settle(merged, retryRes.filter((r) => r.status === "success"), destSnapshot.name);
    } catch (error) {
      notify({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unable to move linears",
        variant: "error",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const title = step === "results" ? "Move to Channel · Results" : "Confirm · Move to Channel";
  const subline =
    step === "results"
      ? `${plural(results?.length ?? 0, "request")} · ${okCount} succeeded${failCount ? ` · ${failCount} failed` : ""}`
      : `${plural(k, "linear")} · ${podCount} pods · ${encoderCount} encoders`;

  return (
    <Modal open onClose={handleClose} title={title} size="lg">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <IconArrowsSwap />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Move to Channel</p>
            <p className="text-[11px] text-slate-400">{subline}</p>
          </div>
          {step !== "results" && (
            <div className="flex shrink-0 items-center gap-2">
              <StepBadge n={1} label="Destination" current={step === "pick" ? 1 : 2} />
              <span className="h-px w-4 bg-slate-200 dark:bg-slate-700" />
              <StepBadge n={2} label="Review" current={step === "pick" ? 1 : 2} />
            </div>
          )}
        </div>

        {/* Step 1 — Destination */}
        {step === "pick" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Choose the channel these linears will point to. Only one destination can be selected.
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Linears</span>
              {linears.map((l) => (
                <span
                  key={l.id}
                  className="inline-flex items-center rounded-md bg-brand-500/10 px-2 py-0.5 font-mono text-[11px] text-brand-800 dark:bg-brand-400/15 dark:text-brand-200"
                >
                  {l.name}
                </span>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-100 p-1.5 dark:border-slate-800">
                <div className="relative">
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  >
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
                    <path d="M7.5 7.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search channel name or ID…"
                    className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[11px] text-slate-700 outline-none focus:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
              <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto bg-slate-50/60 p-2 dark:bg-slate-950/40">
                {filteredDestinations.length === 0 && (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                    {q ? `No channels match “${query}”.` : "No other channels available."}
                  </div>
                )}
                {filteredDestinations.map((d) => {
                  const selected = d.id === destId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDestId(d.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                        selected
                          ? "border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-900/20"
                          : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border bg-white dark:bg-slate-800",
                          selected ? "border-brand-500 dark:border-brand-400" : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{d.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">#{d.id}</span>
                        </span>
                        <span className="mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <IconLinear className="h-2.5 w-2.5" />
                            {plural(d.linearCount, "linear")}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="inline-flex items-center gap-1">
                            <IconEncoder className="h-2.5 w-2.5" />
                            {d.encoders.length > 0 ? d.encoders.join(", ") : "no encoders"}
                          </span>
                        </span>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_PILL[d.status])}>
                        {d.status.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {pickedDest ? (
                  <>
                    Destination:{" "}
                    <b className="text-slate-900 dark:text-slate-100">
                      {pickedDest.name} (#{pickedDest.id})
                    </b>
                  </>
                ) : (
                  "Select a destination channel."
                )}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={goToReview} disabled={!pickedDest}>
                  Review changes →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Review */}
        {step === "review" && dest && (
          <div className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{source.name}</span>
                  <span className="font-mono text-[10.5px] text-slate-400">#{source.id}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {plural(source.activeCount, "linear")} → {source.activeCount - k}
                </div>
              </div>
              <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400">
                <IconArrowRight />
              </span>
              <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 dark:border-brand-500/40 dark:bg-brand-900/20">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">To</div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{dest.name}</span>
                  <span className="font-mono text-[10.5px] text-slate-400">#{dest.id}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {plural(dest.linearCount, "linear")} → {dest.linearCount + k}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/40">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Changes</span>
                <span className="text-[10.5px] text-slate-400">{plural(k, "PUT request")}</span>
              </div>
              <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto px-3 py-2">
                {linears.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-slate-400">linear</span>
                      <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-slate-100">{l.name}</span>
                      {l.tags.map((t) => <TagChip key={t} tag={t} />)}
                      <span className="ml-auto font-mono text-[10.5px] text-slate-400">id {l.id}</span>
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-slate-400">
                      {plural(l.pods.length, "pod")} · {plural(linearEncoderNames(l).length, "encoder")} · drm:
                      {l.drm ?? "—"} · ads:{l.adsReplacement ?? "—"} · frag:{l.fragmentLength ?? "—"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                      <span className="font-mono text-[10.5px] text-slate-500">channelId</span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        <span className="font-mono line-through">{source.id}</span>
                        {source.name}
                      </span>
                      <IconArrowRight size={12} className="text-slate-400" />
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <span className="font-mono font-semibold">{dest.id}</span>
                        {dest.name}
                      </span>
                      <span className="ml-auto font-mono text-[10.5px] text-slate-500">
                        <span className="font-semibold text-brand-600 dark:text-brand-400">PUT</span> /live/linear/{l.id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {k > 0 && k === source.activeCount && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
                <IconWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  All active linears are selected. {source.name} will have no active linears after this move.
                </span>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Only the channel relationship changes. Pods, encoders and linear configuration stay attached to each
              linear.
            </p>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Will move <b className="text-slate-900 dark:text-slate-100">{plural(k, "linear")}</b> from{" "}
                <b className="text-slate-900 dark:text-slate-100">{source.name}</b> to{" "}
                <b className="text-slate-900 dark:text-slate-100">{dest.name}</b>.
              </span>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" onClick={() => setStep("pick")} disabled={running}>
                  ← Back
                </Button>
                <Button onClick={execute} disabled={running}>
                  {running ? "Moving…" : `Move ${plural(k, "linear")} →`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Results */}
        {step === "results" && results && dest && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {failCount
                ? `${okCount} of ${results.length} linears now point to ${dest.name}. ${plural(failCount, "request")} failed and ${failCount === 1 ? "stays" : "stay"} on ${source.name}.`
                : `All ${plural(results.length, "linear")} now point to ${dest.name} (channelId ${dest.id}).`}
            </p>
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {results.map((r) => {
                const failed = r.status === "error";
                return (
                  <div
                    key={r.linearId}
                    className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex w-full items-center gap-2 px-3 py-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="font-mono text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
                          {r.linearName}
                        </span>
                        <span className="text-[11px] text-slate-400">· {failed ? source.name : dest.name}</span>
                        <span className="font-mono text-[10.5px] text-slate-400">PUT /live/linear/{r.linearId}</span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          failed
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        )}
                      >
                        {failed ? "error" : "success"}
                      </span>
                    </div>
                    {failed && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30">
                        <p className="text-[11.5px] text-red-600 dark:text-red-400">{r.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              {failCount > 0 && (
                <Button variant="secondary" onClick={retry} disabled={running}>
                  {isRetrying ? "Retrying…" : `Retry ${failCount} failed`}
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose} disabled={running}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
