"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { VodTable } from "@/components/vod/VodTable";
import { LightflowVodTable } from "@/components/vod/LightflowVodTable";
import { BulkActionBar } from "@/components/vod/BulkActionBar";
import { BlockVodModal } from "@/components/vod/BlockVodModal";
import { CreateManifestModal, type ManifestTarget, type ManifestParams } from "@/components/vod/CreateManifestModal";
import { useBitmovinVodQuery, useLightflowVodQuery, useBlockVod, useCreateServerManifest } from "@/features/vod/hooks";
import { useToast } from "@/components/ui/Toast";

type EncoderTab = "bitmovin" | "lightflow";
type BulkModal = "block" | "unblock" | "manifest" | null;

export default function VodPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<EncoderTab>("bitmovin");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);

  const bitmovinQuery = useBitmovinVodQuery();
  const lightflowQuery = useLightflowVodQuery();
  const blockMutation = useBlockVod();
  const manifestMutation = useCreateServerManifest();

  const switchTab = (tab: EncoderTab) => {
    setActiveTab(tab);
    setSelected(new Set());
  };

  const getBulkTargets = (): ManifestTarget[] => {
    if (activeTab === "bitmovin" && bitmovinQuery.data) {
      return (bitmovinQuery.data as Array<{ _id: string; name: string }>)
        .filter((item) => selected.has(item._id))
        .map((item) => ({ mam: "bitmovin" as const, uuid: item._id, name: item.name, id: item._id }));
    }
    if (activeTab === "lightflow" && lightflowQuery.data) {
      return lightflowQuery.data
        .filter((item) => selected.has(item._id))
        .map((item) => ({ mam: "lightflow" as const, uuid: item.uuid, name: item._id, id: item._id }));
    }
    return [];
  };

  const handleBulkBlock = async () => {
    const targets = getBulkTargets();
    try {
      await Promise.all(targets.map((t) => blockMutation.mutateAsync({ mam: t.mam, uuid: t.uuid, block: true })));
      notify({
        title: `${targets.length} VOD${targets.length === 1 ? "" : "s"} blocked`,
        variant: "success",
      });
      setSelected(new Set());
    } catch (error) {
      notify({
        title: "Block failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setBulkModal(null);
    }
  };

  const handleBulkUnblock = async () => {
    const targets = getBulkTargets();
    try {
      await Promise.all(targets.map((t) => blockMutation.mutateAsync({ mam: t.mam, uuid: t.uuid, block: false })));
      notify({
        title: `${targets.length} VOD${targets.length === 1 ? "" : "s"} unblocked`,
        variant: "success",
      });
      setSelected(new Set());
    } catch (error) {
      notify({
        title: "Unblock failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    } finally {
      setBulkModal(null);
    }
  };

  const handleBulkManifest = async (params: ManifestParams) => {
    const targets = getBulkTargets();
    const results = await Promise.allSettled(
      targets.map((t) => manifestMutation.mutateAsync({ mam: t.mam, uuid: t.uuid, ...params }))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;
    if (failed === 0) {
      notify({
        title: `${succeeded} manifest${succeeded === 1 ? "" : "s"} created`,
        variant: "success",
      });
      setSelected(new Set());
    } else {
      notify({
        title: `${succeeded} succeeded, ${failed} failed`,
        description: (results.find((r) => r.status === "rejected") as PromiseRejectedResult)?.reason?.message,
        variant: "error",
      });
    }
    setBulkModal(null);
  };

  const bulkTargets = getBulkTargets();

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">VOD</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {bitmovinQuery.data ? `${bitmovinQuery.data.length} Bitmovin contents` : "Bitmovin contents"}
                {lightflowQuery.data ? ` · ${lightflowQuery.data.length} Lightflow contents` : ""}
              </p>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => switchTab("bitmovin")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "bitmovin"
                    ? "bg-white text-purple-700 shadow-sm dark:bg-slate-900 dark:text-purple-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Bitmovin
              </button>
              <button
                onClick={() => switchTab("lightflow")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "lightflow"
                    ? "bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Lightflow
              </button>
            </div>
          </div>

          {activeTab === "bitmovin" ? (
            bitmovinQuery.isLoading ? (
              <div className="text-sm text-slate-500">Loading Bitmovin contents…</div>
            ) : bitmovinQuery.isError ? (
              <div className="text-sm text-rose-500">Failed to load Bitmovin data.</div>
            ) : bitmovinQuery.data ? (
              <VodTable
                items={bitmovinQuery.data}
                encoder="bitmovin"
                selectable
                selected={selected}
                onSelectionChange={setSelected}
              />
            ) : null
          ) : lightflowQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading Lightflow contents…</div>
          ) : lightflowQuery.isError ? (
            <div className="text-sm text-rose-500">Failed to load Lightflow data.</div>
          ) : lightflowQuery.data ? (
            <LightflowVodTable
              items={lightflowQuery.data}
              selectable
              selected={selected}
              onSelectionChange={setSelected}
            />
          ) : null}
        </div>
      </AppShell>

      <BulkActionBar
        count={selected.size}
        onBlock={() => setBulkModal("block")}
        onUnblock={() => setBulkModal("unblock")}
        onManifest={() => setBulkModal("manifest")}
        onClear={() => setSelected(new Set())}
      />

      <BlockVodModal
        open={bulkModal === "block"}
        onClose={() => setBulkModal(null)}
        mode="block"
        targets={bulkTargets.map((t) => ({ name: t.name, id: t.id }))}
        onConfirm={handleBulkBlock}
        isSubmitting={blockMutation.isPending}
      />

      <BlockVodModal
        open={bulkModal === "unblock"}
        onClose={() => setBulkModal(null)}
        mode="unblock"
        targets={bulkTargets.map((t) => ({ name: t.name, id: t.id }))}
        onConfirm={handleBulkUnblock}
        isSubmitting={blockMutation.isPending}
      />

      <CreateManifestModal
        open={bulkModal === "manifest"}
        onClose={() => setBulkModal(null)}
        targets={bulkTargets}
        onConfirm={handleBulkManifest}
        isSubmitting={manifestMutation.isPending}
      />
    </AuthGuard>
  );
}
