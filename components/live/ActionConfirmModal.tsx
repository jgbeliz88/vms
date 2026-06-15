"use client";

import { useEffect, useState } from "react";
import { ResolvedChannel, ChannelAction } from "@/features/live/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

export type AddLinearData = {
  pods: { name: string; encoders: number[] }[];
  linearName: string;
  drm: boolean;
  adsReplacement: boolean;
  fragmentLength: string;
  disableDrmManifests: boolean;
  drmVendor: string;
  contentId: string;
  tags: string[];
};

export type DeleteFlowDeletion = {
  podIndex: number;
  podName: string;
  podId: number;
  linearName: string | null;
  deletePod: boolean;
};

// ---------------------------------------------------------------------------
// Private UI helpers
// ---------------------------------------------------------------------------

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
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:text-slate-200",
          error ? "border-rose-400" : "border-slate-200 dark:border-slate-700"
        )}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-0.5 text-[10px] text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

function NameMatchInput({
  channelName,
  value,
  onChange,
}: {
  channelName: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs">
        Type{" "}
        <span className="font-semibold text-slate-900 dark:text-slate-100">{channelName}</span>{" "}
        to confirm.
      </p>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch sub-components — each owns its own state
// ---------------------------------------------------------------------------

function DeleteFlowContent({
  open,
  channel,
  action,
  onClose,
  onDeleteFlowConfirm,
  loading,
}: {
  open: boolean;
  channel: ResolvedChannel;
  action: ChannelAction;
  onClose: () => void;
  onDeleteFlowConfirm: (deletions: DeleteFlowDeletion[]) => void;
  loading?: boolean;
}) {
  const [match, setMatch] = useState("");
  const [deletionState, setDeletionState] = useState<
    Map<number, { podSelected: boolean; linearSelected: boolean }>
  >(new Map());

  useEffect(() => {
    if (!open) return;
    setMatch("");
    const initial = new Map<number, { podSelected: boolean; linearSelected: boolean }>();
    channel.pods.forEach((pod, i) => {
      initial.set(i, { podSelected: true, linearSelected: pod.linear != null });
    });
    setDeletionState(initial);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePod = (podIndex: number) => {
    const pod = channel.pods[podIndex];
    setDeletionState((prev) => {
      const next = new Map(prev);
      const current = next.get(podIndex) ?? { podSelected: false, linearSelected: false };
      if (current.podSelected) {
        next.set(podIndex, { ...current, podSelected: false });
      } else {
        next.set(podIndex, { podSelected: true, linearSelected: pod.linear != null });
      }
      return next;
    });
  };

  const toggleLinear = (podIndex: number) => {
    setDeletionState((prev) => {
      const next = new Map(prev);
      const current = next.get(podIndex) ?? { podSelected: false, linearSelected: false };
      next.set(podIndex, { ...current, linearSelected: !current.linearSelected });
      return next;
    });
  };

  const anySelected = [...deletionState.values()].some(
    (s) => s.podSelected || s.linearSelected
  );
  const matchOk = !action.requireNameMatch || match === channel.name;
  const canConfirm = matchOk && anySelected;

  const handleConfirm = () => {
    const deletions: DeleteFlowDeletion[] = [];
    channel.pods.forEach((pod, podIndex) => {
      const state = deletionState.get(podIndex);
      if (!state) return;
      const { podSelected, linearSelected } = state;
      if (!podSelected && !linearSelected) return;
      deletions.push({
        podIndex,
        podName: pod.name,
        podId: pod.id,
        linearName: linearSelected && pod.linear ? pod.linear.linearName : null,
        deletePod: podSelected,
      });
    });
    onDeleteFlowConfirm(deletions);
  };

  return (
    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
      <p>{action.description}</p>

      {channel.pods.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Select pods or linears to delete:
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {channel.pods.map((pod, podIndex) => {
              const state = deletionState.get(podIndex) ?? {
                podSelected: false,
                linearSelected: false,
              };
              const showKeepHint = !state.podSelected && state.linearSelected;

              return (
                <div key={podIndex}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={state.podSelected}
                      onChange={() => togglePod(podIndex)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {pod.name}
                      </span>
                      {showKeepHint ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400">
                          Linear will be deleted but pod ref will remain stored
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {pod.encoderName}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs",
                        pod.status === "running"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {pod.status}
                    </span>
                  </label>

                  {pod.linear && pod.linear.linearName ? (
                    <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                      <label className="flex cursor-pointer items-center gap-3 py-2 pl-10 pr-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <input
                          type="checkbox"
                          checked={state.linearSelected}
                          onChange={() => toggleLinear(podIndex)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        />
                        <span className="truncate text-xs text-slate-700 dark:text-slate-300">
                          {pod.linear.linearName}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                          {pod.linear.drm ? "DRM" : "Clear"}
                          {pod.linear.adsReplacement ? " · Ads" : ""}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <p className="py-1.5 pl-10 pr-3 text-xs italic text-slate-400">
                      {pod.linear ? "Cleared" : "No linear"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {!anySelected && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Select at least one pod or linear to continue.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-200">
        This action is potentially destructive.
      </div>

      {action.requireNameMatch && (
        <NameMatchInput channelName={channel.name} value={match} onChange={setMatch} />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={!canConfirm || loading}>
          {loading ? "Executing..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

function DefaultActionContent({
  open,
  channel,
  action,
  selectedPodIndices,
  onPodToggle,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  channel: ResolvedChannel;
  action: ChannelAction;
  selectedPodIndices: number[];
  onPodToggle: (index: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [match, setMatch] = useState("");

  useEffect(() => {
    if (!open) return;
    setMatch("");
  }, [open]);

  const noneSelected = selectedPodIndices.length === 0;
  const matchOk = !action.requireNameMatch || match === channel.name;
  const canConfirm = matchOk && !noneSelected;

  return (
    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
      <p>{action.description}</p>

      {channel.pods.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Select pods to apply this action:
          </p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {channel.pods.map((pod, index) => {
              const checked = selectedPodIndices.includes(index);
              return (
                <label
                  key={index}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onPodToggle(index)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                      {pod.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {pod.linear && pod.linear.linearName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "ml-auto text-xs rounded-full px-2 py-0.5",
                      pod.status === "running"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {pod.status}
                  </span>
                </label>
              );
            })}
          </div>
          {noneSelected && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Select at least one pod to continue.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-700/40 dark:bg-rose-500/10 dark:text-rose-200">
        This action is potentially destructive.
      </div>

      {action.requireNameMatch && (
        <NameMatchInput channelName={channel.name} value={match} onChange={setMatch} />
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={!canConfirm || loading}>
          {loading ? "Executing..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component — routing shell
// ---------------------------------------------------------------------------

export function ActionConfirmModal({
  open,
  onClose,
  channel,
  action,
  selectedPodIndices,
  onPodToggle,
  onConfirm,
  onDeleteFlowConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  channel: ResolvedChannel | null;
  action: ChannelAction | null;
  selectedPodIndices: number[];
  onPodToggle: (index: number) => void;
  onConfirm: () => void;
  onDeleteFlowConfirm?: (deletions: DeleteFlowDeletion[]) => void;
  loading?: boolean;
}) {
  if (!channel || !action) return null;

  const isDeleteFlow = action.id === "delete-flow";

  return (
    <Modal open={open} onClose={onClose} title={`Confirm: ${action.label}`} size="md">
      {isDeleteFlow ? (
        <DeleteFlowContent
          open={open}
          channel={channel}
          action={action}
          onClose={onClose}
          onDeleteFlowConfirm={onDeleteFlowConfirm!}
          loading={loading}
        />
      ) : (
        <DefaultActionContent
          open={open}
          channel={channel}
          action={action}
          selectedPodIndices={selectedPodIndices}
          onPodToggle={onPodToggle}
          onClose={onClose}
          onConfirm={onConfirm}
          loading={loading}
        />
      )}
    </Modal>
  );
}
