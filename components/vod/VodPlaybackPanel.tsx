"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { StreamPlayer, AdEvent, BufferStats } from "@/components/live/StreamPlayer";
import { usePlaybackDiagnostics } from "@/features/live/hooks";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { DiagnosticsBlock } from "@/components/ui/DiagnosticsBlock";
import { AdEventsList } from "@/components/playback/AdEventsList";
import { BufferingChips } from "@/components/playback/BufferingChips";
import { DiagnosticsRail } from "@/components/playback/DiagnosticsRail";
import { EndpointCard } from "@/components/playback/EndpointCard";
import { usePlaybackSettings, useCdnToken, buildCdnAcl, formatOptions, drmOptions, cdnOptions, FormatKey, DrmKey, CdnKey } from "@/features/playback/hooks";
import { vodAclPath } from "@/features/playback/acl";

type PlaybackMode = "direct" | "cdn";

export function VodPlaybackPanel({ contentId, encoder }: { contentId: string; encoder?: string }) {
  const { formatKey, setFormatKey, drmKey, setDrmKey, cdnKey, setCdnKey, extension, drmSegment } =
    usePlaybackSettings();
  const { data: vmsSettings } = useVmsSettingsQuery();
  const [mode, setMode] = useState<PlaybackMode>("direct");
  const [playerActive, setPlayerActive] = useState(false);
  const [adEvents, setAdEvents] = useState<AdEvent[]>([]);
  const [bufferStats, setBufferStats] = useState<BufferStats | null>(null);
  const [cdnToken, setCdnToken] = useState<string | null>(null);
  const cdnTokenMutation = useCdnToken();
  const diagnosticsOrigin = usePlaybackDiagnostics();
  const diagnosticsCdn = usePlaybackDiagnostics();
  const cdnRunVersionRef = useRef(0);

  const handleAdEvent = useCallback((event: AdEvent) => {
    setAdEvents((prev) => [...prev, event]);
  }, []);

  useEffect(() => {
    setPlayerActive(false);
    setCdnToken(null);
  }, [contentId]);

  const distOriginVod = vmsSettings?.origin.vod ?? "";
  const distCdnVod = { akamai: vmsSettings?.akamai.vod ?? "", fastly: vmsSettings?.fastly.vod ?? "" };
  const originBase = distOriginVod;
  const activeCdnVod = distCdnVod;
  const cdnBase = activeCdnVod[cdnKey] ?? "";
  const seg1 = contentId.slice(0, 2);
  const seg2 = contentId.slice(2, 4);
  const encoderSegment = encoder ? `/${encoder}` : "";

  const originUrl = `${originBase}/orivod/vod${encoderSegment}/${seg1}/${seg2}/${contentId}${drmSegment}/main.ism/${extension}`;
  const cdnUrl = `${cdnBase}/orivod/vod${encoderSegment}/${seg1}/${seg2}/${contentId}${drmSegment}/main.ism/${extension}`;
  const cdnPlaybackUrl = cdnToken ? `${cdnUrl}?${cdnToken}` : cdnUrl;

  useEffect(() => {
    if (!diagnosticsOrigin.data || !originUrl) return;
    void diagnosticsOrigin.mutateAsync({ url: originUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originUrl]);

  useEffect(() => {
    if (!playerActive || !diagnosticsCdn.data || !cdnPlaybackUrl) return;
    void diagnosticsCdn.mutateAsync({ url: cdnPlaybackUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdnPlaybackUrl, playerActive]);

  useEffect(() => {
    if (mode !== "cdn" || drmKey !== "clear" || !cdnBase) return;
    ++cdnRunVersionRef.current;
    if (!playerActive) return;
    const version = cdnRunVersionRef.current;
    setPlayerActive(false);
    setCdnToken(null);
    const acl = buildCdnAcl(cdnBase, vodAclPath(encoder ?? "", contentId));
    void cdnTokenMutation.mutateAsync({ provider: cdnKey, acl, contentType: "vod" })
      .then(token => {
        if (cdnRunVersionRef.current !== version) return;
        setCdnToken(token);
        setPlayerActive(true);
      })
      .catch(() => {
        if (cdnRunVersionRef.current !== version) return;
        setCdnToken(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdnKey]);

  const runOrigin = async () => {
    setMode("direct");
    setPlayerActive(true);
    setAdEvents([]);
    setBufferStats(null);
    await diagnosticsOrigin.mutateAsync({ url: originUrl });
  };

  const runCdn = async () => {
    const version = ++cdnRunVersionRef.current;
    setMode("cdn");
    setPlayerActive(false);
    setAdEvents([]);
    setBufferStats(null);
    setCdnToken(null);

    let token: string | null = null;
    let diagnosticsUrl = cdnUrl;
    if (drmKey === "clear" && cdnBase) {
      const acl = buildCdnAcl(cdnBase, vodAclPath(encoder ?? "", contentId));
      try {
        token = await cdnTokenMutation.mutateAsync({ provider: cdnKey, acl, contentType: "vod" });
        diagnosticsUrl = `${cdnUrl}?${token}`;
      } catch {
        token = null;
      }
    }
    if (cdnRunVersionRef.current !== version) return;
    setCdnToken(token);
    setPlayerActive(true);
    await diagnosticsCdn.mutateAsync({ url: diagnosticsUrl });
  };

  const resolvedFormatLabel = useMemo(
    () => formatOptions.find((o) => o.value === formatKey)?.label ?? "HLS",
    [formatKey]
  );
  const resolvedDrmLabel = useMemo(
    () => drmOptions.find((o) => o.value === drmKey)?.label ?? "Clear",
    [drmKey]
  );
  const resolvedCdnLabel = useMemo(
    () => cdnOptions.find((o) => o.value === cdnKey)?.label ?? "Akamai",
    [cdnKey]
  );

  const statuses = [diagnosticsOrigin, diagnosticsCdn]
    .filter((d) => !d.isPending && d.data?.httpStatus != null)
    .map((d) => d.data!.httpStatus!);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Playback Diagnostics</div>
          <div className="text-xs text-slate-500">Compare origin vs CDN playback.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!playerActive && (
            <span className="text-xs text-slate-500">Press Origin or CDN to start playback.</span>
          )}
          <Button
            size="sm"
            variant={playerActive && mode === "direct" ? "primary" : "secondary"}
            onClick={runOrigin}
          >
            {playerActive && mode === "direct" ? "Origin Active" : "Origin"}
          </Button>
          <Button
            size="sm"
            variant={playerActive && mode === "cdn" ? "primary" : "secondary"}
            onClick={runCdn}
          >
            {playerActive && mode === "cdn" ? "CDN Active" : "CDN"}
          </Button>
          <Badge label={mode === "direct" ? "Origin" : "CDN"} tone="default" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Select
          size="sm"
          label="Streaming Format"
          options={formatOptions}
          value={formatKey}
          onChange={(e) => setFormatKey(e.target.value as FormatKey)}
        />
        <Select
          size="sm"
          label="DRM"
          options={drmOptions}
          value={drmKey}
          onChange={(e) => setDrmKey(e.target.value as DrmKey)}
        />
        <Select
          size="sm"
          label="CDN Provider"
          options={cdnOptions}
          value={cdnKey}
          onChange={(e) => setCdnKey(e.target.value as CdnKey)}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <div>
          {playerActive ? (
            <StreamPlayer
              url={mode === "cdn" ? cdnUrl : originUrl}
              format={formatKey}
              cdnToken={mode === "cdn" ? cdnToken ?? undefined : undefined}
              onAdEvent={handleAdEvent}
              onBufferUpdate={setBufferStats}
              infoLabel={`Format: ${resolvedFormatLabel} · DRM: ${resolvedDrmLabel} · CDN: ${resolvedCdnLabel}`}
              stripExtra={<BufferingChips stats={bufferStats} />}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              Select Origin or CDN to start playback.
            </div>
          )}
        </div>

        <DiagnosticsRail
          defaultTab="diag"
          adCountLabel={String(adEvents.length)}
          statuses={statuses}
          adEvents={
            playerActive ? (
              <AdEventsList events={adEvents} totalCount={adEvents.length} onClear={() => setAdEvents([])} />
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Start playback to capture ad events.</div>
            )
          }
          diagnostics={
            <div className="flex flex-col gap-2.5">
              <EndpointCard
                title="Origin"
                rows={[
                  { label: "URL:", value: originBase || "Not configured in Settings" },
                  { label: "Playback URL:", value: originUrl },
                ]}
              >
                {(diagnosticsOrigin.isPending || diagnosticsOrigin.data) && (
                  <DiagnosticsBlock diagnostics={diagnosticsOrigin} />
                )}
              </EndpointCard>
              <EndpointCard
                title="CDN"
                rows={[
                  { label: "URL:", value: cdnBase || "Not configured in Settings" },
                  { label: "Playback URL:", value: cdnPlaybackUrl },
                ]}
              >
                {(diagnosticsCdn.isPending || diagnosticsCdn.data) && (
                  <DiagnosticsBlock diagnostics={diagnosticsCdn} />
                )}
              </EndpointCard>
            </div>
          }
        />
      </div>
    </div>
  );
}
