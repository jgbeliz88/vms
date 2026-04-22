"use client";

import { useState } from "react";
import type { Encoder, EncoderPod } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { useCreatePod, useDeleteEncoderPod } from "@/features/live/encoder-hooks";
import { useToast } from "@/components/ui/Toast";

type PodFormState = { name: string };

type EncoderFormState = {
  encoderChannel: string;
  heroName: string;
};

const DEFAULT_POD_FORM: PodFormState = { name: "" };
const DEFAULT_ENCODER_FORM: EncoderFormState = { encoderChannel: "", heroName: "" };

function PodRow({
  pod,
  canAdmin,
  onDelete,
}: {
  pod: EncoderPod;
  canAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-slate-800 dark:text-slate-100">{pod.name}</span>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px]",
          pod.status === "running"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
        )}
      >
        {pod.status}
      </span>
      {canAdmin && (
        <button
          onClick={onDelete}
          title="Delete pod"
          className="text-xs text-slate-400 hover:text-rose-500"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function AddPodForm({ onAdd, canAdmin }: { onAdd: (pod: PodFormState) => void; canAdmin: boolean }) {
  const [form, setForm] = useState<PodFormState>(DEFAULT_POD_FORM);
  const [show, setShow] = useState(false);

  if (!canAdmin) return null;

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-1 text-xs text-brand-600 underline hover:text-brand-800 dark:text-brand-400"
      >
        + Add pod
      </button>
    );
  }

  const handleAdd = () => {
    if (!form.name.trim()) return;
    onAdd(form);
    setForm(DEFAULT_POD_FORM);
    setShow(false);
  };

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-2 dark:border-slate-600">
      <Input
        value={form.name}
        placeholder="Pod name"
        onChange={(e) => setForm({ name: e.target.value })}
      />
      <Button onClick={handleAdd} disabled={!form.name.trim()}>Add</Button>
      <Button variant="secondary" onClick={() => setShow(false)}>Cancel</Button>
    </div>
  );
}

function EncoderRow({
  encoder,
  canAdmin,
  onDelete,
  onAddPod,
  onDeletePod,
}: {
  encoder: Encoder;
  canAdmin: boolean;
  onDelete: (id: number) => void;
  onAddPod: (encoderId: number, name: string) => void;
  onDeletePod: (podId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleAddPod = (podForm: PodFormState) => {
    onAddPod(encoder.id, podForm.name);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-slate-400"
          aria-label="Expand"
        >
          {expanded ? "▲" : "▼"}
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {encoder.encoderChannel}
          </span>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{encoder.heroName}</span>
        </div>
        <span className="text-xs text-slate-400">{encoder.pods.length} pod{encoder.pods.length !== 1 ? "s" : ""}</span>
        {canAdmin && (
          <button
            onClick={() => onDelete(encoder.id)}
            title="Delete encoder"
            className="text-xs text-slate-400 hover:text-rose-500"
          >
            Delete
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="space-y-2">
            {encoder.pods.length === 0 ? (
              <p className="text-xs italic text-slate-400">No pods configured.</p>
            ) : (
              encoder.pods.map((pod) => (
                <PodRow
                  key={pod.id}
                  pod={pod}
                  canAdmin={canAdmin}
                  onDelete={() => onDeletePod(pod.id)}
                />
              ))
            )}
            <AddPodForm onAdd={handleAddPod} canAdmin={canAdmin} />
          </div>
        </div>
      )}
    </div>
  );
}

function AddEncoderForm({ onCreate }: { onCreate: (data: EncoderFormState) => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<EncoderFormState>(DEFAULT_ENCODER_FORM);

  if (!show) {
    return (
      <Button onClick={() => setShow(true)}>Add Encoder</Button>
    );
  }

  const handleCreate = () => {
    if (!form.encoderChannel.trim() || !form.heroName.trim()) return;
    onCreate(form);
    setForm(DEFAULT_ENCODER_FORM);
    setShow(false);
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-600">
      <Input
        value={form.encoderChannel}
        placeholder="Encoder channel (e.g. Channel 5)"
        onChange={(e) => setForm((p) => ({ ...p, encoderChannel: e.target.value }))}
      />
      <Input
        value={form.heroName}
        placeholder="Hero name (e.g. Hero 5.1)"
        onChange={(e) => setForm((p) => ({ ...p, heroName: e.target.value }))}
      />
      <Button onClick={handleCreate} disabled={!form.encoderChannel.trim() || !form.heroName.trim()}>
        Create
      </Button>
      <Button variant="secondary" onClick={() => { setShow(false); setForm(DEFAULT_ENCODER_FORM); }}>
        Cancel
      </Button>
    </div>
  );
}

export function EncoderConfigPanel({
  encoders,
  onCreateEncoder,
  onDeleteEncoder,
}: {
  encoders: Encoder[];
  onCreateEncoder: (data: { encoderChannel: string; heroName: string }) => void;
  onDeleteEncoder: (id: number) => void;
}) {
  const canAdmin = usePermission([ROLES.ADMIN]);
  const { notify } = useToast();
  const createPod = useCreatePod();
  const deleteEncoderPod = useDeleteEncoderPod();

  const handleAddPod = async (encoderId: number, name: string) => {
    try {
      await createPod.mutateAsync({ encoderId, name });
    } catch (error) {
      notify({
        title: "Create pod failed",
        description: error instanceof Error ? error.message : "Unable to create pod",
        variant: "error",
      });
    }
  };

  const handleDeletePod = async (podId: number) => {
    try {
      await deleteEncoderPod.mutateAsync(podId);
    } catch (error) {
      notify({
        title: "Delete pod failed",
        description: error instanceof Error ? error.message : "Unable to delete pod",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {encoders.length} encoder{encoders.length !== 1 ? "s" : ""} configured
        </p>
        {canAdmin && <AddEncoderForm onCreate={onCreateEncoder} />}
      </div>

      {encoders.length === 0 ? (
        <p className="text-sm italic text-slate-400">No encoders yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {encoders.map((encoder) => (
            <EncoderRow
              key={encoder.id}
              encoder={encoder}
              canAdmin={canAdmin}
              onDelete={onDeleteEncoder}
              onAddPod={handleAddPod}
              onDeletePod={handleDeletePod}
            />
          ))}
        </div>
      )}
    </div>
  );
}
