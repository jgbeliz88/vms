"use client";

import { useState } from "react";
import { ResolvedChannel, ResolvedPod, Encoder } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/utils/cn";
import type { AddLinearData } from "./ActionConfirmModal";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { Modal } from "@/components/ui/Modal";

const DEFAULT_FORM: AddLinearData = {
  encoderId: 0,
  podId: 0,
  podName: "",
  linearName: "",
  drm: false,
  adsReplacement: false,
  fragmentLength: "",
  disableDrmManifests: false,
  drmVendor: "",
  contentId: "",
};

type ConfigureForm = {
  linearName: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

const DEFAULT_CONFIGURE_FORM: ConfigureForm = {
  linearName: "",
  drm: false,
  adsReplacement: false,
  fragmentLength: "",
  disableDrmManifests: false,
  drmVendor: "",
  contentId: "",
};

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

function IconPod({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3.5 w-3.5"} aria-hidden>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function IconLinear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-3.5 w-3.5"} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8" />
      <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

function IconUnlink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-4 w-4"} aria-hidden>
      <path d="M6.5 9.5l-1.5 1.5a2.121 2.121 0 0 0 3 3l2-2a2.121 2.121 0 0 0-1-3.6" />
      <path d="M9.5 6.5l1.5-1.5a2.121 2.121 0 0 0-3-3l-2 2a2.121 2.121 0 0 0 1 3.6" />
      <line x1="3" y1="3" x2="3.5" y2="4.5" />
      <line x1="13" y1="13" x2="12.5" y2="11.5" />
    </svg>
  );
}

function IconEraser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-4 w-4"} aria-hidden>
      <path d="M2.5 13.5h11" />
      <path d="M9.5 2.5l4 4-6 6-4-4z" />
      <path d="M3.5 10.5l2 2" />
    </svg>
  );
}

function IconWarn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className ?? "h-4 w-4"} aria-hidden>
      <path d="M8 2L14.5 14H1.5L8 2z" />
      <line x1="8" y1="7" x2="8" y2="10" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className ?? "h-4 w-4"} aria-hidden>
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
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

function MetaBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        on
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      )}
    >
      {label}
    </span>
  );
}

