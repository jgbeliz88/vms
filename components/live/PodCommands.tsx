"use client";

import { useMemo, useState } from "react";
import type { MediaexcelChannel } from "@/features/live/types";
import { usePodLinearActions } from "@/features/live/hooks";
import {
  deriveLinearName,
  flattenInventory,
  podActions,
  type PodActionId,
} from "@/features/live/pod-actions";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { ACTION_META, CheckBox, IconEncoder, IconLinear, IconPod, byEncoder } from "./linear-ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-1.5 dark:border-slate-800 dark:bg-slate-950/50">
      <span className="size-1.5 rounded-full bg-brand-500" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
        {children}
      </span>
    </div>
  );
}

export function PodCommands({
  mediaexcelChannels,
  linkedByPod,
}: {
  mediaexcelChannels: MediaexcelChannel[];
  linkedByPod: Map<string, string>;
}) {
  const { notify } = useToast();
  const podAction = usePodLinearActions();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  // Only operator overrides live here; untouched pods fall back to deriveLinearName().
  const [names, setNames] = useState<Record<string, string>>({});
  const [allName, setAllName] = useState("");
  const [confirming, setConfirming] = useState<PodActionId | null>(null);

  const inventory = useMemo(() => flattenInventory(mediaexcelChannels), [mediaexcelChannels]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byEncoder(mediaexcelChannels)
      .map((g) => ({
        encoderName: g.encoderName,
        channels: g.channels
          .map((c) => ({
            ...c,
            pods: c.pods.filter(
              (p) =>
                !q ||
                p.toLowerCase().includes(q) ||
                c.name.toLowerCase().includes(q) ||
                g.encoderName.toLowerCase().includes(q)
            ),
          }))
          .filter((c) => c.pods.length > 0),
      }))
      .filter((g) => g.channels.length > 0);
  }, [query, mediaexcelChannels]);

  const rows = inventory
    .filter((r) => selected.has(r.pod))
    .map((r) => ({ ...r, linear: names[r.pod] ?? deriveLinearName(r.pod) }));
  const encoderCount = new Set(rows.map((r) => r.encoder)).size;
  const missing = rows.filter((r) => !r.linear.trim()).length;
  const ready = rows.length > 0 && missing === 0;
  const targets = rows.map((r) => ({ ...r, linear: r.linear.trim() }));

  const togglePod = (pod: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pod)) { next.delete(pod); } else { next.add(pod); }
      return next;
    });

  const setMany = (pods: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      pods.forEach((p) => (on ? next.add(p) : next.delete(p)));
      return next;
    });

  const applyToAll = () => {
    const value = allName.trim();
    if (!value || rows.length === 0) return;
    setNames((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.pod, value])) }));
  };

  const confirmMeta = podActions.find((a) => a.id === confirming) ?? null;

  const executeAction = async () => {
    if (!confirmMeta) return;
    try {
      const results = await podAction.mutateAsync({
        actionId: confirmMeta.id,
        targets: targets.map((t) => ({ podName: t.pod, linearName: t.linear })),
      });
      const failures = results.filter((r) => r.error);
      if (failures.length === 0) {
        notify({
          title: confirmMeta.doneTitle,
          description: results.map((r) => `${r.podName}/${r.linearName}`).join(" · "),
          variant: "success",
        });
      } else {
        notify({
          title: "Action failed",
          description: failures.map((r) => `${r.podName}/${r.linearName}: ${r.error}`).join(" · "),
          variant: "error",
        });
      }
    } catch (error) {
      notify({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unable to execute action",
        variant: "error",
      });
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* Card header */}
      <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pod Commands</div>
        <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Select pods and their linear names to run actions without a channel or linear
        </div>
      </div>

      <div className="grid grid-cols-[minmax(340px,388px)_minmax(0,1fr)]">
        {/* LEFT: pod tree */}
        <div className="flex flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Target pods
              </span>
              <span className="block text-[10px] text-slate-400/80 dark:text-slate-500/80">
                {rows.length}/{inventory.length} selected · {plural(encoderCount, "encoder")}
              </span>
            </div>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="shrink-0 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
            <div className="relative">
              <svg
                width="12" height="12" viewBox="0 0 12 12"
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              >
                <circle cx="5" cy="5" r="3.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
                <path d="M7.5 7.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search encoder, channel, or pod…"
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[11px] text-[#1C2434] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-[#DEE4EE]"
              />
            </div>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
                {query.trim() ? <>No matches for &ldquo;{query}&rdquo;.</> : "No pods available."}
              </div>
            ) : (
              filteredGroups.map((group) => {
                const podsInEnc = group.channels.flatMap((c) => c.pods);
                const selInEnc = podsInEnc.filter((p) => selected.has(p)).length;
                return (
                  <div key={group.encoderName} className="border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <IconEncoder className="h-2.5 w-2.5 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        {group.encoderName}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                        {selInEnc}/{podsInEnc.length}
                      </span>
                    </div>

                    {group.channels.map((ch) => {
                      const allCh = ch.pods.every((p) => selected.has(p));
                      const someCh = !allCh && ch.pods.some((p) => selected.has(p));
                      return (
                        <div key={ch.id}>
                          <button
                            type="button"
                            onClick={() => setMany(ch.pods, !allCh)}
                            className="flex w-full items-center gap-2 bg-slate-50 py-[5px] pl-[26px] pr-3 text-left hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800"
                          >
                            <CheckBox state={allCh ? "checked" : someCh ? "indeterminate" : "off"} />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{ch.name}</span>
                          </button>
                          {ch.pods.map((pod) => {
                            const linked = linkedByPod.get(pod);
                            return (
                              <button
                                key={pod}
                                type="button"
                                onClick={() => togglePod(pod)}
                                className="flex w-full items-center gap-2 bg-white py-[5px] pl-12 pr-3 text-left hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950"
                              >
                                <CheckBox state={selected.has(pod) ? "checked" : "off"} />
                                <span className="flex-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">{pod}</span>
                                {linked && (
                                  <span className="shrink-0 whitespace-nowrap text-[9px] font-medium text-amber-500 dark:text-amber-400">
                                    in {linked}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: linear names + actions */}
        <div className="flex flex-col">
          <SectionHeader>Linear names</SectionHeader>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[#8899A8]">Same name for all</span>
                <input
                  value={allName}
                  onChange={(e) => setAllName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") applyToAll(); }}
                  placeholder="e.g. linear08"
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 font-mono text-[13px] text-[#1C2434] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]"
                />
              </label>
              <button
                type="button"
                onClick={applyToAll}
                disabled={!allName.trim() || rows.length === 0}
                className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium text-[#1C2434] transition-colors hover:bg-[#F1F5F9] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE] dark:hover:bg-[#333A48]"
              >
                Apply to all
              </button>
            </div>

            {rows.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Per pod</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">Prefilled from the pod name</span>
                </div>
                {rows.map((r) => (
                  <div
                    key={r.pod}
                    className="grid grid-cols-[minmax(0,1fr)_200px_22px] items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 flex-col gap-px">
                      <span className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{r.pod}</span>
                      <span className="truncate text-[10px] text-slate-400 dark:text-slate-500">{r.encoder} · {r.channel}</span>
                    </div>
                    <input
                      value={r.linear}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNames((prev) => ({ ...prev, [r.pod]: value }));
                      }}
                      placeholder="linear name"
                      aria-label={`Linear name for ${r.pod}`}
                      className={cn(
                        "w-full rounded-md border bg-white px-2.5 py-1.5 font-mono text-xs text-[#1C2434] focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-slate-900 dark:text-[#DEE4EE]",
                        r.linear.trim()
                          ? "border-[#E2E8F0] focus:border-brand-500 dark:border-slate-700"
                          : "border-[#D34053] dark:border-[#F87171]"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => togglePod(r.pod)}
                      title="Remove pod"
                      aria-label={`Remove ${r.pod}`}
                      className="grid h-[22px] w-[22px] place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <svg width="10" height="10" viewBox="0 0 8 8">
                        <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-[11px] text-slate-400 dark:border-slate-600 dark:text-slate-500">
                Select pods on the left to set their linear names.
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700" />
          <SectionHeader>Pod actions</SectionHeader>
          <div className="grid grid-cols-1 gap-2.5 p-4">
            {podActions.map((action) => {
              const meta = ACTION_META[action.id];
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={!ready}
                  onClick={() => setConfirming(action.id)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all",
                    ready
                      ? "border-slate-200 bg-white hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-brand-900/10"
                      : "cursor-not-allowed border-slate-200 bg-white opacity-45 dark:border-slate-700 dark:bg-slate-900"
                  )}
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.iconBg)}>
                    <span className={meta.iconColor}>{meta.icon}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">{action.label}</span>
                    <span className="block text-[10px] leading-snug text-slate-400 dark:text-slate-500">{action.description}</span>
                  </span>
                  <svg
                    className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })}
          </div>
          {!ready && (
            <p className="mx-4 mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
              {rows.length === 0
                ? "Select at least one pod to enable actions"
                : `${plural(missing, "pod")} still need a linear name`}
            </p>
          )}
        </div>
      </div>

      {/* Action confirm dialog */}
      <Modal
        open={Boolean(confirmMeta)}
        onClose={() => setConfirming(null)}
        title={`Confirm · ${confirmMeta?.label ?? ""}`}
        size="md"
      >
        {confirmMeta && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", ACTION_META[confirmMeta.id].iconBg)}>
                <span className={ACTION_META[confirmMeta.id].iconColor}>{ACTION_META[confirmMeta.id].icon}</span>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{confirmMeta.label}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {plural(targets.length, "pod")} · {plural(encoderCount, "encoder")} ·{" "}
                  {plural(new Set(targets.map((t) => t.linear)).size, "linear name")}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              This action will be sent to each pod below, on the linear folder shown:
            </p>

            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {targets.map((t) => (
                <div
                  key={t.pod}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <IconPod className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">pod</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{t.pod}</span>
                  <span className="truncate text-[10px] text-slate-400 dark:text-slate-500">· {t.channel} · {t.encoder}</span>
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px]">
                    <IconLinear className="h-3 w-3 text-brand-500" />
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{t.linear}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmMeta.id === "clean" ? "danger" : "primary"}
                onClick={executeAction}
                disabled={podAction.isPending}
              >
                {podAction.isPending ? "Executing…" : `${confirmMeta.label} →`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
