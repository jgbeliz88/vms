"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { VodTable } from "@/components/vod/VodTable";
import { LightflowVodTable } from "@/components/vod/LightflowVodTable";
import { BulkActionBar } from "@/components/vod/BulkActionBar";
import { BlockVodModal } from "@/components/vod/BlockVodModal";
import { CreateManifestModal, type ManifestTarget, type ManifestParams } from "@/components/vod/CreateManifestModal";
import { VodPaginator } from "@/components/vod/VodPaginator";
import { useBitmovinVodQuery, useLightflowVodQuery, useBlockVod, useCreateServerManifest } from "@/features/vod/hooks";
import type { VodFilters } from "@/features/vod/vod-types";
import { useToast } from "@/components/ui/Toast";

type EncoderTab = "bitmovin" | "lightflow";
type BulkModal = "block" | "unblock" | "manifest" | null;

const DEFAULT_FILTERS: VodFilters = { page: 0, limit: 10 };

export default function VodPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState<EncoderTab>("bitmovin");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);

  const [bitmovinFilters, setBitmovinFilters] = useState<VodFilters>(DEFAULT_FILTERS);
  const [bitmovinKnownMaxPage, setBitmovinKnownMaxPage] = useState(5);
  const [bitmovinSortKey, setBitmovinSortKey] = useState<string | null>(null);
  const [bitmovinSortDir, setBitmovinSortDir] = useState<"asc" | "desc">("asc");

  const [lightflowFilters, setLightflowFilters] = useState<VodFilters>(DEFAULT_FILTERS);
  const [lightflowKnownMaxPage, setLightflowKnownMaxPage] = useState(5);
  const [lightflowSortKey, setLightflowSortKey] = useState<string | null>(null);
  const [lightflowSortDir, setLightflowSortDir] = useState<"asc" | "desc">("asc");

  const bitmovinQuery = useBitmovinVodQuery(bitmovinFilters);
  const lightflowQuery = useLightflowVodQuery(lightflowFilters);
  const blockMutation = useBlockVod();
  const manifestMutation = useCreateServerManifest();

  useEffect(() => {
    const d = bitmovinQuery.data;
    if (d?.hasNextPage) {
      setBitmovinKnownMaxPage((prev) => Math.max(prev, d.pageIndex + 2));
    }
  }, [bitmovinQuery.data]);

  useEffect(() => {
    const d = lightflowQuery.data;
    if (d?.hasNextPage) {
      setLightflowKnownMaxPage((prev) => Math.max(prev, d.pageIndex + 2));
    }
  }, [lightflowQuery.data]);

  const switchTab = (tab: EncoderTab) => {
    setActiveTab(tab);
    setSelected(new Set());
  };

  const applyFilterKey = (raw: string, key: string): Partial<VodFilters> => {
    if (key === "labels") {
      return { labels: raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : undefined };
    }
    if (key === "createdAtOlderThan") {
      return { createdAtOlderThan: raw ? `${raw}T23:59:59Z` : undefined };
    }
    if (key === "createdAtNewerThan") {
      return { createdAtNewerThan: raw ? `${raw}T00:00:00Z` : undefined };
    }
    return { [key]: raw || undefined };
  };

  const handleBitmovinFilterChange = (key: string, raw: string) => {
    setBitmovinFilters((prev) => ({ ...prev, page: 0, ...applyFilterKey(raw, key) }));
  };

  const handleBitmovinSortChange = (sortBy: string, order: "asc" | "desc") => {
    setBitmovinSortKey(sortBy);
    setBitmovinSortDir(order);
    setBitmovinFilters((prev) => ({ ...prev, sortBy, order, page: 0 }));
  };

  const handleBitmovinPageChange = (page: number) => {
    setBitmovinFilters((prev) => ({ ...prev, page: page - 1 }));
    setSelected(new Set());
  };

  const handleLightflowFilterChange = (key: string, raw: string) => {
    setLightflowFilters((prev) => ({ ...prev, page: 0, ...applyFilterKey(raw, key) }));
  };

  const handleLightflowSortChange = (sortBy: string, order: "asc" | "desc") => {
    setLightflowSortKey(sortBy);
    setLightflowSortDir(order);
    setLightflowFilters((prev) => ({ ...prev, sortBy, order, page: 0 }));
  };

  const handleLightflowPageChange = (page: number) => {
    setLightflowFilters((prev) => ({ ...prev, page: page - 1 }));
    setSelected(new Set());
  };

  const getBulkTargets = (): ManifestTarget[] => {
    if (activeTab === "bitmovin" && bitmovinQuery.data) {
      return bitmovinQuery.data.items
        .filter((item) => selected.has(item._id))
        .map((item) => ({ mam: "bitmovin" as const, uuid: item._id, name: item.name, id: item._id }));
    }
    if (activeTab === "lightflow" && lightflowQuery.data) {
      return lightflowQuery.data.items
        .filter((item) => selected.has(item.uuid))
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
                {activeTab === "bitmovin"
                  ? bitmovinQuery.data
                      ? `Page ${bitmovinFilters.page + 1} · ${bitmovinQuery.data.items.length} items`
                      : "Bitmovin contents"
                  : lightflowQuery.data
                      ? `Page ${lightflowFilters.page + 1} · ${lightflowQuery.data.items.length} items`
                      : "Lightflow contents"}
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
              <div className={bitmovinQuery.isFetching ? "pointer-events-none opacity-60 transition-opacity" : ""}>
                <VodTable
                  items={bitmovinQuery.data.items}
                  encoder="bitmovin"
                  selectable
                  selected={selected}
                  onSelectionChange={setSelected}
                  onFilterChange={handleBitmovinFilterChange}
                  onSortChange={handleBitmovinSortChange}
                  sortKey={bitmovinSortKey}
                  sortDir={bitmovinSortDir}
                />
                <VodPaginator
                  currentPage={bitmovinFilters.page + 1}
                  knownMaxPage={bitmovinKnownMaxPage}
                  hasNextPage={bitmovinQuery.data.hasNextPage}
                  onChange={handleBitmovinPageChange}
                />
              </div>
            ) : null
          ) : lightflowQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading Lightflow contents…</div>
          ) : lightflowQuery.isError ? (
            <div className="text-sm text-rose-500">Failed to load Lightflow data.</div>
          ) : lightflowQuery.data ? (
            <div className={lightflowQuery.isFetching ? "pointer-events-none opacity-60 transition-opacity" : ""}>
              <LightflowVodTable
                items={lightflowQuery.data.items}
                selectable
                selected={selected}
                onSelectionChange={setSelected}
                onFilterChange={handleLightflowFilterChange}
                onSortChange={handleLightflowSortChange}
                sortKey={lightflowSortKey}
                sortDir={lightflowSortDir}
              />
              <VodPaginator
                currentPage={lightflowFilters.page + 1}
                knownMaxPage={lightflowKnownMaxPage}
                hasNextPage={lightflowQuery.data.hasNextPage}
                onChange={handleLightflowPageChange}
              />
            </div>
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
