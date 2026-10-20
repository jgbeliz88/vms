"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ResolvedChannel, MediaexcelChannel, EnigmaLinear, EnigmaLinearPod } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useDeleteLinear, useClearLinear, useConfigureLinear } from "@/features/live/hooks";
import type { AddLinearData } from "./ActionConfirmModal";
import { AVAILABLE_TAGS, TagChip } from "@/components/ui/TagChip";
import { useToast } from "@/components/ui/Toast";
import { byEncoder, channelForPod, CheckBox, knownTags, podPayload } from "./linear-ui";
import { EditLinearModal } from "./EditLinearModal";

// ── Types ────────────────────────────────────────────────────────────────────

type FormFields = {
  linearName: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
  tags: string[];
};

const DEFAULT_FORM: FormFields = {
  linearName: "",
  drm: false,
  adsReplacement: false,
  fragmentLength: "",
  disableDrmManifests: false,
  drmVendor: "",
  contentId: "",
  tags: [...AVAILABLE_TAGS],
};

// ── Icons ────────────────────────────────────────────────────────────────────

function IconLinear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3.5 w-3.5"} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8" />
      <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

function IconPod({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3.5 w-3.5"} aria-hidden>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function IconEncoder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3.5 w-3.5"} aria-hidden>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <circle cx="7" cy="7.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="16.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3 w-3"} aria-hidden>
      <polyline points="5,6 8,9 11,6" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className ?? "h-3 w-3"} aria-hidden>
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function IconEraser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3 w-3"} aria-hidden>
      <path d="M2.5 13.5h11" />
      <path d="M9.5 2.5l4 4-6 6-4-4z" />
      <path d="M3.5 10.5l2 2" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3 w-3"} aria-hidden>
      <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1L11 4" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3 w-3"} aria-hidden>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function IconWarn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3 w-3"} aria-hidden>
      <path d="M8 2L14.5 14H1.5L8 2z" />
      <line x1="8" y1="7" x2="8" y2="10" />
      <circle cx="8" cy="12" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Atoms ────────────────────────────────────────────────────────────────────

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "cleared" }) {
  const tones = {
    default: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40",
    cleared: "bg-slate-50 text-slate-400 border-slate-200 border-dashed dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", tones[tone])}>
      {children}
    </span>
  );
}

