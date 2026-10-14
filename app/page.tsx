"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useChannelsQuery, useChannelDetailStatus, useVodManifestQuery } from "@/features/live/hooks";
import type { ResolvedChannel } from "@/features/live/types";
import { buildLinearStatusRows } from "@/features/live/tag-groups";
import { LinearStatusGroups } from "@/components/live/LinearStatusGroups";
import { useFastChannelsQuery, useFastChannelStreamStatusQuery } from "@/features/fast-channels/hooks";
import { Badge } from "@/components/ui/Badge";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { DataTable } from "@/components/ui/DataTable";
import type { ColumnDef } from "@/components/ui/DataTable";
import { useColumnResize } from "@/components/ui/useColumnResize";
import { useBitmovinVodQuery } from "@/features/vod/hooks";
import { useManifestPathTooltip } from "@/components/ui/ManifestPathTooltip";

function SectionHeader({ title, count, href }: { title: string; count?: number; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold text-[#1C2434] dark:text-white">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs font-medium text-[#64748B] dark:bg-[#333A48] dark:text-[#DEE4EE]">{count}</span>
        )}
      </div>
      <Link
        href={href}
        className="text-xs font-medium text-brand-500 hover:text-brand-600 hover:underline"
      >
        Ver todo →
      </Link>
    </div>
  );
}

function buildVodManifestUrl(originBase: string, id: string, encoder: string) {
  const seg1 = id.slice(0, 2);
  const seg2 = id.slice(2, 4);
  return `${originBase}/orivod/vod/${encoder}/${seg1}/${seg2}/${id}/main.ism/.m3u8`;
}

