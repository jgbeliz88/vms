"use client";

import { useMemo, useState } from "react";
import type { ResolvedChannel, MediaexcelChannel, EnigmaLinear } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { useUpdateLinear } from "@/features/live/hooks";
import { AVAILABLE_TAGS, TAG_ICONS } from "@/components/ui/TagChip";
import { useToast } from "@/components/ui/Toast";
import { byEncoder, channelForPod, CheckBox, IconEncoder, knownTags, podPayload } from "./linear-ui";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function sameSet<T>(a: Set<T>, b: Set<T>) {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

// Edits a linear's tags and pod relationships. Mount with a `key` per linear so the drafts
// start from the linear's current values.
export function EditLinearModal({
  linear,
  channel,
  mediaexcelChannels,
  linkedByPod,
  onClose,
}: {
  linear: EnigmaLinear;
  channel: ResolvedChannel;
  mediaexcelChannels: MediaexcelChannel[];
  linkedByPod: Map<string, string>;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const updateLinear = useUpdateLinear();
  const saving = updateLinear.isPending;

  const originalTags = useMemo(() => knownTags(linear), [linear]);
  const originalPods = useMemo(() => new Set(linear.pods.map((p) => p.name)), [linear]);

  const [tagsDraft, setTagsDraft] = useState<string[]>(originalTags);
  const [podsDraft, setPodsDraft] = useState<Set<string>>(() => new Set(originalPods));
  const [query, setQuery] = useState("");

  // Pod name → name of the other linear it currently belongs to (any channel).
  const linked = useMemo(() => {
    const map = new Map(linkedByPod);
    for (const l of channel.linears) {
      if (l.id === linear.id) continue;
      for (const p of l.pods) map.set(p.name, l.name ?? `#${l.id}`);
    }
    originalPods.forEach((p) => map.delete(p));
    return map;
  }, [linkedByPod, channel.linears, linear.id, originalPods]);

  const close = () => { if (!saving) onClose(); };

  const togglePod = (pod: string) => {
    if (saving) return;
    setPodsDraft((prev) => {
      const next = new Set(prev);
      if (next.has(pod)) { next.delete(pod); } else { next.add(pod); }
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    if (saving) return;
    setTagsDraft((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // ── Tags diff ──
  const addedTags = AVAILABLE_TAGS.filter((t) => tagsDraft.includes(t) && !originalTags.includes(t));
  const removedTags = AVAILABLE_TAGS.filter((t) => !tagsDraft.includes(t) && originalTags.includes(t));
  const tagChangeCount = addedTags.length + removedTags.length;
  const tagsEmpty = tagsDraft.length === 0;

  // ── Pods diff ──
  const addedPods = [...podsDraft].filter((p) => !originalPods.has(p));
  const removedPods = [...originalPods].filter((p) => !podsDraft.has(p));
  const keptPods = [...originalPods].filter((p) => podsDraft.has(p));
  const podsChanged = !sameSet(podsDraft, originalPods);
  const podsEmpty = podsDraft.size === 0;
  // Newly selected pods that another linear already uses.
  const sharedPods = addedPods.filter((p) => linked.has(p));

  const totalPods = mediaexcelChannels.reduce((n, c) => n + c.pods.length, 0);

  // ── Left pane: MediaExcel inventory ──
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byEncoder(mediaexcelChannels)
      .map((g) => ({
        encoderName: g.encoderName,
        channels: g.channels
          .map((c) => ({ ...c, pods: c.pods.filter((p) => !q || p.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || g.encoderName.toLowerCase().includes(q)) }))
          .filter((c) => c.pods.length > 0),
      }))
      .filter((g) => g.channels.length > 0);
  }, [query, mediaexcelChannels]);

  // ── Right pane: current + draft pods. Pods no longer in MediaExcel are grouped by their Enigma encoder. ──
  const selectionGroups = useMemo(() => {
    const shown = [...new Set([...originalPods, ...podsDraft])];
    const byEnc = new Map<string, Map<string, { name: string; stale: boolean }[]>>();
    for (const pod of shown) {
      const ch = channelForPod(pod, mediaexcelChannels);
      const enigmaEncoder = linear.pods.find((p) => p.name === pod)?.encoders[0];
      const enc = ch?.encoderName ?? enigmaEncoder?.name ?? "Unknown";
      const chName = ch?.name ?? enigmaEncoder?.heroName ?? "Unknown";
      if (!byEnc.has(enc)) byEnc.set(enc, new Map());
      const chMap = byEnc.get(enc)!;
      if (!chMap.has(chName)) chMap.set(chName, []);
      chMap.get(chName)!.push({ name: pod, stale: !ch });
    }
    return Array.from(byEnc.entries()).map(([encoderName, chMap]) => ({
      encoderName,
      channels: Array.from(chMap.entries()).map(([name, pods]) => ({ name, pods })),
    }));
  }, [originalPods, podsDraft, mediaexcelChannels, linear.pods]);

  // ── Summary ──
  const changes: string[] = [];
  if (tagChangeCount) changes.push(plural(tagChangeCount, "tag change"));
  if (addedPods.length) changes.push(`+${plural(addedPods.length, "pod")}`);
  if (removedPods.length) changes.push(`−${plural(removedPods.length, "pod")}`);
  const invalid = podsEmpty || tagsEmpty;
  const canSave = !invalid && changes.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    const tags = tagChangeCount > 0 ? AVAILABLE_TAGS.filter((t) => tagsDraft.includes(t)) : undefined;
    const pods = podsChanged
      ? [...podsDraft].map((name) =>
          podPayload(name, mediaexcelChannels, linear.pods.find((p) => p.name === name)?.encoders.map((e) => e.id) ?? [])
        )
      : undefined;
    try {
      await updateLinear.mutateAsync({ linearId: linear.id, tags, pods });
      notify({ title: "Linear updated", description: `${linear.name} · ${changes.join(" · ")}`, variant: "success" });
      onClose();
    } catch (error) {
      notify({
        title: "Update linear failed",
        description: error instanceof Error ? error.message : "Unable to update linear",
        variant: "error",
      });
    }
  };

  return (
    <Modal open onClose={close} title="Edit linear" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Update the tags and pod relationships for linear{" "}
          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{linear.name}</span>.{" "}
          <span className="text-slate-400 dark:text-slate-500">
            drm:{linear.drm} · ads:{linear.adsReplacement} · frag:{linear.fragmentLength}
            {linear.drmVendor && <> · vendor:{linear.drmVendor}</>}
          </span>
        </p>

        {/* Tags */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags</span>
            <span className={cn("text-[10px]", tagsEmpty ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500")}>
              {tagsEmpty ? "Select at least one tag." : `${tagsDraft.length} of ${AVAILABLE_TAGS.length}`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-800">
            {AVAILABLE_TAGS.map((tag) => {
              const active = tagsDraft.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                    active ? "bg-brand-50 dark:bg-brand-900/30" : "bg-white dark:bg-slate-900"
                  )}
                >
                  <CheckBox state={active ? "checked" : "off"} />
                  <span className={cn("inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-4", active ? "text-brand-500 dark:text-brand-400" : "text-slate-400")}>
                    {TAG_ICONS[tag]}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{tag}</span>
                  {addedTags.includes(tag) && (
                    <span className="ml-auto rounded bg-emerald-50 px-1.5 py-px text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">added</span>
                  )}
                  {removedTags.includes(tag) && (
                    <span className="ml-auto rounded bg-rose-50 px-1.5 py-px text-[11px] font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-400">removed</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pods */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Pods</span>
            {podsChanged && (
              <button
                type="button"
                onClick={() => { if (!saving) setPodsDraft(new Set(originalPods)); }}
                className="text-[10px] font-medium text-slate-500 hover:text-slate-700 hover:underline dark:hover:text-slate-300"
              >
                Reset to current
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Left: inventory */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 p-1.5 dark:border-slate-800">
                <div className="relative">
                  <svg width="12" height="12" viewBox="0 0 12 12"
                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
                    <path d="M7.5 7.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search encoder, channel, or pod…"
                    className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[11px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="h-[300px] overflow-y-auto [scrollbar-gutter:stable]">
                {filteredGroups.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                    {query.trim() ? <>No matches for &ldquo;{query}&rdquo;.</> : "No MediaExcel pods available."}
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const podsInEnc = group.channels.flatMap((c) => c.pods);
                    const selInEnc = podsInEnc.filter((p) => podsDraft.has(p)).length;
                    return (
                      <div key={group.encoderName} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
                          <IconEncoder className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                            {group.encoderName}
                          </span>
                          <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                            {selInEnc}/{podsInEnc.length}
                          </span>
                        </div>

                        {group.channels.map((ch) => {
                          const allCh = ch.pods.every((p) => podsDraft.has(p));
                          const someCh = !allCh && ch.pods.some((p) => podsDraft.has(p));
                          return (
                            <div key={ch.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (saving) return;
                                  const next = new Set(podsDraft);
                                  ch.pods.forEach((p) => (allCh ? next.delete(p) : next.add(p)));
                                  setPodsDraft(next);
                                }}
                                className="flex w-full items-center gap-2 bg-slate-50 px-2 py-1 pl-6 text-left hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                              >
                                <CheckBox state={allCh ? "checked" : someCh ? "indeterminate" : "off"} />
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{ch.name}</span>
                              </button>
                              {ch.pods.map((pod) => {
                                const checked = podsDraft.has(pod);
                                const added = checked && !originalPods.has(pod);
                                const removed = !checked && originalPods.has(pod);
                                const linkedTo = linked.get(pod);
                                return (
                                  <button
                                    key={pod}
                                    type="button"
                                    onClick={() => togglePod(pod)}
                                    className={cn(
                                      "flex w-full items-center gap-2 px-2 py-1 pl-12 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                      added && "bg-emerald-50/60 dark:bg-emerald-900/10",
                                      removed && "bg-rose-50/60 dark:bg-rose-900/10"
                                    )}
                                  >
                                    <CheckBox state={checked ? "checked" : "off"} />
                                    <span className={cn(
                                      "flex-1 font-mono text-[11px]",
                                      removed ? "text-rose-700 line-through dark:text-rose-400" : "text-slate-600 dark:text-slate-300"
                                    )}>
                                      {pod}
                                    </span>
                                    {added && <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">added</span>}
                                    {removed && <span className="text-[9px] font-medium text-rose-600 dark:text-rose-400">removed</span>}
                                    {linkedTo && <span className="text-[9px] font-medium text-amber-500">in {linkedTo}</span>}
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

              <div className="border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] dark:border-slate-800 dark:bg-slate-900">
                <span className="tabular-nums text-slate-500 dark:text-slate-400">{podsDraft.size} / {totalPods} selected</span>
              </div>
            </div>

            {/* Right: linked to this linear */}
            <div className={cn(
              "flex min-w-0 flex-col rounded-lg border bg-white dark:bg-slate-900",
              podsEmpty ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
            )}>
              <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Linked to {linear.name}</span>
                <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">{plural(podsDraft.size, "pod")}</span>
              </div>

              <div className="flex max-h-[300px] flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
                {selectionGroups.length === 0 ? (
                  <div className="p-1 text-[11px] italic text-slate-400 dark:text-slate-500">No pods selected.</div>
                ) : (
                  selectionGroups.map((g) => (
                    <div key={g.encoderName} className="rounded-md bg-slate-50 p-1.5 dark:bg-slate-800/60">
                      <div className="mb-1 inline-flex items-center gap-1 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <IconEncoder className="h-2.5 w-2.5 text-slate-400" />
                        {g.encoderName}
                      </div>
                      <div className="space-y-1">
                        {g.channels.map((c) => (
                          <div key={c.name} className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{c.name} ·</span>
                            {c.pods.map(({ name: pod, stale }) => {
                              const isIn = podsDraft.has(pod);
                              const isNew = isIn && !originalPods.has(pod);
                              return (
                                <span
                                  key={pod}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md border py-0.5 pl-2 pr-1 font-mono text-[11px]",
                                    !isIn
                                      ? "border-dashed border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/20 dark:text-rose-400"
                                      : isNew
                                      ? "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "border-transparent bg-brand-500/10 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300"
                                  )}
                                >
                                  <span className={cn(!isIn && "line-through")}>{pod}</span>
                                  {stale && (
                                    <span
                                      title="This pod no longer exists in MediaExcel"
                                      className="rounded bg-amber-100 px-1 font-sans text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    >
                                      not in MediaExcel
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => togglePod(pod)}
                                    title={isIn ? "Remove" : "Restore"}
                                    aria-label={`${isIn ? "Remove" : "Restore"} ${pod}`}
                                    className={cn(
                                      "grid h-3.5 w-3.5 place-items-center rounded",
                                      isIn ? "hover:bg-brand-500/20" : "text-rose-600 hover:bg-rose-500/15 dark:text-rose-400"
                                    )}
                                  >
                                    {isIn ? (
                                      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                                        <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                      </svg>
                                    ) : (
                                      <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                                        <line x1="8" y1="3" x2="8" y2="13" />
                                        <line x1="3" y1="8" x2="13" y2="8" />
                                      </svg>
                                    )}
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 border-t border-slate-100 px-2.5 py-1.5 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-500/20" />{keptPods.length} kept</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-100 dark:bg-emerald-900/40" />{addedPods.length} added</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-dashed border-rose-300 bg-rose-50 dark:border-rose-700/60 dark:bg-rose-900/20" />{removedPods.length} removed</span>
              </div>
            </div>
          </div>
        </div>

        {sharedPods.length > 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
            {sharedPods.length === 1
              ? `Pod "${sharedPods[0]}" is already in use by ${linked.get(sharedPods[0])}.`
              : `${sharedPods.length} selected pods are already in use by other linears (${[...new Set(sharedPods.map((p) => linked.get(p)))].join(", ")}).`}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className={cn("text-[11px]", invalid ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400")}>
            {podsEmpty
              ? "Select at least one pod."
              : tagsEmpty
              ? "Select at least one tag."
              : changes.length > 0
              ? changes.join(" · ")
              : "No changes"}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