export function LinearsPanel({
  channel,
  encoders,
  onCreateLinear,
  onDeleteLinear,
  onDeletePod,
}: {
  channel: ResolvedChannel;
  encoders: Encoder[];
  onCreateLinear: (data: AddLinearData) => Promise<void>;
  onDeleteLinear: (pod: ResolvedPod, linearName: string) => Promise<void>;
  onDeletePod: (pod: ResolvedPod, linearName: string | null) => Promise<void>;
}) {
  const canManageLinears = usePermission([ROLES.ADMIN]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<AddLinearData>(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deletingPodKey, setDeletingPodKey] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { type: "unlink-pod"; pod: ResolvedPod }
    | { type: "delete-linear"; pod: ResolvedPod; linearName: string }
    | null
  >(null);

  const [configurePodId, setConfigurePodId] = useState<number | null>(null);
  const [configureForm, setConfigureForm] = useState<ConfigureForm>(DEFAULT_CONFIGURE_FORM);
  const [configuring, setConfiguring] = useState(false);
  const [showConfigureValidation, setShowConfigureValidation] = useState(false);

  const set = <K extends keyof AddLinearData>(key: K, value: AddLinearData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedEncoder = encoders.find((e) => e.id === form.encoderId) ?? null;
  const podOptions = selectedEncoder?.pods ?? [];
  const selectedPod = podOptions.find((p) => p.id === form.podId) ?? null;
  const duplicatePod =
    selectedPod !== null &&
    channel.pods.some((p) => p.name === selectedPod.name && p.linear !== null && p.linear.linearName !== null);

  const formValid =
    form.encoderId !== 0 &&
    form.podId !== 0 &&
    form.linearName.trim() !== "" &&
    form.fragmentLength.trim() !== "";

  const grouped: Record<string, typeof channel.pods> = {};
  for (const pod of channel.pods) {
    if (!grouped[pod.encoderName]) grouped[pod.encoderName] = [];
    grouped[pod.encoderName].push(pod);
  }

  const handleCreate = async () => {
    if (!formValid) {
      setShowValidation(true);
      return;
    }
    if (duplicatePod) return;
    setCreating(true);
    try {
      await onCreateLinear(form);
      setCreateOpen(false);
      setForm(DEFAULT_FORM);
      setShowValidation(false);
    } catch {
      // error toast handled by parent
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (pod: ResolvedPod, linearName: string) => {
    const key = `${pod.name}/${linearName}`;
    setDeletingKey(key);
    try {
      await onDeleteLinear(pod, linearName);
      setPendingAction(null);
    } catch {
      // error toast handled by parent
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDeletePod = async (pod: ResolvedPod) => {
    const key = pod.name;
    setDeletingPodKey(key);
    try {
      await onDeletePod(pod, pod.linear?.linearName ?? null);
      setPendingAction(null);
    } catch {
      // error toast handled by parent
    } finally {
      setDeletingPodKey(null);
    }
  };

  const setConfig = <K extends keyof ConfigureForm>(key: K, value: ConfigureForm[K]) =>
    setConfigureForm((prev) => ({ ...prev, [key]: value }));

  const configureFormValid =
    configureForm.linearName.trim() !== "" && configureForm.fragmentLength.trim() !== "";

  const handleConfigure = async (pod: ResolvedPod) => {
    if (!configureFormValid) {
      setShowConfigureValidation(true);
      return;
    }
    setConfiguring(true);
    try {
      await onCreateLinear({
        encoderId: pod.encoderId,
        podId: pod.id,
        podName: pod.name,
        ...configureForm,
      });
      setConfigurePodId(null);
      setConfigureForm(DEFAULT_CONFIGURE_FORM);
      setShowConfigureValidation(false);
    } catch {
      // error toast handled by parent
    } finally {
      setConfiguring(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Linears</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            Pipeline view · encoder → pod → linear
          </div>
        </div>
        {canManageLinears && (
          <Button
            variant={createOpen ? "secondary" : "primary"}
            className="text-xs"
            onClick={() => {
              setCreateOpen((o) => !o);
              setForm(DEFAULT_FORM);
              setShowValidation(false);
            }}
          >
            {createOpen ? "Cancel" : "+ Add linear"}
          </Button>
        )}
      </div>

      {/* Pipeline view */}
      {channel.pods.length === 0 ? (
        <p className="mt-4 text-xs text-slate-400">No linears configured.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {Object.entries(grouped).map(([encoderChannel, pods]) => (
            <div key={encoderChannel}>
              {/* Encoder group header */}
              <div className="flex items-center gap-2 mb-3">
                <IconEncoder className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {encoderChannel}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {pods.length} {pods.length === 1 ? "pod" : "pods"}
                </span>
              </div>

              {/* Flow cards grid */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}
              >
                {pods.map((pod) => {
                  const hasLinear = !!pod.linear?.linearName;
                  const isConfiguringThis = configurePodId === pod.id;
                  const isBusy = deletingKey !== null || deletingPodKey !== null;

                  const drm = pod.linear?.drm === 1;
                  const ads = pod.linear?.adsReplacement === 1;
                  const frag = pod.linear?.fragmentLength ?? null;

                  return (
                    <div
                      key={pod.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                      {/* Flow row: pod node | arrow | linear node */}
                      <div className="grid grid-cols-[1fr_32px_1fr]">
                        {/* Pod node */}
                        <div className="bg-white dark:bg-slate-900 p-3 flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconPod className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                              Pod
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {pod.name}
                          </span>
                          <div className="mt-1">
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-[9px] py-[5px] text-[11px] font-medium text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                              onClick={() => setPendingAction({ type: "unlink-pod", pod })}
                              disabled={isBusy || !canManageLinears}
                            >
                              <IconUnlink className="h-3 w-3" />
                              Unlink pod
                            </button>
                          </div>
                        </div>

                        {/* Arrow column */}
                        <div
                          className={cn(
                            "flex items-center justify-center border-x",
                            hasLinear
                              ? "bg-brand-50 border-brand-100 dark:bg-brand-900/20 dark:border-brand-800/40"
                              : "bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
                          )}
                        >
                          {hasLinear ? (
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 text-brand-500"
                              aria-hidden
                            >
                              <line x1="2" y1="8" x2="12" y2="8" />
                              <polyline points="9,5 12,8 9,11" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeDasharray="2 2"
                              className="h-4 w-4 text-slate-300 dark:text-slate-600"
                              aria-hidden
                            >
                              <line x1="2" y1="8" x2="12" y2="8" />
                              <polyline points="9,5 12,8 9,11" />
                            </svg>
                          )}
                        </div>

                        {/* Linear node */}
                        {hasLinear ? (
                          <div className="p-3 flex flex-col gap-1.5 min-w-0 bg-brand-50/50 dark:bg-brand-900/20">
                            <div className="flex items-center gap-1.5">
                              <IconLinear className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Linear
                              </span>
                            </div>
                            <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-400 truncate">
                              {pod.linear!.linearName}
                            </span>
                            <div className="mt-1">
                              <button
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-[9px] py-[5px] text-[11px] font-medium text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-rose-800 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                onClick={() => setPendingAction({ type: "delete-linear", pod, linearName: pod.linear!.linearName! })}
                                disabled={isBusy || !canManageLinears}
                              >
                                <IconEraser className="h-3 w-3" />
                                Delete linear
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex flex-col gap-1.5 min-w-0 bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-1">
                              <IconWarn className="h-3 w-3 text-amber-500 shrink-0" />
                              <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-500">
                                No linear
                              </span>
                            </div>
                            <span className="text-[11px] italic text-slate-400 dark:text-slate-500">
                              {pod.linear ? "cleared" : "not configured"}
                            </span>
                            {canManageLinears && !isConfiguringThis && (
                              <div className="mt-1">
                                <button
                                  className="inline-flex items-center gap-1 rounded-md border border-brand-200/70 bg-white px-[9px] py-[5px] text-[11px] font-medium text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 dark:border-brand-700/40 dark:bg-slate-800 dark:text-brand-400 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
                                  onClick={() => {
                                    setConfigurePodId(pod.id);
                                    setConfigureForm(DEFAULT_CONFIGURE_FORM);
                                    setShowConfigureValidation(false);
                                  }}
                                  disabled={isBusy}
                                >
                                  <IconPlus className="h-3 w-3" />
                                  Configure
                                </button>
                              </div>
                            )}
                            {!canManageLinears && (
                              <span className="text-xs italic text-slate-400">
                                {pod.linear ? "Cleared" : "no linear"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meta strip */}
                      {pod.linear && (
                        <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                          <MetaBadge label={`DRM: ${drm ? "on" : "off"}`} on={drm} />
                          <MetaBadge label={`Ads: ${ads ? "on" : "off"}`} on={ads} />
                          <MetaBadge label={`Frag: ${frag ?? "—"}`} on={!!frag} />
                        </div>
                      )}

                      {/* Configure inline form */}
                      {isConfiguringThis && (
                        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Configure Linear — {pod.name}
                          </div>
                          <FormRow label="Linear Name">
                            <Input
                              value={configureForm.linearName}
                              placeholder="e.g. linear08"
                              onChange={(e) => {
                                setConfig("linearName", e.target.value);
                                setShowConfigureValidation(false);
                              }}
                              error={showConfigureValidation && !configureForm.linearName.trim() ? "Required" : undefined}
                            />
                          </FormRow>
                          <FormRow label="Fragment Length">
                            <Input
                              value={configureForm.fragmentLength}
                              placeholder="e.g. 48/25"
                              onChange={(e) => {
                                setConfig("fragmentLength", e.target.value);
                                setShowConfigureValidation(false);
                              }}
                              error={showConfigureValidation && !configureForm.fragmentLength.trim() ? "Required" : undefined}
                            />
                          </FormRow>
                          <FormRow label="DRM">
                            <div className="flex justify-end">
                              <Toggle checked={configureForm.drm} onChange={(v) => setConfig("drm", v)} />
                            </div>
                          </FormRow>
                          <FormRow label="Ads Replacement">
                            <div className="flex justify-end">
                              <Toggle checked={configureForm.adsReplacement} onChange={(v) => setConfig("adsReplacement", v)} />
                            </div>
                          </FormRow>
                          <FormRow label="Disable DRM Manifests">
                            <div className="flex justify-end">
                              <Toggle checked={configureForm.disableDrmManifests} onChange={(v) => setConfig("disableDrmManifests", v)} />
                            </div>
                          </FormRow>
                          {configureForm.drm && (
                            <>
                              <FormRow label="DRM Vendor">
                                <Input
                                  value={configureForm.drmVendor}
                                  placeholder="e.g. kms"
                                  onChange={(e) => setConfig("drmVendor", e.target.value)}
                                />
                              </FormRow>
                              <FormRow label="Content ID">
                                <Input
                                  value={configureForm.contentId}
                                  placeholder="e.g. premium"
                                  onChange={(e) => setConfig("contentId", e.target.value)}
                                />
                              </FormRow>
                            </>
                          )}
                          {showConfigureValidation && !configureFormValid && (
                            <p className="text-xs text-rose-600 dark:text-rose-400">
                              Please fill in all required fields before confirming.
                            </p>
                          )}
                          <div className="flex justify-end gap-1.5">
                            <button
                              className="rounded px-2 py-1 text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                              onClick={() => {
                                setConfigurePodId(null);
                                setShowConfigureValidation(false);
                              }}
                              disabled={configuring}
                            >
                              Cancel
                            </button>
                            <button
                              className="rounded px-2 py-1 text-[10px] font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
                              onClick={() => handleConfigure(pod)}
                              disabled={configuring}
                            >
                              {configuring ? "Creating…" : "Create Linear"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {canManageLinears && createOpen && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">New Linear</div>

          <FormRow label="Encoder">
            <select
              value={form.encoderId || ""}
              onChange={(e) => {
                set("encoderId", Number(e.target.value));
                set("podId", 0);
                set("podName", "");
                setShowValidation(false);
              }}
              className={cn(
                "w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-200",
                showValidation && !form.encoderId
                  ? "border-rose-400"
                  : "border-slate-200 dark:border-slate-700"
              )}
            >
              <option value="">Select encoder…</option>
              {encoders.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.encoderChannel} — {e.heroName}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Pod">
            {!form.encoderId ? (
              <span className="text-xs italic text-slate-400">Select an encoder first.</span>
            ) : podOptions.length === 0 ? (
              <span className="text-xs italic text-slate-400">No pods on this encoder.</span>
            ) : (
              <select
                value={form.podId || ""}
                onChange={(e) => {
                  const pod = podOptions.find((p) => p.id === Number(e.target.value));
                  set("podId", Number(e.target.value));
                  set("podName", pod?.name ?? "");
                  setShowValidation(false);
                }}
                className={cn(
                  "w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-200",
                  showValidation && !form.podId
                    ? "border-rose-400"
                    : "border-slate-200 dark:border-slate-700"
                )}
              >
                <option value="">Select pod…</option>
                {podOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </FormRow>

          {duplicatePod && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
              This channel already has a linear for this pod. Delete it first to create a new one.
            </p>
          )}

          <FormRow label="Linear Name">
            <Input
              value={form.linearName}
              placeholder="e.g. linear08"
              onChange={(e) => {
                set("linearName", e.target.value);
                setShowValidation(false);
              }}
              error={showValidation && !form.linearName.trim() ? "Required" : undefined}
            />
          </FormRow>

          <FormRow label="Fragment Length">
            <Input
              value={form.fragmentLength}
              placeholder="e.g. 48/25"
              onChange={(e) => {
                set("fragmentLength", e.target.value);
                setShowValidation(false);
              }}
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
              <Toggle
                checked={form.disableDrmManifests}
                onChange={(v) => set("disableDrmManifests", v)}
              />
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

          {showValidation && !formValid && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Please fill in all required fields before confirming.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={creating || duplicatePod}
              className="text-xs"
            >
              {creating ? "Creating…" : "Create Linear"}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={pendingAction?.type === "unlink-pod" ? "Unlink pod" : "Delete linear"}
        size="md"
      >
        {pendingAction?.type === "unlink-pod" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Remove the reference to{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                {pendingAction.pod.name}
              </span>{" "}
              from this channel? The pod&apos;s linear will also be cleared.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={deletingPodKey !== null}>
                Cancel
              </Button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                onClick={() => handleDeletePod(pendingAction.pod)}
                disabled={deletingPodKey !== null}
              >
                {deletingPodKey !== null ? "Unlinking…" : "Unlink"}
              </button>
            </div>
          </div>
        )}
        {pendingAction?.type === "delete-linear" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clear the linear{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                {pendingAction.linearName}
              </span>{" "}
              from{" "}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                {pendingAction.pod.name}
              </span>
              ? The pod reference will remain.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPendingAction(null)} disabled={deletingKey !== null}>
                Cancel
              </Button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                onClick={() => handleDelete(pendingAction.pod, pendingAction.linearName)}
                disabled={deletingKey !== null}
              >
                {deletingKey !== null ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
