"use client";

import { useState } from "react";
import { ResolvedChannel, ResolvedPod, Encoder } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { AddLinearData } from "./ActionConfirmModal";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";

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
      <div className="flex-1 min-w-0">{children}</div>
    </div>
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
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // Pod-level delete state
  const [confirmDeletePodKey, setConfirmDeletePodKey] = useState<string | null>(null);
  const [deletingPodKey, setDeletingPodKey] = useState<string | null>(null);

  // Configure (re-create linear on an existing pod ref with no linear)
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
    channel.pods.some((p) => p.name === selectedPod.name && p.linear !== null);

  const formValid =
    form.encoderId !== 0 &&
    form.podId !== 0 &&
    form.linearName.trim() !== "" &&
    form.fragmentLength.trim() !== "";

  // Group pods by encoderName (= encoderChannel)
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
    } catch {
      // error toast handled by parent
    } finally {
      setDeletingKey(null);
      setConfirmDeleteKey(null);
    }
  };

  const handleDeletePod = async (pod: ResolvedPod) => {
    const key = pod.name;
    setDeletingPodKey(key);
    try {
      await onDeletePod(pod, pod.linear?.linearName ?? null);
    } catch {
      // error toast handled by parent
    } finally {
      setDeletingPodKey(null);
      setConfirmDeletePodKey(null);
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
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Linears</div>
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
            {createOpen ? "Cancel" : "Add Linear"}
          </Button>
        )}
      </div>

      {/* Tree view */}
      {channel.pods.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">No linears configured.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {Object.entries(grouped).map(([encoderChannel, pods]) => (
            <div key={encoderChannel}>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {encoderChannel}
              </div>
              <div className="mt-1.5 space-y-2 border-l-2 border-slate-100 pl-3 dark:border-slate-700">
                {pods.map((pod) => {
                  const deleteKey = pod.linear
                    ? `${pod.name}/${pod.linear.linearName}`
                    : null;
                  const isLinearConfirming = confirmDeleteKey !== null && confirmDeleteKey === deleteKey;
                  const isLinearDeleting = deletingKey === deleteKey;
                  const isPodConfirming = confirmDeletePodKey === pod.name;
                  const isPodDeleting = deletingPodKey === pod.name;
                  const isConfiguringThis = configurePodId === pod.id;
                  return (
                    <div key={pod.id}>
                      {/* Pod name row with pod-level delete */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {pod.name}
                        </span>
                        {canManageLinears && (
                          isPodConfirming ? (
                            <span className="flex items-center gap-1">
                              <span className="text-[10px] text-rose-600 dark:text-rose-400">
                                Delete pod?
                              </span>
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                                onClick={() => handleDeletePod(pod)}
                                disabled={isPodDeleting}
                              >
                                {isPodDeleting ? "…" : "Yes"}
                              </button>
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                onClick={() => setConfirmDeletePodKey(null)}
                                disabled={isPodDeleting}
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60"
                              onClick={() => setConfirmDeletePodKey(pod.name)}
                              disabled={deletingPodKey !== null || deletingKey !== null}
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                      {/* Linear row */}
                      <div className="mt-0.5 border-l-2 border-slate-100 pl-3 dark:border-slate-700">
                        {pod.linear ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              {pod.linear.linearName}
                            </span>
                            {canManageLinears && (
                              isLinearConfirming ? (
                                <span className="flex items-center gap-1">
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400">
                                    Delete?
                                  </span>
                                  <button
                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                                    onClick={() =>
                                      handleDelete(pod, pod.linear!.linearName)
                                    }
                                    disabled={isLinearDeleting}
                                  >
                                    {isLinearDeleting ? "…" : "Yes"}
                                  </button>
                                  <button
                                    className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                                    onClick={() => setConfirmDeleteKey(null)}
                                    disabled={isLinearDeleting}
                                  >
                                    No
                                  </button>
                                </span>
                              ) : (
                                <button
                                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60"
                                  onClick={() => setConfirmDeleteKey(deleteKey)}
                                  disabled={deletingKey !== null || deletingPodKey !== null}
                                >
                                  Delete
                                </button>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {canManageLinears && !isConfiguringThis && (
                              <button
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 disabled:opacity-60"
                                onClick={() => {
                                  setConfigurePodId(pod.id);
                                  setConfigureForm(DEFAULT_CONFIGURE_FORM);
                                  setShowConfigureValidation(false);
                                }}
                                disabled={deletingKey !== null || deletingPodKey !== null}
                              >
                                Configure
                              </button>
                            )}
                            {!canManageLinears && (
                              <span className="text-xs italic text-slate-400">no linear</span>
                            )}
                            {/* Configure inline form */}
                            {isConfiguringThis && (
                              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-950">
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
                        )}
                      </div>
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
    </div>
  );
}
