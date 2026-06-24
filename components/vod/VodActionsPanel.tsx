"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useCreateServerManifest, useBlockVod } from "@/features/vod/hooks";
import { CreateManifestModal, type ManifestParams } from "@/components/vod/CreateManifestModal";
import { BlockVodModal } from "@/components/vod/BlockVodModal";
import { cn } from "@/lib/utils/cn";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

type Props = {
  mam: "bitmovin" | "lightflow";
  uuid: string;
  contentName?: string;
};

function ActionButton({
  label,
  tone = "default",
  onClick,
  disabled,
}: {
  label: string;
  tone?: "default" | "danger" | "success" | "brand";
  onClick: () => void;
  disabled?: boolean;
}) {
  const toneCls =
    tone === "danger"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-700/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
      : tone === "success"
      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      : tone === "brand"
      ? "border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-brand-700/40 dark:text-brand-400 dark:hover:bg-brand-500/10"
      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center rounded-md border bg-white px-3.5 py-2 text-sm font-medium transition dark:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50",
        toneCls
      )}
    >
      {label}
    </button>
  );
}

export function VodActionsPanel({ mam, uuid, contentName }: Props) {
  const canAdmin = usePermission([PERMISSIONS.VOD_ACTIONS]);
  const { notify } = useToast();
  const createManifest = useCreateServerManifest();
  const blockVod = useBlockVod();

  const [manifestOpen, setManifestOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unblockOpen, setUnblockOpen] = useState(false);

  if (!canAdmin) return null;

  const target = { mam, uuid, name: contentName ?? uuid, id: uuid };

  const handleManifestConfirm = async (params: ManifestParams) => {
    try {
      await createManifest.mutateAsync({ mam, uuid, ...params });
      notify({
        title: "Server manifest created",
        description: `trackLanguage=${params.trackLanguage} · isKms=${params.isKms}`,
        variant: "success",
      });
      setManifestOpen(false);
    } catch (error) {
      notify({
        title: "Manifest creation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    }
  };

  const handleBlockConfirm = async () => {
    try {
      await blockVod.mutateAsync({ mam, uuid, block: true });
      notify({ title: "VOD blocked", variant: "success" });
      setBlockOpen(false);
    } catch (error) {
      notify({
        title: "Block failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    }
  };

  const handleUnblockConfirm = async () => {
    try {
      await blockVod.mutateAsync({ mam, uuid, block: false });
      notify({ title: "VOD unblocked", variant: "success" });
      setUnblockOpen(false);
    } catch (error) {
      notify({
        title: "Unblock failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Manifest and blocking operations for this VOD.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              label="Create Server Manifest"
              tone="brand"
              onClick={() => setManifestOpen(true)}
            />
            <ActionButton
              label="Block VOD"
              tone="danger"
              onClick={() => setBlockOpen(true)}
            />
            <ActionButton
              label="Unblock VOD"
              tone="success"
              onClick={() => setUnblockOpen(true)}
            />
          </div>
        </div>
      </div>

      <CreateManifestModal
        open={manifestOpen}
        onClose={() => setManifestOpen(false)}
        targets={[target]}
        onConfirm={handleManifestConfirm}
        isSubmitting={createManifest.isPending}
      />

      <BlockVodModal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        mode="block"
        targets={[{ name: target.name, id: target.id }]}
        onConfirm={handleBlockConfirm}
        isSubmitting={blockVod.isPending}
      />

      <BlockVodModal
        open={unblockOpen}
        onClose={() => setUnblockOpen(false)}
        mode="unblock"
        targets={[{ name: target.name, id: target.id }]}
        onConfirm={handleUnblockConfirm}
        isSubmitting={blockVod.isPending}
      />
    </>
  );
}