function VodManifestBadge({
  id, encoder, originBase, onResult
}: {
  id: string;
  encoder: string;
  originBase: string;
  onResult?: (id: string, ok: boolean | null) => void;
}) {
  const url = originBase ? buildVodManifestUrl(originBase, id, encoder) : null;
  const query = useVodManifestQuery(id, url, originBase);
  const { bindPath } = useManifestPathTooltip();

  useEffect(() => {
    if (!onResult) return;
    if (query.isSuccess) onResult(id, query.data.status === "ready");
    else if (query.isError) onResult(id, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.isError, query.data]);

  if (!url) return <span className="text-[#8899A8]">—</span>;
  if (query.isLoading) return <span className="text-xs text-[#8899A8] animate-pulse">checking…</span>;

  const badge =
    query.isError || !query.data ? (
      <Badge label="error" tone="error" />
    ) : query.data.status === "ready" ? (
      <Badge label="OK" tone="success" />
    ) : (
      <Badge label={`${query.data.httpStatus ?? "err"}`} tone="error" />
    );

  return (
    <span {...bindPath(url)} className="inline-flex cursor-pointer rounded-full transition-shadow hover:ring-2 hover:ring-brand-500/40">
      {badge}
    </span>
  );
}

function vodStatusTone(status: string): "success" | "error" | "warning" | "default" {
  if (status === "FINISHED") return "success";
  if (status === "ENCODING") return "warning";
  if (status.includes("ERROR") || status === "FAILED") return "error";
  return "default";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function ChannelManifestRow({
  channel,
  originBaseUrl,
  cdnBaseUrl
}: {
  channel: ResolvedChannel;
  originBaseUrl: string;
  cdnBaseUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const manifestQuery = useChannelDetailStatus(channel.id, channel.pods, originBaseUrl, cdnBaseUrl);
  const allOk = manifestQuery.data?.linears.every((l) => l.ok) ?? false;

  return (
    <>
      <tr className="hover:bg-[#F7F9FC] dark:hover:bg-[#333A48]/40">
        <td className="px-4 py-3 font-medium text-[#1C2434] dark:text-[#DEE4EE]">{channel.name}</td>
        <td className="px-4 py-3">
          {!originBaseUrl || !cdnBaseUrl ? (
            <span className="text-xs text-[#8899A8]">—</span>
          ) : manifestQuery.isLoading ? (
            <span className="text-xs text-[#8899A8] animate-pulse">checking…</span>
          ) : manifestQuery.isError ? (
            <Badge label="error" tone="error" />
          ) : allOk ? (
            <Badge label="OK" tone="success" />
          ) : (
            <Badge label="Failed" tone="error" />
          )}
        </td>
        <td className="px-4 py-3 text-[#8899A8] text-xs">
          {channel.lastSync ? new Date(channel.lastSync).toLocaleString("es-ES") : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          {!manifestQuery.isLoading && manifestQuery.data && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-[#8899A8] hover:text-[#1C2434] dark:hover:text-white transition-colors select-none"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
        </td>
      </tr>
      {expanded && manifestQuery.data && (
        <tr className="bg-[#F7F9FC]/80 dark:bg-[#333A48]/20">
          <td colSpan={6} className="border-b border-[#E2E8F0] dark:border-[#2E3A47]">
            <div className="px-6 pb-4 pt-3">
              <LinearStatusGroups variant="dashboard" rows={buildLinearStatusRows(channel, manifestQuery.data)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FastChannelRow({ channel }: { channel: { name: string; uri: string } }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useFastChannelStreamStatusQuery(channel.uri);

  return (
    <>
      <tr className="hover:bg-[#F7F9FC] dark:hover:bg-[#333A48]/40">
        <td className="truncate px-4 py-3 font-medium text-[#1C2434] dark:text-[#DEE4EE]">{channel.name}</td>
        <td className="overflow-hidden text-ellipsis whitespace-nowrap px-4 py-3 font-mono text-xs text-[#64748B] dark:text-[#8899A8]">{channel.uri}</td>
        <td className="px-4 py-3">
          {isLoading ? (
            <span className="text-xs text-[#8899A8] animate-pulse">checking…</span>
          ) : isError ? (
            <Badge label="error" tone="error" />
          ) : data?.ok ? (
            <Badge label="OK" tone="success" />
          ) : (
            <Badge label="KO" tone="error" />
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {!isLoading && (data || isError) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-[#8899A8] hover:text-[#1C2434] dark:hover:text-white transition-colors select-none"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? "▲" : "▼"}
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#F7F9FC]/80 dark:bg-[#333A48]/20">
          <td colSpan={4} className="border-b border-[#E2E8F0] dark:border-[#2E3A47]">
            <div className="px-6 pb-4 pt-3">
              {isError ? (
                <span className="text-xs text-[#D34053]">Error al comprobar los manifests.</span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {data?.urls.map((entry) => (
                    <div
                      key={entry.url}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        entry.ok
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/20"
                          : "border-[#D34053]/30 bg-[#FEE2E2]"
                      }`}
                    >
                      <div className="font-mono text-slate-700 dark:text-slate-200 break-all">{entry.url}</div>
                      <div className={`mt-0.5 font-medium ${entry.ok ? "text-[#166534]" : "text-[#991B1B]"}`}>
                        {entry.httpStatus ? `HTTP ${entry.httpStatus}` : "Error"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DashboardPage() {
  const channelsQuery = useChannelsQuery();
  const fastChannelsQuery = useFastChannelsQuery();
  const bitmovinVodQuery = useBitmovinVodQuery({ page: 0, limit: 10 });
  const bitmovinVodItems = bitmovinVodQuery.data?.items ?? [];
  const channels = channelsQuery.data ?? [];
  const fastChannels = fastChannelsQuery.data ?? [];

  const { data: vmsSettings } = useVmsSettingsQuery();
  const originLiveUrl = vmsSettings?.origin.live ?? "";
  const cdnLiveUrl = vmsSettings?.akamai.live ?? "";
  const vodOriginUrl = vmsSettings?.origin.vod ?? "";

  const { bindText } = useManifestPathTooltip();

  // VOD manifest results for sorting
  const [vodManifestResults, setVodManifestResults] = useState<Record<string, boolean | null>>({});
  const handleVodManifestResult = useCallback((id: string, ok: boolean | null) => {
    setVodManifestResults((prev) => prev[id] === ok ? prev : { ...prev, [id]: ok });
  }, []);

  // Live Channels table: resize, search, sort
  const live = useColumnResize([
    { key: "channel", defaultWidth: 220 },
    { key: "status", defaultWidth: 100 },
    { key: "lastSync", defaultWidth: 160 },
    { key: "expand", defaultWidth: 40 },
  ]);
  const [liveSearch, setLiveSearch] = useState("");
  const [liveSortKey, setLiveSortKey] = useState<string | null>(null);
  const [liveSortDir, setLiveSortDir] = useState<"asc" | "desc">("asc");

  // Fast Channels table: resize
  const fast = useColumnResize([
    { key: "name", defaultWidth: 200 },
    { key: "uri", defaultWidth: 460 },
    { key: "status", defaultWidth: 110 },
    { key: "expand", defaultWidth: 48 },
  ]);

  const handleLiveSort = (key: string) => {
    if (liveSortKey === key) setLiveSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setLiveSortKey(key); setLiveSortDir("asc"); }
  };

  const liveSortIcon = (key: string) => liveSortKey === key ? (liveSortDir === "asc" ? " ↑" : " ↓") : " ↕";

  const liveFiltered = channels
    .filter((ch) => !liveSearch.trim() || ch.name.toLowerCase().includes(liveSearch.toLowerCase()))
    .sort((a, b) => {
      if (!liveSortKey) return 0;
      const aVal = liveSortKey === "channel" ? a.name : liveSortKey === "status" ? (a.status ?? "") : a.lastSync ?? "";
      const bVal = liveSortKey === "channel" ? b.name : liveSortKey === "status" ? (b.status ?? "") : b.lastSync ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return liveSortDir === "asc" ? cmp : -cmp;
    });

  // VOD columns
  type VodEntry = { _id: string; name?: string; status: string; finishedAt?: string };
  const vodColumns: ColumnDef<VodEntry>[] = [
    { key: "id", header: "ID", defaultWidth: 290, sortable: true, sortValue: (v) => v._id, render: (v) => <span className="font-mono text-[#8899A8]">{v._id}</span> },
    { key: "name", header: "Name", defaultWidth: 240, sortable: true, sortValue: (v) => v.name ?? v._id, render: (v) => <span {...bindText(v.name ?? v._id)} className="block truncate font-medium text-[#1C2434] dark:text-[#DEE4EE]">{v.name ?? v._id}</span> },
    { key: "status", header: "Status", defaultWidth: 110, sortable: true, sortValue: (v) => v.status, render: (v) => <Badge label={v.status} tone={vodStatusTone(v.status)} /> },
    { key: "manifest", header: "Manifest", defaultWidth: 100, sortable: true, sortValue: (v) => vodManifestResults[v._id] === true ? "0-ok" : vodManifestResults[v._id] === false ? "1-fail" : "2-pending", render: (v) => <VodManifestBadge id={v._id} encoder="bitmovin" originBase={vodOriginUrl} onResult={handleVodManifestResult} /> },
    { key: "finishedAt", header: "Finished At", defaultWidth: 140, sortable: true, sortValue: (v) => v.finishedAt ?? "", render: (v) => <span className="text-[#8899A8]">{v.finishedAt ? formatDate(v.finishedAt) : "—"}</span> },
  ];


  return (
    <AuthGuard>
    <AppShell>
      <div className="space-y-8">

        {/* Live Channels */}
        <section className="space-y-3">
          <SectionHeader title="Live Channels" count={channels.length} href="/live" />
          <div className="rounded-[10px] border border-[#E2E8F0] bg-white shadow-card dark:border-[#2E3A47] dark:bg-[#24303F]">
            <div className="border-b border-[#E2E8F0] px-4 py-3 dark:border-[#2E3A47]">
              <div className="relative w-full max-w-sm">
                <input
                  type="text"
                  value={liveSearch}
                  onChange={(e) => setLiveSearch(e.target.value)}
                  placeholder="Search channels…"
                  className="w-full rounded-md border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-1.5 text-sm text-[#1C2434] placeholder:text-[#8899A8] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-[#2E3A47] dark:bg-[#1A222C] dark:text-[#DEE4EE]"
                />
              </div>
            </div>
            {channelsQuery.isLoading ? (
              <div className="px-4 py-6 text-sm text-[#8899A8]">Cargando canales…</div>
            ) : channelsQuery.isError ? (
              <div className="px-4 py-6 text-sm text-[#D34053]">Error al cargar los canales.</div>
            ) : (
              <div className="overflow-x-auto">
                <table ref={live.tableRef} className="text-sm" style={live.getTableStyle()}>
                  <colgroup>
                    {(["channel", "status", "lastSync", "expand"] as const).map((k) => <col key={k} style={live.getColStyle(k)} />)}
                  </colgroup>
                  <thead className="border-b border-[#E2E8F0] bg-[#F7F9FC] text-[10px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2E3A47] dark:bg-[#1A222C]">
                    <tr>
                      {(["channel", "status", "lastSync"] as const).map((key) => (
                        <th key={key} className="relative select-none px-4 py-3 text-left" style={live.getColStyle(key)}>
                          <button onClick={() => handleLiveSort(key)} className="flex items-center gap-1 hover:text-[#1C2434] dark:hover:text-white">
                            {key === "channel" ? "Channel" : key === "status" ? "Status" : "Last sync"}
                            <span className="text-[#E2E8F0] dark:text-[#2E3A47]">{liveSortIcon(key)}</span>
                          </button>
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-brand-500/30" onMouseDown={(e) => live.startResize(key, e)} />
                        </th>
                      ))}
                      <th className="relative px-4 py-3" style={live.getColStyle("expand")}>
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-brand-500/30" onMouseDown={(e) => live.startResize("expand", e)} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E3A47]">
                    {liveFiltered.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-[#8899A8]">No channels</td></tr>
                    ) : liveFiltered.map((ch) => (
                      <ChannelManifestRow key={ch.id} channel={ch} originBaseUrl={originLiveUrl} cdnBaseUrl={cdnLiveUrl} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {(!originLiveUrl || !cdnLiveUrl) && (
            <p className="text-xs text-[#8899A8]">
              Configura <span className="font-medium">Origin Live</span> y <span className="font-medium">Akamai Live</span> en Settings para activar la comprobación de manifests.
            </p>
          )}
        </section>

        {/* VOD */}
        <section className="space-y-3">
          <SectionHeader title="VOD" count={bitmovinVodItems.length || undefined} href="/vod" />
          <div className="rounded-[10px] border border-[#E2E8F0] bg-white shadow-card dark:border-[#2E3A47] dark:bg-[#24303F]">
            {bitmovinVodQuery.isLoading ? (
              <div className="px-4 py-6 text-sm text-[#8899A8]">Loading VOD…</div>
            ) : bitmovinVodQuery.isError ? (
              <div className="px-4 py-6 text-sm text-[#D34053]">Failed to load VOD data.</div>
            ) : (
              <DataTable
                columns={vodColumns}
                data={bitmovinVodItems as VodEntry[]}
                getRowKey={(v) => v._id}
                searchable
                searchPlaceholder="Search VOD…"
                searchFn={(v, q) =>
                  (v.name ?? v._id).toLowerCase().includes(q.toLowerCase()) ||
                  v._id.toLowerCase().includes(q.toLowerCase())
                }
              />
            )}
          </div>
        </section>

        {/* Fast Channels */}
        <section className="space-y-3">
          <SectionHeader title="Fast Channels" count={fastChannels.length} href="/fast-channels" />
          <div className="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white shadow-card dark:border-[#2E3A47] dark:bg-[#24303F]">
            {fastChannelsQuery.isLoading ? (
              <div className="px-4 py-6 text-sm text-[#8899A8]">Loading…</div>
            ) : fastChannelsQuery.isError ? (
              <div className="px-4 py-6 text-sm text-[#D34053]">Error loading fast channels.</div>
            ) : (
              <div className="overflow-x-auto">
                <table ref={fast.tableRef} className="text-sm" style={fast.getTableStyle()}>
                  <colgroup>
                    {(["name", "uri", "status", "expand"] as const).map((k) => <col key={k} style={fast.getColStyle(k)} />)}
                  </colgroup>
                  <thead className="border-b border-[#E2E8F0] bg-[#F7F9FC] text-[10px] font-semibold uppercase tracking-wide text-[#64748B] dark:border-[#2E3A47] dark:bg-[#1A222C]">
                    <tr>
                      {(["name", "uri", "status"] as const).map((key) => (
                        <th key={key} className="relative select-none px-4 py-3 text-left" style={fast.getColStyle(key)}>
                          {key === "name" ? "Name" : key === "uri" ? "URI" : "Status"}
                          <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-brand-500/30" onMouseDown={(e) => fast.startResize(key, e)} />
                        </th>
                      ))}
                      <th className="relative px-4 py-3" style={fast.getColStyle("expand")}>
                        <div className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-brand-500/30" onMouseDown={(e) => fast.startResize("expand", e)} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#2E3A47]">
                    {fastChannels.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-[#8899A8]">No channels</td></tr>
                    ) : (
                      fastChannels.map((ch) => <FastChannelRow key={ch.name} channel={ch} />)
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </div>
    </AppShell>
    </AuthGuard>
  );
}
