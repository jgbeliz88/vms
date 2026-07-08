"use client";

import { useState, useMemo } from "react";
import { ResolvedChannel, EnigmaLinear, EnigmaLinearPod, EnigmaEncoder, LinearBatchResult } from "@/features/live/types";
import { useBatchLinearSync, useBatchLinearClean, useBatchLinearClear, useBatchLinearCreate } from "@/features/live/hooks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AVAILABLE_TAGS, TAG_ICONS, TagChip } from "@/components/ui/TagChip";


const DEFAULT_CONFIG: LinearConfig = {
  drm: false,
  adsReplacement: true,
  fragmentLength: "48/25",
  disableDrmManifests: false,
  drmVendor: "kms",
  contentId: "free_to_air_channels",
};

// ── Types ────────────────────────────────────────────────────────────────────

type LinearConfig = {
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

type ActionType = "sync" | "clean";

const ACTION_META: Record<ActionType, { label: string; destructive: boolean; blurb: string }> = {
  sync: {
    label: "Synchronize",
    destructive: false,
    blurb: "Force a metadata + cache sync on every linear of the selected channels.",
  },
  clean: {
    label: "Clean Channels",
    destructive: true,
    blurb: "Clear derived artifacts and rebuild caches for every linear of the selected channels.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveLinearName(podName: string): string {
  const withoutPrefix = podName.replace(/^uspori/, "");
  return withoutPrefix.replace(/[a-z]$/i, "");
}

function linearMatchesTags(linear: EnigmaLinear, activeTags: string[]): boolean {
  if (activeTags.length === 0) return true;
  return activeTags.some((t) => (linear.tags ?? []).includes(t));
}

function filterChannelsLinears(
  channels: ResolvedChannel[],
  activeTags: string[],
  predicate?: (l: EnigmaLinear) => boolean
): ResolvedChannel[] {
  return channels
    .map((ch) => ({
      ...ch,
      linears: ch.linears.filter(
        (l) => (predicate ? predicate(l) : true) && linearMatchesTags(l, activeTags)
      ),
    }))
    .filter((ch) => ch.linears.length > 0);
}

function countByTag(
  channels: ResolvedChannel[],
  predicate?: (l: EnigmaLinear) => boolean
): { counts: Record<string, number>; total: number } {
  const counts: Record<string, number> = {};
  AVAILABLE_TAGS.forEach((t) => (counts[t] = 0));
  let total = 0;
  channels.forEach((ch) =>
    ch.linears.forEach((l) => {
      if (predicate && !predicate(l)) return;
      total += 1;
      (l.tags ?? []).forEach((t) => {
        if (counts[t] != null) counts[t] += 1;
      });
    })
  );
  return { counts, total };
}

function rollupCounts(channels: ResolvedChannel[]): { channels: number; linears: number; pods: number; encoders: number } {
  let linears = 0, pods = 0, encoders = 0;
  channels.forEach((ch) =>
    ch.linears.forEach((l) => {
      linears += 1;
      pods += l.pods.length;
      encoders += l.pods.reduce((n, p) => n + p.encoders.length, 0);
    })
  );
  return { channels: channels.length, linears, pods, encoders };
}

// ── Small UI atoms ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function StatTile({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "brand" | "danger" | "ok" }) {
  const colors = {
    default: "text-slate-900 dark:text-slate-100",
    brand: "text-brand-700 dark:text-brand-400",
    danger: "text-rose-700 dark:text-rose-400",
    ok: "text-emerald-700 dark:text-emerald-400",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("mt-0.5 text-xl font-semibold tabular-nums", colors[tone])}>{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        status === "running"
          ? "bg-emerald-500"
          : status === "degraded"
          ? "bg-amber-500"
          : "bg-slate-400"
      )}
    />
  );
}

function EncoderChip({ enc }: { enc: EnigmaEncoder }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10.5px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      <span className="font-mono">{enc.name}</span>
      <span className="text-slate-400">·</span>
      <span className="font-mono text-slate-400">{enc.deviceId}.{enc.channelIndex}.{enc.id}</span>
    </span>
  );
}

