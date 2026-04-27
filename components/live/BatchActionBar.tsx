"use client";

import { useState } from "react";
import { BatchAction, ResolvedChannel, Linear } from "@/features/live/types";
import { PodActionResult } from "@/features/live/hooks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";

type PodFilter = "all" | "main" | "backup";

type DeleteLinearGroup = {
  channelId: number;
  pods: Array<{ podName: string; podId: number; linear: Linear | null }>;
};

export type CreateLinearItem = {
  channelEntityId: number;
  podId: number;
  podName: string;
  linearName: string;
};

export type LinearFormConfig = {
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
};

export type CreateLinearResult = {
  podName: string;
  linearName: string;
  status: "created" | "skipped" | "error";
  message?: string;
  curlCommand?: string;
};

const DEFAULT_LINEAR_CONFIG: LinearFormConfig = {
  drm: false,
  adsReplacement: true,
  fragmentLength: "48/25",
  disableDrmManifests: false,
  drmVendor: "kms",
  contentId: "premium",
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
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function deriveLinearName(channel: ResolvedChannel, podName: string): string {
  const fromMeta = channel.metadata?.linear;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  // Strip "uspori" prefix, then strip the trailing letter (e.g. m/b)
  const withoutPrefix = podName.replace(/^uspori/, "");
  return withoutPrefix.replace(/[a-z]$/i, "");
}

function PodFilterTabs({
  value,
  onChange,
}: {
  value: PodFilter;
  onChange: (f: PodFilter) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["all", "main", "backup"] as PodFilter[]).map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
            value === f
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function PodStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
        status === "running"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : status === "degraded"
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      )}
    >
      {status}
    </span>
  );
}

