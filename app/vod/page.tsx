"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { VodTable } from "@/components/vod/VodTable";
import { LightflowVodTable } from "@/components/vod/LightflowVodTable";
import { useBitmovinVodQuery, useLightflowVodQuery } from "@/features/vod/hooks";

type EncoderTab = "bitmovin" | "lightflow";

export default function VodPage() {
  const [activeTab, setActiveTab] = useState<EncoderTab>("bitmovin");
  const bitmovinQuery = useBitmovinVodQuery();
  const lightflowQuery = useLightflowVodQuery();

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
                onClick={() => setActiveTab("bitmovin")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "bitmovin"
                    ? "bg-white text-purple-700 shadow-sm dark:bg-slate-900 dark:text-purple-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Bitmovin
              </button>
              <button
                onClick={() => setActiveTab("lightflow")}
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
              <VodTable items={bitmovinQuery.data} encoder="bitmovin" />
            ) : null
          ) : lightflowQuery.isLoading ? (
            <div className="text-sm text-slate-500">Loading Lightflow contents…</div>
          ) : lightflowQuery.isError ? (
            <div className="text-sm text-rose-500">Failed to load Lightflow data.</div>
          ) : lightflowQuery.data ? (
            <LightflowVodTable items={lightflowQuery.data} />
          ) : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