function PodLine({ pod }: { pod: EnigmaLinearPod }) {
  return (
    <div className="py-0.5">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-slate-700 dark:text-slate-300">
        <span className="text-[9px] uppercase tracking-widest text-slate-400">pod</span>
        <span className="font-mono font-semibold">{pod.name}</span>
        <StatusDot status={pod.status} />
        {pod.encoders.length > 1 && (
          <span className="text-[10.5px] text-slate-400">· {pod.encoders.length} encoders</span>
        )}
      </div>
      <div className="mt-1 ml-5 flex flex-wrap items-center gap-1">
        {pod.encoders.map((e) => <EncoderChip key={e.id} enc={e} />)}
      </div>
    </div>
  );
}


function LinearTreeBlock({
  linear,
  override,
}: {
  linear: EnigmaLinear;
  override?: React.ReactNode;
}) {
  const cleared = linear.name === null;
  const encoderCount = linear.pods.reduce((n, p) => n + p.encoders.length, 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-slate-400">linear</span>
            {cleared ? (
              <span className="italic text-slate-400 text-[12px]">null</span>
            ) : (
              <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-slate-100">{linear.name}</span>
            )}
            {override}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 whitespace-nowrap text-[10.5px] text-slate-400">
            <span>{linear.pods.length} pod{linear.pods.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{encoderCount} encoder{encoderCount === 1 ? "" : "s"}</span>
            {!cleared && (
              <>
                <span>·</span>
                <span>drm:{linear.drm}</span>
                <span>·</span>
                <span>ads:{linear.adsReplacement}</span>
                <span>·</span>
                <span>frag:{linear.fragmentLength}</span>
              </>
            )}
          </div>
          <div className="mt-1.5 ml-2 space-y-1 border-l border-dashed border-slate-200 pl-3 dark:border-slate-700">
            {linear.pods.map((p) => <PodLine key={p.id} pod={p} />)}
          </div>
          <div className="mt-2 ml-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pl-3 pt-2 dark:border-slate-800">
            <span className="text-[9px] uppercase tracking-widest text-slate-400">tags</span>
            {(linear.tags ?? []).length === 0 ? (
              <span className="text-[10px] italic text-slate-400">no tags</span>
            ) : (
              (linear.tags ?? []).map((t) => <TagChip key={t} tag={t} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelGroupHeader({ channel, count }: { channel: ResolvedChannel; count: number }) {
  return (
    <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <span className="grid h-5 min-w-[1.4rem] place-items-center rounded-md bg-brand-50 px-1.5 text-[10.5px] font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
        {count}
      </span>
      <span className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{channel.name}</span>
      <span className="text-[11px] text-slate-400">· {count} linear{count === 1 ? "" : "s"}</span>
    </div>
  );
}

// ── Tag filter bar ───────────────────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition",
        active
          ? "border-brand-500 bg-brand-500 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      )}
    >
      {TAG_ICONS[label] && (
        <span className={active ? "text-white" : "text-slate-400"}>{TAG_ICONS[label]}</span>
      )}
      {label}
      <span
        className={cn(
          "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] leading-none tabular-nums",
          active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TagFilterBar({
  activeTags,
  onToggle,
  onAll,
  counts,
  total,
}: {
  activeTags: string[];
  onToggle: (t: string) => void;
  onAll: () => void;
  counts: Record<string, number>;
  total: number;
}) {
  const allActive = activeTags.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Filter by tag
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={allActive} onClick={onAll} label="All" count={total} />
        <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        {AVAILABLE_TAGS.map((t) => (
          <FilterChip
            key={t}
            active={!allActive && activeTags.includes(t)}
            onClick={() => onToggle(t)}
            label={t}
            count={counts[t] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

// ── Result row (per-linear, expandable to pod detail) ───────────────────────

function ResultLinearRow({ result }: { result: LinearBatchResult }) {
  const [open, setOpen] = useState(false);
  const success = result.status === "success";
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <svg
          className={cn("h-3 w-3 text-slate-400 transition-transform", open && "rotate-90")}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">
              {result.linearName ?? <span className="italic text-slate-400">null</span>}
            </span>
            <span className="text-[11px] text-slate-400">· {result.channelName}</span>
          </div>
          {(result.tags ?? []).length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {(result.tags ?? []).map((t) => <TagChip key={t} tag={t} />)}
            </div>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            success
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          )}
        >
          {success ? "success" : "error"}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30">
          {result.error ? (
            <p className="text-[11.5px] text-red-600 dark:text-red-400">{result.error}</p>
          ) : (
            <p className="text-[11.5px] text-slate-500">
              {JSON.stringify(result.data).slice(0, 200)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Impact modal (Sync / Clean) ──────────────────────────────────────────────

function ImpactModal({
  open,
  onClose,
  action,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  action: ActionType | null;
  selected: ResolvedChannel[];
}) {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [results, setResults] = useState<LinearBatchResult[] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const syncMutation = useBatchLinearSync();
  const cleanMutation = useBatchLinearClean();

  const loading =
    (action === "sync" && syncMutation.isPending) ||
    (action === "clean" && cleanMutation.isPending);

  const meta = action ? ACTION_META[action] : null;

  const baseStats = useMemo(() => countByTag(selected), [selected]);
  const filtered = useMemo(() => filterChannelsLinears(selected, activeTags), [selected, activeTags]);
  const counts = useMemo(() => rollupCounts(filtered), [filtered]);

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function handleClose() {
    setActiveTags([]);
    setResults(null);
    onClose();
  }

  async function handleConfirm() {
    if (!action || !meta) return;
    const inputs = filtered.flatMap((ch) =>
      ch.linears.map((l) => ({
        linearId: l.id,
        linearName: l.name,
        channelId: ch.id,
        channelName: ch.name,
        tags: l.tags ?? [],
      }))
    );

    const mutation = action === "sync" ? syncMutation : cleanMutation;
    const res = await mutation.mutateAsync(inputs);
    setResults(res);
  }

  async function handleRetry() {
    if (!results || !action) return;
    const failed = results.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    setIsRetrying(true);
    try {
      const mutation = action === "sync" ? syncMutation : cleanMutation;
      const retryRes = await mutation.mutateAsync(failed);
      const retryMap = new Map(retryRes.map((r) => [r.linearId, r]));
      setResults((prev) => prev?.map((r) => retryMap.get(r.linearId) ?? r) ?? retryRes);
    } finally {
      setIsRetrying(false);
    }
  }

  if (!open || !meta) return null;

  const hasFailures = results?.some((r) => r.status === "error");

  return (
    <Modal open={open} onClose={handleClose} title={meta.label} size="lg">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {results ? (
          <>
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {results.map((r) => <ResultLinearRow key={r.linearId} result={r} />)}
            </div>
            <div className="flex justify-end gap-2">
              {hasFailures && (
                <Button variant="secondary" onClick={handleRetry} disabled={isRetrying || loading}>
                  {isRetrying ? "Retrying…" : `Retry ${results.filter((r) => r.status === "error").length} failed`}
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">{meta.blurb}</p>
            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Channels" value={counts.channels} tone="brand" />
              <StatTile label="Linears" value={counts.linears} />
              <StatTile label="Pods" value={counts.pods} />
              <StatTile label="Encoders" value={counts.encoders} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
              <TagFilterBar
                activeTags={activeTags}
                onToggle={toggleTag}
                onAll={() => setActiveTags([])}
                counts={baseStats.counts}
                total={baseStats.total}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 dark:bg-slate-800/50 dark:border-slate-700">
              <div className="border-b border-slate-200 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Impact preview
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-8 text-center text-xs text-slate-400">
                    {activeTags.length > 0
                      ? `No linears tagged "${activeTags.join(", ")}" in the selected channels.`
                      : "No linears in the selected channels."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((ch) => (
                      <div key={ch.id}>
                        <ChannelGroupHeader channel={ch} count={ch.linears.length} />
                        <div className="space-y-1.5 px-3 py-2">
                          {ch.linears.map((l) => <LinearTreeBlock key={l.id} linear={l} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {meta.destructive && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-400">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2L14 13H2L8 2Z" /><line x1="8" y1="7" x2="8" y2="10" /><circle cx="8" cy="12" r="0.5" fill="currentColor" />
                </svg>
                <span>{meta.label} clears derived artifacts. Active streams may experience a brief interruption while caches rebuild.</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {activeTags.length > 0 && (
                  <>Tag filter: <b className="text-slate-700 dark:text-slate-300">{activeTags.join(", ")}</b> · </>
                )}
                Will affect <b className="text-slate-900 dark:text-slate-100">{counts.linears}</b> linear{counts.linears === 1 ? "" : "s"} across <b className="text-slate-900 dark:text-slate-100">{counts.channels}</b> channel{counts.channels === 1 ? "" : "s"}.
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button
                  variant={meta.destructive ? "danger" : "primary"}
                  disabled={counts.linears === 0 || loading}
                  onClick={handleConfirm}
                >
                  {loading
                    ? `${meta.label}…`
                    : `${meta.label} ${counts.linears} linear${counts.linears === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Create Linear modal ──────────────────────────────────────────────────────

function CreateLinearModal({
  open,
  onClose,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  selected: ResolvedChannel[];
}) {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [config, setConfig] = useState<LinearConfig>(DEFAULT_CONFIG);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [results, setResults] = useState<LinearBatchResult[] | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const createMutation = useBatchLinearCreate();

  const isEmptyLinear = (l: EnigmaLinear) => l.name === null;
  const baseStats = useMemo(() => countByTag(selected, isEmptyLinear), [selected]);
  const groups = useMemo(
    () => filterChannelsLinears(selected, activeTags, isEmptyLinear),
    [selected, activeTags]
  );
  const totalToCreate = groups.reduce((n, ch) => n + ch.linears.length, 0);

  function previewName(linear: EnigmaLinear): string {
    if (overrides[linear.id]) return overrides[linear.id];
    const firstPod = linear.pods[0]?.name ?? "";
    return deriveLinearName(firstPod);
  }

  function setCfg<K extends keyof LinearConfig>(key: K, value: LinearConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function handleClose() {
    setActiveTags([]);
    setConfig(DEFAULT_CONFIG);
    setOverrides({});
    setEditingId(null);
    setResults(null);
    setShowValidation(false);
    onClose();
  }

  async function handleConfirm() {
    if (!config.fragmentLength.trim()) {
      setShowValidation(true);
      return;
    }
    const linears = groups.flatMap((ch) =>
      ch.linears.map((l) => ({
        linearId: l.id,
        linearName: l.name,
        channelId: ch.id,
        channelName: ch.name,
        tags: l.tags ?? [],
        name: previewName(l),
      }))
    );
    const res = await createMutation.mutateAsync({ linears, config });
    setResults(res);
  }

  async function handleRetry() {
    if (!results) return;
    const failed = results.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    setIsRetrying(true);
    try {
      // Rebuild failed inputs with their names
      const failedInputs = failed.map((r) => ({
        linearId: r.linearId,
        linearName: r.linearName,
        channelId: r.channelId,
        channelName: r.channelName,
        tags: r.tags,
        name: overrides[r.linearId] ?? deriveLinearName(
          groups.flatMap((ch) => ch.linears).find((l) => l.id === r.linearId)?.pods[0]?.name ?? ""
        ),
      }));
      const retryRes = await createMutation.mutateAsync({ linears: failedInputs, config });
      const retryMap = new Map(retryRes.map((r) => [r.linearId, r]));
      setResults((prev) => prev?.map((r) => retryMap.get(r.linearId) ?? r) ?? retryRes);
    } finally {
      setIsRetrying(false);
    }
  }

  const hasFailures = results?.some((r) => r.status === "error");

  return (
    <Modal open={open} onClose={handleClose} title="Configure Linears" size="lg">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {results ? (
          <>
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {results.map((r) => <ResultLinearRow key={r.linearId} result={r} />)}
            </div>
            <div className="flex justify-end gap-2">
              {hasFailures && (
                <Button variant="secondary" onClick={handleRetry} disabled={isRetrying || createMutation.isPending}>
                  {isRetrying ? "Retrying…" : `Retry ${results.filter((r) => r.status === "error").length} failed`}
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </>
        ) : (
          <>
            {/* Config form */}
            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Linear Configuration
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <FormRow label="Fragment Length">
                  <Input
                    value={config.fragmentLength}
                    placeholder="e.g. 48/25"
                    onChange={(e) => { setCfg("fragmentLength", e.target.value); setShowValidation(false); }}
                    error={showValidation && !config.fragmentLength.trim() ? "Required" : undefined}
                  />
                </FormRow>
                <FormRow label="DRM">
                  <div className="flex justify-end">
                    <Toggle checked={config.drm} onChange={(v) => setCfg("drm", v)} />
                  </div>
                </FormRow>
                <FormRow label="Ads Replacement">
                  <div className="flex justify-end">
                    <Toggle checked={config.adsReplacement} onChange={(v) => setCfg("adsReplacement", v)} />
                  </div>
                </FormRow>
                <FormRow label="Disable DRM Manifests">
                  <div className="flex justify-end">
                    <Toggle checked={config.disableDrmManifests} onChange={(v) => setCfg("disableDrmManifests", v)} />
                  </div>
                </FormRow>
                {config.drm && (
                  <>
                    <FormRow label="DRM Vendor">
                      <Input
                        value={config.drmVendor}
                        placeholder="e.g. kms"
                        onChange={(e) => setCfg("drmVendor", e.target.value)}
                      />
                    </FormRow>
                    <FormRow label="Content ID">
                      <Input
                        value={config.contentId}
                        placeholder="e.g. premium"
                        onChange={(e) => setCfg("contentId", e.target.value)}
                      />
                    </FormRow>
                  </>
                )}
              </div>
            </div>

            {/* Tag filter */}
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
              <TagFilterBar
                activeTags={activeTags}
                onToggle={toggleTag}
                onAll={() => setActiveTags([])}
                counts={baseStats.counts}
                total={baseStats.total}
              />
            </div>

            {/* Empty linears tree */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 dark:bg-slate-800/50 dark:border-slate-700">
              <div className="border-b border-slate-200 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Linears to create
              </div>
              <div className="max-h-64 overflow-y-auto">
                {groups.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">
                    {activeTags.length > 0
                      ? `No empty linears tagged "${activeTags.join(", ")}" in the selected channels.`
                      : "No empty linears in the selected channels."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groups.map((ch) => (
                      <div key={ch.id}>
                        <ChannelGroupHeader channel={ch} count={ch.linears.length} />
                        <div className="space-y-1.5 px-3 py-2">
                          {ch.linears.map((l) => {
                            const name = previewName(l);
                            const isEditing = editingId === l.id;
                            return (
                              <LinearTreeBlock
                                key={l.id}
                                linear={l}
                                override={
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                                      will be created as
                                    </span>
                                    {isEditing ? (
                                      <input
                                        autoFocus
                                        value={name}
                                        onChange={(e) => setOverrides((o) => ({ ...o, [l.id]: e.target.value }))}
                                        onBlur={() => setEditingId(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === "Escape") setEditingId(null);
                                        }}
                                        className="h-6 w-32 rounded border border-brand-300 bg-white px-1.5 font-mono text-[12px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300 dark:border-brand-600 dark:bg-slate-800 dark:text-slate-100"
                                      />
                                    ) : (
                                      <button
                                        onClick={() => setEditingId(l.id)}
                                        title="Click to edit linear name"
                                        className="group inline-flex items-center gap-1 rounded border border-transparent px-1 font-mono text-[12px] font-semibold text-brand-700 hover:border-brand-200 hover:bg-brand-50 dark:text-slate-100 dark:hover:border-brand-700/40 dark:hover:bg-brand-500/10"
                                      >
                                        {name}
                                        <svg className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                          <path d="M11 2l3 3-9 9H2v-3L11 2Z" />
                                        </svg>
                                      </button>
                                    )}
                                  </span>
                                }
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <b className="text-slate-900 dark:text-slate-100">{totalToCreate}</b> linear{totalToCreate === 1 ? "" : "s"} will be created.
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button
                  variant="primary"
                  disabled={totalToCreate === 0 || createMutation.isPending}
                  onClick={handleConfirm}
                >
                  {createMutation.isPending ? "Configuring…" : `Configure ${totalToCreate} linear${totalToCreate === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Delete Linear modal (Empty semantics) ────────────────────────────────────

function DeleteLinearModal({
  open,
  onClose,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  selected: ResolvedChannel[];
}) {
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [results, setResults] = useState<LinearBatchResult[] | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const clearMutation = useBatchLinearClear();

  const isActiveLinear = (l: EnigmaLinear) => l.name !== null;
  const baseStats = useMemo(() => countByTag(selected, isActiveLinear), [selected]);
  const groups = useMemo(
    () => filterChannelsLinears(selected, activeTags, isActiveLinear),
    [selected, activeTags]
  );
  const totalToEmpty = groups.reduce((n, ch) => n + ch.linears.length, 0);
  const totalPods = groups.reduce((n, ch) => n + ch.linears.reduce((m, l) => m + l.pods.length, 0), 0);
  const canConfirm = confirmText === "Empty" && totalToEmpty > 0;

  function toggleTag(t: string) {
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function handleClose() {
    setActiveTags([]);
    setConfirmText("");
    setResults(null);
    onClose();
  }

  async function handleConfirm() {
    const inputs = groups.flatMap((ch) =>
      ch.linears.map((l) => ({
        linearId: l.id,
        linearName: l.name,
        channelId: ch.id,
        channelName: ch.name,
        tags: l.tags ?? [],
      }))
    );
    const res = await clearMutation.mutateAsync(inputs);
    setResults(res);
    setConfirmText("");
  }

  async function handleRetry() {
    if (!results) return;
    const failed = results.filter((r) => r.status === "error");
    if (failed.length === 0) return;
    setIsRetrying(true);
    try {
      const retryRes = await clearMutation.mutateAsync(failed);
      const retryMap = new Map(retryRes.map((r) => [r.linearId, r]));
      setResults((prev) => prev?.map((r) => retryMap.get(r.linearId) ?? r) ?? retryRes);
    } finally {
      setIsRetrying(false);
    }
  }

  const hasFailures = results?.some((r) => r.status === "error");

  return (
    <Modal open={open} onClose={handleClose} title="Empty Linears" size="lg">
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {results ? (
          <>
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {results.map((r) => <ResultLinearRow key={r.linearId} result={r} />)}
            </div>
            <div className="flex justify-end gap-2">
              {hasFailures && (
                <Button variant="secondary" onClick={handleRetry} disabled={isRetrying || clearMutation.isPending}>
                  {isRetrying ? "Retrying…" : `Retry ${results.filter((r) => r.status === "error").length} failed`}
                </Button>
              )}
              <Button variant="secondary" onClick={handleClose}>Close</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clears the linear name on each linear below. Pods and encoders stay attached to the channel.
            </p>
            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Channels" value={groups.length} tone="brand" />
              <StatTile label="To empty" value={totalToEmpty} tone="danger" />
              <StatTile label="Pods preserved" value={totalPods} />
              <StatTile label="Reversible?" value="Yes" tone="ok" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
              <TagFilterBar
                activeTags={activeTags}
                onToggle={toggleTag}
                onAll={() => setActiveTags([])}
                counts={baseStats.counts}
                total={baseStats.total}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 dark:bg-slate-800/50 dark:border-slate-700">
              <div className="border-b border-slate-200 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Linears that will be emptied
              </div>
              <div className="max-h-64 overflow-y-auto">
                {groups.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">
                    {activeTags.length > 0
                      ? `No active linears tagged "${activeTags.join(", ")}" in the selected channels.`
                      : "No active linears in the selected channels."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {groups.map((ch) => (
                      <div key={ch.id}>
                        <ChannelGroupHeader channel={ch} count={ch.linears.length} />
                        <div className="space-y-1.5 px-3 py-2">
                          {ch.linears.map((l) => (
                            <LinearTreeBlock
                              key={l.id}
                              linear={l}
                              override={
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                  will be emptied
                                </span>
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2L14 13H2L8 2Z" /><line x1="8" y1="7" x2="8" y2="10" /><circle cx="8" cy="12" r="0.5" fill="currentColor" />
              </svg>
              <span>This nulls each linear&apos;s name. Pods and encoders are preserved, so the slot stays available for a future Create Linear.</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-800 dark:bg-slate-700 dark:text-slate-200">Empty</code>
                <span className="text-slate-500 dark:text-slate-400">to confirm</span>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="!w-28 !py-1.5 !text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button
                  variant="danger"
                  disabled={!canConfirm || clearMutation.isPending}
                  onClick={handleConfirm}
                >
                  {clearMutation.isPending
                    ? "Clearing…"
                    : `Clear ${totalToEmpty} linear${totalToEmpty === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Main BatchActionBar ──────────────────────────────────────────────────────

type ActiveModal = ActionType | "create" | "delete" | null;

export function BatchActionBar({ selected }: { selected: ResolvedChannel[] }) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const canLinearActions = usePermission([PERMISSIONS.LINEAR_ACTIONS]);
  const canManageLinears = usePermission([PERMISSIONS.LIVE_MANAGE_LINEARS]);

  const summary = useMemo(() => rollupCounts(selected), [selected]);

  if ((!canLinearActions && !canManageLinears) || selected.length === 0) return null;

  function openModal(m: ActiveModal) {
    setActiveModal(m);
  }
  function closeModal() {
    setActiveModal(null);
  }

  return (
    <>
      {/* Floating batch bar */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
            {selected.length}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {selected.length} channel{selected.length === 1 ? "" : "s"} selected
            </span>
            <span className="text-[10.5px] text-slate-400">
              <b className="text-slate-600 dark:text-slate-300">{summary.linears}</b> linears
              {" · "}
              <b className="text-slate-600 dark:text-slate-300">{summary.pods}</b> pods
              {" · "}
              <b className="text-slate-600 dark:text-slate-300">{summary.encoders}</b> encoders
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {canLinearActions && (
          <>
            <button
              onClick={() => openModal("sync")}
              className="inline-flex items-center whitespace-nowrap rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
            >
              Synchronize
            </button>
            <button
              onClick={() => openModal("clean")}
              className="inline-flex items-center whitespace-nowrap rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-700/40 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-amber-500/10"
            >
              Clean Channels
            </button>
          </>
        )}

        {canLinearActions && canManageLinears && (
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
        )}

        {canManageLinears && (
          <>
            <button
              onClick={() => openModal("create")}
              className="inline-flex items-center whitespace-nowrap rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
            >
              Configure Linears
            </button>
            <button
              onClick={() => openModal("delete")}
              className="inline-flex items-center whitespace-nowrap rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/40 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              Clear Linears
            </button>
          </>
        )}
      </div>

      {/* Modals */}
      <ImpactModal
        open={activeModal === "sync" || activeModal === "clean"}
        onClose={closeModal}
        action={activeModal === "sync" || activeModal === "clean" ? activeModal : null}
        selected={selected}
      />
      <CreateLinearModal
        open={activeModal === "create"}
        onClose={closeModal}
        selected={selected}
      />
      <DeleteLinearModal
        open={activeModal === "delete"}
        onClose={closeModal}
        selected={selected}
      />
    </>
  );
}