export function BatchActionBar({
  actions,
  selected,
  onAction,
  onDeleteLinear,
  deleteLinearLoading,
  onCreateLinear,
}: {
  actions: BatchAction[];
  selected: ResolvedChannel[];
  onAction: (actionId: string) => void;
  onDeleteLinear: (groups: DeleteLinearGroup[]) => Promise<PodActionResult[]>;
  deleteLinearLoading?: boolean;
  onCreateLinear: (items: CreateLinearItem[], config: LinearFormConfig) => Promise<CreateLinearResult[]>;
}) {
  // --- Delete Linear state ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFilter, setDeleteFilter] = useState<PodFilter>("all");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteResults, setDeleteResults] = useState<PodActionResult[] | null>(null);
  const [lastDeleteGroups, setLastDeleteGroups] = useState<DeleteLinearGroup[]>([]);
  const [isRetryingDelete, setIsRetryingDelete] = useState(false);

  // --- Create Linear state ---
  const [createOpen, setCreateOpen] = useState(false);
  const [createFilter, setCreateFilter] = useState<PodFilter>("all");
  const [createConfig, setCreateConfig] = useState<LinearFormConfig>(DEFAULT_LINEAR_CONFIG);
  const [createResults, setCreateResults] = useState<CreateLinearResult[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateValidation, setShowCreateValidation] = useState(false);
  const [lastCreateItems, setLastCreateItems] = useState<CreateLinearItem[]>([]);
  const [lastCreateConfig, setLastCreateConfig] = useState<LinearFormConfig>(DEFAULT_LINEAR_CONFIG);

  const canOperate = usePermission([ROLES.OPERATOR]);
  const canManageLinears = usePermission([ROLES.ADMIN]);

  if (!canOperate || selected.length === 0) return null;

  // --- Delete: filter pods by tab ---
  const deleteGroupedChannels = selected
    .map((ch) => ({
      channelId: ch.id,
      channelName: ch.name,
      pods: ch.pods.filter((pod) => {
        if (deleteFilter === "all") return true;
        const name = pod.name.toLowerCase();
        return deleteFilter === "main" ? name.endsWith("m") : name.endsWith("b");
      }),
    }))
    .filter((ch) => ch.pods.length > 0);

  const deleteTotalLinears = deleteGroupedChannels.reduce(
    (sum, ch) => sum + ch.pods.reduce((s, p) => s + (p.linear && p.linear.linearName ? 1 : 0), 0),
    0
  );

  // --- Create: filter pods by tab ---
  const createGroupedChannels = selected
    .map((ch) => ({
      channel: ch,
      pods: ch.pods.filter((pod) => {
        if (createFilter === "all") return true;
        const name = pod.name.toLowerCase();
        return createFilter === "main" ? name.endsWith("m") : name.endsWith("b");
      }),
    }))
    .filter((g) => g.pods.length > 0);

  const createFormValid = createConfig.fragmentLength.trim() !== "";

  // --- Delete handlers ---
  const openDeleteModal = () => {
    setDeleteFilter("all");
    setDeleteConfirmText("");
    setDeleteResults(null);
    setDeleteOpen(true);
  };
  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteConfirmText("");
    setDeleteResults(null);
  };
  const canConfirmDelete = deleteGroupedChannels.length > 0 && deleteConfirmText === "Delete";

  const handleConfirmDelete = async () => {
    const groups: DeleteLinearGroup[] = deleteGroupedChannels.map((ch) => ({
      channelId: ch.channelId,
      pods: ch.pods.map((pod) => ({ podName: pod.name, podId: pod.id, linear: pod.linear })),
    }));
    setLastDeleteGroups(groups);
    try {
      setDeleteResults(await onDeleteLinear(groups));
    } catch (error) {
      setDeleteResults(
        deleteGroupedChannels.flatMap((ch) =>
          ch.pods.map((pod) => ({
            podName: pod.name,
            podNode: pod.name,
            status: 0,
            data: { error: error instanceof Error ? error.message : "Request failed" },
          }))
        )
      );
    }
    setDeleteConfirmText("");
  };

  const handleRetryDelete = async () => {
    if (!deleteResults || lastDeleteGroups.length === 0) return;
    const failedPodNames = new Set(
      deleteResults.filter((r) => r.status === 0 || r.status < 200 || r.status >= 300).map((r) => r.podName)
    );
    const retryGroups = lastDeleteGroups
      .map((g) => ({ ...g, pods: g.pods.filter((p) => failedPodNames.has(p.podName)) }))
      .filter((g) => g.pods.length > 0);
    if (retryGroups.length === 0) return;
    setIsRetryingDelete(true);
    try {
      const retryResults = await onDeleteLinear(retryGroups);
      const retryMap = new Map(retryResults.map((r) => [r.podName, r]));
      setDeleteResults((prev) => prev?.map((r) => retryMap.get(r.podName) ?? r) ?? retryResults);
    } finally {
      setIsRetryingDelete(false);
    }
  };

  // --- Create handlers ---
  const openCreateModal = () => {
    setCreateFilter("all");
    setCreateConfig(DEFAULT_LINEAR_CONFIG);
    setCreateResults(null);
    setShowCreateValidation(false);
    setCreateOpen(true);
  };
  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateResults(null);
    setShowCreateValidation(false);
  };
  const setConfig = <K extends keyof LinearFormConfig>(key: K, value: LinearFormConfig[K]) =>
    setCreateConfig((prev) => ({ ...prev, [key]: value }));

  const handleConfirmCreate = async () => {
    if (!createFormValid) {
      setShowCreateValidation(true);
      return;
    }
    setIsCreating(true);
    try {
      const items: CreateLinearItem[] = [];
      const skipped: CreateLinearResult[] = [];
      for (const { channel, pods } of createGroupedChannels) {
        for (const pod of pods) {
          const linearName = deriveLinearName(channel, pod.name);
          if (pod.linear?.linearName === linearName) {
            skipped.push({ podName: pod.name, linearName, status: "skipped" });
          } else {
            items.push({
              channelEntityId: channel.id,
              podId: pod.id,
              podName: pod.name,
              linearName,
            });
          }
        }
      }
      setLastCreateItems(items);
      setLastCreateConfig(createConfig);
      const created = items.length > 0 ? await onCreateLinear(items, createConfig) : [];
      setCreateResults([...skipped, ...created]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRetry = async () => {
    if (!createResults) return;
    const failedPodNames = new Set(
      createResults.filter((r) => r.status === "error").map((r) => r.podName)
    );
    const retryItems = lastCreateItems.filter((item) => failedPodNames.has(item.podName));
    if (retryItems.length === 0) return;
    setIsCreating(true);
    try {
      const retryResults = await onCreateLinear(retryItems, lastCreateConfig);
      const retryMap = new Map(retryResults.map((r) => [r.podName, r]));
      setCreateResults((prev) => prev?.map((r) => retryMap.get(r.podName) ?? r) ?? retryResults);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Sticky batch bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {selected.length} channels selected
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.tone === "danger" ? "danger" : action.tone === "warning" ? "secondary" : "primary"}
                onClick={() => onAction(action.id)}
              >
                {action.label}
              </Button>
            ))}
            {canManageLinears && (
              <Button variant="primary" onClick={openCreateModal}>
                Create Linear
              </Button>
            )}
            {canManageLinears && (
              <Button variant="danger" onClick={openDeleteModal}>
                Delete Linear
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Batch actions will show per-channel status in the result panel.
        </div>
      </div>

      {/* ── Delete Linear Modal ── */}
      <Modal open={deleteOpen} onClose={closeDeleteModal} title="Delete Linear" size="lg">
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {deleteResults ? (
            <>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-2 text-left">Pod</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deleteResults.map((r, i) => (
                      <tr key={`${i}-${r.podName}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{r.podName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              r.status >= 200 && r.status < 300
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            )}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {r.message ?? (
                            <span className="block truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              {JSON.stringify(r.data)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                {deleteResults.some((r) => r.status === 0 || r.status < 200 || r.status >= 300) && (
                  <Button variant="secondary" onClick={handleRetryDelete} disabled={isRetryingDelete}>
                    {isRetryingDelete
                      ? "Retrying…"
                      : `Retry ${deleteResults.filter((r) => r.status === 0 || r.status < 200 || r.status >= 300).length} failed`}
                  </Button>
                )}
                <Button variant="secondary" onClick={closeDeleteModal}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <PodFilterTabs value={deleteFilter} onChange={setDeleteFilter} />

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                {deleteGroupedChannels.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No pods found</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {deleteGroupedChannels.map((ch) => (
                      <div key={ch.channelId}>
                        <div className="bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {ch.channelName}
                          </span>
                        </div>
                        {ch.pods.map((pod) => (
                          <div key={pod.name}>
                            <div className="flex items-center gap-2 py-1.5 pl-6 pr-3">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {pod.name}
                              </span>
                              <PodStatusBadge status={pod.status} />
                            </div>
                            {!pod.linear || !pod.linear.linearName ? (
                              <div className="py-1 pl-12 pr-3 text-xs italic text-slate-400">
                                {pod.linear ? "Cleared" : "No linear"}
                              </div>
                            ) : (
                              <div
                                className="py-1 pl-12 pr-3 text-xs text-slate-600 dark:text-slate-400"
                              >
                                {pod.linear.linearName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-200">
                This action is potentially destructive. Only linears will be deleted; pod data will remain stored.
              </div>

              <div className="space-y-2">
                <p className="text-xs">
                  Type{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Delete</span> to confirm.
                </p>
                <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={!canConfirmDelete || deleteLinearLoading}
                  onClick={handleConfirmDelete}
                >
                  {deleteLinearLoading
                    ? "Deleting…"
                    : `Delete${deleteTotalLinears > 0 ? ` ${deleteTotalLinears} linear${deleteTotalLinears !== 1 ? "s" : ""}` : ""}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Create Linear Modal ── */}
      <Modal open={createOpen} onClose={closeCreateModal} title="Create Linear" size="lg">
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          {createResults ? (
            <>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-2 text-left">Pod</th>
                      <th className="px-4 py-2 text-left">Linear</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {createResults.map((r, i) => (
                      <tr key={`${i}-${r.podName}-${r.linearName}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{r.podName}</td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{r.linearName}</td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              r.status === "created"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                : r.status === "skipped"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            )}
                          >
                            {r.status}
                          </span>
                          {r.message && (
                            <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400">
                              {r.message}
                            </span>
                          )}
                          {r.curlCommand && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                Show curl
                              </summary>
                              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-100 dark:bg-slate-950">
                                {r.curlCommand}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                {createResults.some((r) => r.status === "error") && (
                  <Button variant="secondary" onClick={handleRetry} disabled={isCreating}>
                    {isCreating
                      ? "Retrying…"
                      : `Retry ${createResults.filter((r) => r.status === "error").length} failed`}
                  </Button>
                )}
                <Button variant="secondary" onClick={closeCreateModal}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Linear config form */}
              <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Linear Configuration</p>
                <FormRow label="Fragment Length">
                  <Input
                    value={createConfig.fragmentLength}
                    placeholder="e.g. 48/25"
                    onChange={(e) => {
                      setConfig("fragmentLength", e.target.value);
                      setShowCreateValidation(false);
                    }}
                    error={
                      showCreateValidation && !createConfig.fragmentLength.trim() ? "Required" : undefined
                    }
                  />
                </FormRow>
                <FormRow label="DRM">
                  <div className="flex justify-end">
                    <Toggle checked={createConfig.drm} onChange={(v) => setConfig("drm", v)} />
                  </div>
                </FormRow>
                <FormRow label="Ads Replacement">
                  <div className="flex justify-end">
                    <Toggle checked={createConfig.adsReplacement} onChange={(v) => setConfig("adsReplacement", v)} />
                  </div>
                </FormRow>
                <FormRow label="Disable DRM Manifests">
                  <div className="flex justify-end">
                    <Toggle
                      checked={createConfig.disableDrmManifests}
                      onChange={(v) => setConfig("disableDrmManifests", v)}
                    />
                  </div>
                </FormRow>
                {createConfig.drm && (
                  <>
                    <FormRow label="DRM Vendor">
                      <Input
                        value={createConfig.drmVendor}
                        placeholder="e.g. kms"
                        onChange={(e) => setConfig("drmVendor", e.target.value)}
                      />
                    </FormRow>
                    <FormRow label="Content ID">
                      <Input
                        value={createConfig.contentId}
                        placeholder="e.g. premium"
                        onChange={(e) => setConfig("contentId", e.target.value)}
                      />
                    </FormRow>
                  </>
                )}
              </div>

              <PodFilterTabs value={createFilter} onChange={setCreateFilter} />

              {/* Tree: Channel → Pod → linear to be created */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                {createGroupedChannels.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No pods found</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {createGroupedChannels.map(({ channel, pods }) => (
                      <div key={channel.id}>
                        <div className="bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {channel.name}
                          </span>
                        </div>
                        {pods.map((pod) => {
                          const linearName = deriveLinearName(channel, pod.name);
                          const alreadyExists = pod.linear?.linearName === linearName;
                          return (
                            <div key={pod.name}>
                              <div className="flex items-center gap-2 py-1.5 pl-6 pr-3">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {pod.name}
                                </span>
                                <PodStatusBadge status={pod.status} />
                              </div>
                              <div className="flex items-center gap-2 py-1 pl-12 pr-3">
                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                  {linearName}
                                </span>
                                {alreadyExists ? (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                    already exists — will be skipped
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    (to be created)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!createFormValid || isCreating}
                  onClick={handleConfirmCreate}
                >
                  {isCreating ? "Creating…" : "Confirm"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