function GhostBtn({
  children,
  tone = "default",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "danger" | "brand" | "brand-hover";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const tones = {
    default: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800",
    warn: "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-amber-700/40 dark:hover:bg-amber-900/20 dark:hover:text-amber-400",
    danger: "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-800/40 dark:hover:bg-rose-900/20 dark:hover:text-rose-400",
    "brand-hover": "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300",
    brand: "border-brand-200 bg-white text-brand-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-brand-800/40 dark:bg-slate-900 dark:text-brand-400 dark:hover:border-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40",
        tones[tone]
      )}
    >
      {children}
    </button>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── Pod picker ───────────────────────────────────────────────────────────────

function PodPickerField({
  mediaexcelChannels,
  selected,
  onChange,
  showValidation,
  existingPodNames,
}: {
  mediaexcelChannels: MediaexcelChannel[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  showValidation: boolean;
  existingPodNames: Set<string>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setPickerOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [pickerOpen]);

  const togglePod = (pod: string) => {
    const next = new Set(selected);
    if (next.has(pod)) { next.delete(pod); } else { next.add(pod); }
    onChange(next);
  };

  const totalPods = mediaexcelChannels.reduce((n, c) => n + c.pods.length, 0);

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

  const selectedGrouped = useMemo(() => {
    const byEnc = new Map<string, Map<string, string[]>>();
    selected.forEach((pod) => {
      const ch = channelForPod(pod, mediaexcelChannels);
      const enc = ch?.encoderName ?? "Other";
      const chName = ch?.name ?? "Unknown";
      if (!byEnc.has(enc)) byEnc.set(enc, new Map());
      const chMap = byEnc.get(enc)!;
      if (!chMap.has(chName)) chMap.set(chName, []);
      chMap.get(chName)!.push(pod);
    });
    return Array.from(byEnc.entries()).map(([enc, chMap]) => ({
      encoderName: enc,
      channels: Array.from(chMap.entries()).map(([name, pods]) => ({ name, pods })),
    }));
  }, [selected, mediaexcelChannels]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Pods</span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className="text-[10px] font-medium text-slate-500 hover:text-slate-700 hover:underline dark:hover:text-slate-300"
          >
            Clear all
          </button>
        )}
      </div>

      <div className={cn(
        "rounded-md border bg-white p-1.5 dark:bg-slate-900",
        showValidation && selected.size === 0 ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
      )}>
        {selected.size === 0 ? (
          <div className="px-1 py-1 text-[11px] italic text-slate-400 dark:text-slate-500">No pods selected.</div>
        ) : (
          <div className="space-y-1.5 mb-1.5">
            {selectedGrouped.map((g) => (
              <div key={g.encoderName} className="rounded-md bg-slate-50 p-1.5 dark:bg-slate-800/60">
                <div className="mb-1 inline-flex items-center gap-1 px-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <IconEncoder className="h-2.5 w-2.5 text-slate-400" />
                  {g.encoderName}
                </div>
                <div className="space-y-1">
                  {g.channels.map((c) => (
                    <div key={c.name} className="flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">{c.name} ·</span>
                      {c.pods.map((pod) => (
                        <span
                          key={pod}
                          className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 py-0.5 pl-2 pr-1 font-mono text-[11px] text-brand-800 dark:bg-brand-500/20 dark:text-brand-300"
                        >
                          {pod}
                          {existingPodNames.has(pod) && <IconWarn className="h-3 w-3 text-amber-500 shrink-0" />}
                          <button
                            type="button"
                            onClick={() => togglePod(pod)}
                            className="grid h-3.5 w-3.5 place-items-center rounded text-brand-500 hover:bg-brand-500/20 dark:text-brand-400"
                            aria-label={`Remove ${pod}`}
                          >
                            <svg width="8" height="8" viewBox="0 0 8 8">
                              <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className={cn(
              "flex w-full items-center justify-between rounded-md border border-dashed px-2 py-1.5 text-[11px] transition-colors",
              pickerOpen
                ? "border-brand-500 bg-brand-500/5 text-brand-600 dark:text-brand-400"
                : "border-slate-300 text-slate-500 hover:border-brand-500 hover:text-brand-600 dark:border-slate-600 dark:hover:border-brand-400 dark:hover:text-brand-400"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11">
                <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {selected.size === 0 ? "Add pods…" : "Add or change pods"}
            </span>
            <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
              {selected.size} / {totalPods}
            </span>
          </button>

          {pickerOpen && (
            <div
              ref={popRef}
              className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 p-1.5 dark:border-slate-800">
                <div className="relative">
                  <svg width="12" height="12" viewBox="0 0 12 12"
                    className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <circle cx="5" cy="5" r="3.5" stroke="currentColor" fill="none" strokeWidth="1.2" />
                    <path d="M7.5 7.5l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search encoder, channel, or pod…"
                    className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-[11px] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                    No matches for &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const podsInEnc = group.channels.flatMap((c) => c.pods);
                    const selInEnc = podsInEnc.filter((p) => selected.has(p)).length;
                    return (
                      <div key={group.encoderName} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-100 px-2 py-1.5 dark:bg-slate-800">
                          <IconEncoder className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                          <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                            {group.encoderName}
                          </span>
                          <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                            {selInEnc}/{podsInEnc.length}
                          </span>
                        </div>

                        {group.channels.map((ch) => {
                          const allCh = ch.pods.every((p) => selected.has(p));
                          const someCh = !allCh && ch.pods.some((p) => selected.has(p));
                          const chState = allCh ? "checked" : someCh ? "indeterminate" : "off";
                          return (
                            <div key={ch.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(selected);
                                  ch.pods.forEach((p) => allCh ? next.delete(p) : next.add(p));
                                  onChange(next);
                                }}
                                className="flex w-full items-center gap-2 bg-slate-50 px-2 py-1 pl-6 text-left hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800"
                              >
                                <CheckBox state={chState} />
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{ch.name}</span>
                              </button>
                              {ch.pods.map((pod) => {
                                const checked = selected.has(pod);
                                const isDuplicate = existingPodNames.has(pod);
                                return (
                                  <button
                                    key={pod}
                                    type="button"
                                    onClick={() => togglePod(pod)}
                                    className="flex w-full items-center gap-2 px-2 py-1 pl-12 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                  >
                                    <CheckBox state={checked ? "checked" : "off"} />
                                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 flex-1">{pod}</span>
                                    {isDuplicate && (
                                      <span className="text-[9px] text-amber-500 font-medium">has linear</span>
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

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] dark:border-slate-800 dark:bg-slate-900">
                <span className="tabular-nums text-slate-500 dark:text-slate-400">{selected.size} selected</span>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pod row ───────────────────────────────────────────────────────────────────

function PodRow({ pod, expanded, onToggle }: { pod: EnigmaLinearPod; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="py-0.5">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-white dark:hover:bg-slate-800/60"
      >
        <IconChevron className={cn("h-3 w-3 text-slate-400 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
        <IconPod className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">pod</span>
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{pod.name}</span>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {pod.status}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <IconEncoder className="h-2.5 w-2.5" />
          {pod.encoders.length}
        </span>
      </button>

      {expanded && (
        <div className="ml-5 border-l border-dashed border-slate-200 pl-3 dark:border-slate-700">
          {pod.encoders.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-md px-1.5 py-0.5 text-[11px] hover:bg-white dark:hover:bg-slate-800/60">
              <span className="select-none text-slate-300 dark:text-slate-600">•</span>
              <IconEncoder className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">encoder</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{e.name}</span>
              <span className="text-slate-400 dark:text-slate-500">· {e.heroName}</span>
              <span className="text-slate-400 dark:text-slate-500">· {e.deviceId}.{e.channelIndex}.{e.id}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LinearsSection({
  channel,
  mediaexcelChannels,
  linkedByPod,
  onCreateLinear,
}: {
  channel: ResolvedChannel;
  mediaexcelChannels: MediaexcelChannel[];
  linkedByPod: Map<string, string>;
  onCreateLinear: (data: AddLinearData) => Promise<void>;
}) {
  const canManageLinears = usePermission([PERMISSIONS.LIVE_MANAGE_LINEARS]);
  const { notify } = useToast();
  const deleteLinear = useDeleteLinear();
  const clearLinear = useClearLinear();
  const configureLinear = useConfigureLinear();

  // Create form state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPods, setSelectedPods] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormFields>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Configure form state (for cleared linears)
  const [configuringLinear, setConfiguringLinear] = useState<EnigmaLinear | null>(null);
  const [configForm, setConfigForm] = useState<FormFields>(DEFAULT_FORM);
  const [configuring, setConfiguring] = useState(false);
  const [showConfigValidation, setShowConfigValidation] = useState(false);

  // Edit linear (tags + pods) state
  const [editingLinear, setEditingLinear] = useState<EnigmaLinear | null>(null);

  // Tree state
  const [expandedPods, setExpandedPods] = useState<Set<number>>(new Set());

  // Confirmation modal state
  const [pendingAction, setPendingAction] = useState<{ type: "clear" | "delete"; linear: EnigmaLinear } | null>(null);
  const isMutating = deleteLinear.isPending || clearLinear.isPending;

  const set = <K extends keyof FormFields>(key: K, value: FormFields[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setConfigField = <K extends keyof FormFields>(key: K, value: FormFields[K]) =>
    setConfigForm((prev) => ({ ...prev, [key]: value }));

  const existingPodNames = useMemo(
    () => new Set(channel.pods.filter((p) => p.linear?.linearName).map((p) => p.name)),
    [channel.pods]
  );

  const duplicatePods = useMemo(
    () => [...selectedPods].filter((p) => existingPodNames.has(p)),
    [selectedPods, existingPodNames]
  );

  const formValid = selectedPods.size > 0 && form.linearName.trim() !== "" && form.fragmentLength.trim() !== "";

  function openCreate() {
    setForm(DEFAULT_FORM);
    setShowValidation(false);
    setSelectedPods(new Set());
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setSelectedPods(new Set());
    setForm(DEFAULT_FORM);
    setShowValidation(false);
  }

  function openConfigure(linear: EnigmaLinear) {
    setConfigForm(DEFAULT_FORM);
    setShowConfigValidation(false);
    setConfiguringLinear(linear);
  }

  function closeConfigure() {
    setConfiguringLinear(null);
    setConfigForm(DEFAULT_FORM);
    setShowConfigValidation(false);
  }

  const handleCreate = async () => {
    if (!formValid) { setShowValidation(true); return; }
    if (duplicatePods.length > 0) return;
    setCreating(true);
    try {
      const pods = [...selectedPods].map((podName) => podPayload(podName, mediaexcelChannels));
      await onCreateLinear({
        pods,
        linearName: form.linearName,
        drm: form.drm,
        adsReplacement: form.adsReplacement,
        fragmentLength: form.fragmentLength,
        disableDrmManifests: form.disableDrmManifests,
        drmVendor: form.drmVendor,
        contentId: form.contentId,
        tags: form.tags,
      });
      closeCreate();
    } catch {
      // error toast handled by parent
    } finally {
      setCreating(false);
    }
  };

  const handleConfigure = async () => {
    if (!configuringLinear) return;
    const configValid = configForm.linearName.trim() !== "" && configForm.fragmentLength.trim() !== "";
    if (!configValid) { setShowConfigValidation(true); return; }
    setConfiguring(true);
    try {
      await configureLinear.mutateAsync({
        linearId: configuringLinear.id,
        channelId: channel.id,
        name: configForm.linearName,
        drm: configForm.drm,
        adsReplacement: configForm.adsReplacement,
        fragmentLength: configForm.fragmentLength,
        disableDrmManifests: configForm.disableDrmManifests,
        drmVendor: configForm.drmVendor,
        contentId: configForm.contentId,
        tags: configForm.tags,
      });
      closeConfigure();
    } catch (error) {
      notify({
        title: "Configure failed",
        description: error instanceof Error ? error.message : "Unable to configure linear",
        variant: "error",
      });
    } finally {
      setConfiguring(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === "delete") {
        await deleteLinear.mutateAsync(pendingAction.linear.id);
      } else {
        await clearLinear.mutateAsync(pendingAction.linear.id);
      }
    } catch (error) {
      notify({
        title: pendingAction.type === "delete" ? "Delete failed" : "Clear failed",
        description: error instanceof Error ? error.message : "Operation failed",
        variant: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  function togglePod(podId: number) {
    setExpandedPods((prev) => {
      const next = new Set(prev);
      if (next.has(podId)) { next.delete(podId); } else { next.add(podId); }
      return next;
    });
  }

  const isCleared = (linear: EnigmaLinear) => linear.name === null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Linears</div>
          <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
            {channel.linears.length} {channel.linears.length === 1 ? "linear" : "linears"} · linear → pods → encoders
          </div>
        </div>
        {canManageLinears && (
          <button
            onClick={() => createOpen ? closeCreate() : openCreate()}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand-600"
            disabled={configuring}
          >
            <IconPlus className="h-3 w-3" />
            {createOpen ? "Cancel" : "Add linear"}
          </button>
        )}
      </div>

      {/* Create form */}
      {canManageLinears && createOpen && (
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">New Linear</div>

            <PodPickerField
              mediaexcelChannels={mediaexcelChannels}
              selected={selectedPods}
              onChange={(next) => { setSelectedPods(next); setShowValidation(false); }}
              showValidation={showValidation}
              existingPodNames={existingPodNames}
            />

            {duplicatePods.length > 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
                {duplicatePods.length === 1
                  ? `Pod "${duplicatePods[0]}" already has a linear. Delete it first or deselect this pod.`
                  : `${duplicatePods.length} selected pods already have a linear. Delete them first or deselect.`}
              </p>
            )}

            <FormRow label="Linear Name">
              <Input
                value={form.linearName}
                placeholder="e.g. linear08"
                onChange={(e) => { set("linearName", e.target.value); setShowValidation(false); }}
                error={showValidation && !form.linearName.trim() ? "Required" : undefined}
              />
            </FormRow>

            <FormRow label="Fragment Length">
              <Input
                value={form.fragmentLength}
                placeholder="e.g. 48/25"
                onChange={(e) => { set("fragmentLength", e.target.value); setShowValidation(false); }}
                error={showValidation && !form.fragmentLength.trim() ? "Required" : undefined}
              />
            </FormRow>

            <FormRow label="DRM">
              <div className="flex justify-end">
                <Toggle checked={form.drm} onChange={(v) => set("drm", v)} />
              </div>
            </FormRow>

            <FormRow label="Ads Replacement">
              <div className="flex justify-end">
                <Toggle checked={form.adsReplacement} onChange={(v) => set("adsReplacement", v)} />
              </div>
            </FormRow>

            <FormRow label="Disable DRM Manifests">
              <div className="flex justify-end">
                <Toggle checked={form.disableDrmManifests} onChange={(v) => set("disableDrmManifests", v)} />
              </div>
            </FormRow>

            {form.drm && (
              <>
                <FormRow label="DRM Vendor">
                  <Input
                    value={form.drmVendor}
                    placeholder="e.g. kms"
                    onChange={(e) => set("drmVendor", e.target.value)}
                  />
                </FormRow>
                <FormRow label="Content ID">
                  <Input
                    value={form.contentId}
                    placeholder="e.g. premium"
                    onChange={(e) => set("contentId", e.target.value)}
                  />
                </FormRow>
              </>
            )}

            <FormRow label="Tags">
              <div className="flex justify-end gap-3">
                {AVAILABLE_TAGS.map((tag) => (
                  <label key={tag} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.tags, tag]
                          : form.tags.filter((t) => t !== tag);
                        set("tags", next);
                      }}
                      className="rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-slate-600"
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </FormRow>

            {showValidation && !formValid && (
              <p className="text-xs text-rose-600 dark:text-rose-400">Please fill in all required fields before confirming.</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedPods.size === 0
                  ? "Select at least one pod."
                  : selectedPods.size === 1
                  ? "1 linear will be created with 1 pod."
                  : `1 linear will be created with ${selectedPods.size} pods.`}
              </span>
              <Button
                onClick={handleCreate}
                disabled={creating || duplicatePods.length > 0}
                className="text-xs"
              >
                {creating ? "Creating…" : selectedPods.size <= 1 ? "Create Linear" : `Create ${selectedPods.size} Linears`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="p-3">
        {channel.linears.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No linears configured.</p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2 font-mono text-[12px] dark:border-slate-700 dark:bg-slate-950/40">
            {channel.linears.map((linear, i) => {
              const cleared = isCleared(linear);
              return (
                <div key={linear.id} className={i > 0 ? "mt-2 border-t border-slate-200 pt-2 dark:border-slate-700" : ""}>
                  {/* Linear row */}
                  <div className="flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-white dark:hover:bg-slate-800/60">
                    <span className="mt-0.5 select-none text-slate-300 dark:text-slate-600">▸</span>
                    <IconLinear className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cleared ? "text-slate-300 dark:text-slate-600" : "text-brand-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">linear</span>
                        {cleared
                          ? <span className="italic text-slate-400 dark:text-slate-500">null</span>
                          : <span className="font-semibold text-slate-900 dark:text-slate-100">{linear.name}</span>}
                        {cleared
                          ? <Pill tone="cleared">cleared</Pill>
                          : <Pill tone="success">active</Pill>}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">· {linear.pods.length} {linear.pods.length === 1 ? "pod" : "pods"}</span>
                      </div>
                      {!cleared && (
                        <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          drm:{linear.drm} · ads:{linear.adsReplacement} · frag:{linear.fragmentLength}
                          {linear.drmVendor && <> · vendor:{linear.drmVendor}</>}
                        </div>
                      )}
                      {knownTags(linear).length > 0 ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {knownTags(linear).map((t) => <TagChip key={t} tag={t} />)}
                        </div>
                      ) : !cleared && (
                        <div className="mt-1 text-[10px] italic text-slate-400 dark:text-slate-500">no tags</div>
                      )}
                    </div>
                    {canManageLinears && (
                      <div className="flex shrink-0 items-center gap-1">
                        {cleared ? (
                          <GhostBtn tone="brand" onClick={() => openConfigure(linear)}>
                            <IconPlus className="h-3 w-3" /> Configure
                          </GhostBtn>
                        ) : (
                          <>
                            <GhostBtn tone="brand-hover" onClick={() => setEditingLinear(linear)}>
                              <IconPencil className="h-3 w-3" /> Edit
                            </GhostBtn>
                            <GhostBtn tone="warn" onClick={() => setPendingAction({ type: "clear", linear })} disabled={isMutating}>
                              <IconEraser className="h-3 w-3" /> Clear
                            </GhostBtn>
                            <GhostBtn tone="danger" onClick={() => setPendingAction({ type: "delete", linear })} disabled={isMutating}>
                              <IconTrash className="h-3 w-3" /> Delete
                            </GhostBtn>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pods */}
                  {linear.pods.length > 0 && (
                    <div className="ml-5 mt-0.5 border-l border-dashed border-slate-200 pl-3 dark:border-slate-700">
                      {linear.pods.map((pod) => (
                        <PodRow
                          key={pod.id}
                          pod={pod}
                          expanded={expandedPods.has(pod.id)}
                          onToggle={() => togglePod(pod.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configure Linear modal */}
      <Modal
        open={configuringLinear !== null}
        onClose={() => { if (!configuring) closeConfigure(); }}
        title="Configure linear"
        size="md"
      >
        {configuringLinear && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Activate linear{" "}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                #{configuringLinear.id}
              </span>{" "}
              with configuration data.
            </p>

            <FormRow label="Linear Name">
              <Input
                value={configForm.linearName}
                placeholder="e.g. linear08"
                onChange={(e) => { setConfigField("linearName", e.target.value); setShowConfigValidation(false); }}
                error={showConfigValidation && !configForm.linearName.trim() ? "Required" : undefined}
              />
            </FormRow>

            <FormRow label="Fragment Length">
              <Input
                value={configForm.fragmentLength}
                placeholder="e.g. 48/25"
                onChange={(e) => { setConfigField("fragmentLength", e.target.value); setShowConfigValidation(false); }}
                error={showConfigValidation && !configForm.fragmentLength.trim() ? "Required" : undefined}
              />
            </FormRow>

            <FormRow label="DRM">
              <div className="flex justify-end">
                <Toggle checked={configForm.drm} onChange={(v) => setConfigField("drm", v)} />
              </div>
            </FormRow>

            <FormRow label="Ads Replacement">
              <div className="flex justify-end">
                <Toggle checked={configForm.adsReplacement} onChange={(v) => setConfigField("adsReplacement", v)} />
              </div>
            </FormRow>

            <FormRow label="Disable DRM Manifests">
              <div className="flex justify-end">
                <Toggle checked={configForm.disableDrmManifests} onChange={(v) => setConfigField("disableDrmManifests", v)} />
              </div>
            </FormRow>

            {configForm.drm && (
              <>
                <FormRow label="DRM Vendor">
                  <Input
                    value={configForm.drmVendor}
                    placeholder="e.g. kms"
                    onChange={(e) => setConfigField("drmVendor", e.target.value)}
                  />
                </FormRow>
                <FormRow label="Content ID">
                  <Input
                    value={configForm.contentId}
                    placeholder="e.g. premium"
                    onChange={(e) => setConfigField("contentId", e.target.value)}
                  />
                </FormRow>
              </>
            )}

            <FormRow label="Tags">
              <div className="flex justify-end gap-3">
                {AVAILABLE_TAGS.map((tag) => (
                  <label key={tag} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={configForm.tags.includes(tag)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...configForm.tags, tag]
                          : configForm.tags.filter((t) => t !== tag);
                        setConfigField("tags", next);
                      }}
                      className="rounded border-slate-300 text-brand-500 focus:ring-brand-500 dark:border-slate-600"
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </FormRow>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={closeConfigure} disabled={configuring}>Cancel</Button>
              <Button onClick={handleConfigure} disabled={configuring}>
                {configuring ? "Configuring…" : "Configure"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit linear modal */}
      {editingLinear && (
        <EditLinearModal
          key={editingLinear.id}
          linear={editingLinear}
          channel={channel}
          mediaexcelChannels={mediaexcelChannels}
          linkedByPod={linkedByPod}
          onClose={() => setEditingLinear(null)}
        />
      )}

      {/* Confirmation modal */}
      <Modal
        open={pendingAction !== null}
        onClose={() => { if (!isMutating) setPendingAction(null); }}
        title={pendingAction?.type === "clear" ? "Clear linear" : "Delete linear"}
        size="md"
      >
        {pendingAction?.type === "clear" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clear{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                {pendingAction.linear.name}
              </span>
              ? The linear data will be nulled out but its pods will be preserved.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={isMutating}>Cancel</Button>
              <button
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
                onClick={handleConfirmAction}
                disabled={isMutating}
              >
                {isMutating ? "Clearing…" : "Clear"}
              </button>
            </div>
          </div>
        )}
        {pendingAction?.type === "delete" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Delete{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                {pendingAction.linear.name}
              </span>
              ? This will permanently remove the linear and all its pod relationships.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={isMutating}>Cancel</Button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                onClick={handleConfirmAction}
                disabled={isMutating}
              >
                {isMutating ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
