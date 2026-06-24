"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { StreamPlayer, AdEvent, BufferStats } from "@/components/live/StreamPlayer";
import { usePlaybackDiagnostics } from "@/features/live/hooks";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { cn } from "@/lib/utils/cn";
import { DiagnosticsBlock } from "@/components/ui/DiagnosticsBlock";
import { usePlaybackSettings, useCdnToken, buildCdnAcl, formatOptions, drmOptions, cdnOptions, FormatKey, DrmKey, CdnKey } from "@/features/playback/hooks";

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
    const acl = buildCdnAcl(cdnBase, `/orivod/vod${encoderSegment}/${seg1}/${seg2}/${contentId}/*`);
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
      const acl = buildCdnAcl(cdnBase, `/orivod/vod${encoderSegment}/${seg1}/${seg2}/${contentId}/*`);
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Playback Diagnostics</div>
          <div className="text-xs text-slate-500">Compare origin vs CDN playback.</div>
        </div>
        <Badge label={mode === "direct" ? "Origin" : "CDN"} tone="default" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant={playerActive && mode === "direct" ? "primary" : "secondary"}
          onClick={runOrigin}
        >
          {playerActive && mode === "direct" ? "Origin Active" : "Origin"}
        </Button>
        <Button
          variant={playerActive && mode === "cdn" ? "primary" : "secondary"}
          onClick={runCdn}
        >
          {playerActive && mode === "cdn" ? "CDN Active" : "CDN"}
        </Button>
        {!playerActive && (
          <span className="text-xs text-slate-500">Press Origin or CDN to start playback.</span>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="justify-self-end text-xs text-slate-500">
          Format: {resolvedFormatLabel} · DRM: {resolvedDrmLabel} · CDN: {resolvedCdnLabel}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Select
          label="Streaming Format"
          options={formatOptions}
          value={formatKey}
          onChange={(e) => setFormatKey(e.target.value as FormatKey)}
        />
        <Select
          label="DRM"
          options={drmOptions}
          value={drmKey}
          onChange={(e) => setDrmKey(e.target.value as DrmKey)}
        />
        <Select
          label="CDN Provider"
          options={cdnOptions}
          value={cdnKey}
          onChange={(e) => setCdnKey(e.target.value as CdnKey)}

        />
      </div>

      <div className="mt-4 flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        {/* Player + Ad Events */}
        <div className="w-1/3 shrink-0 space-y-3">
          {playerActive ? (
            <StreamPlayer
              url={mode === "cdn" ? cdnUrl : originUrl}
              format={formatKey}
              cdnToken={mode === "cdn" ? cdnToken ?? undefined : undefined}
              onAdEvent={handleAdEvent}
              onBufferUpdate={setBufferStats}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              Select Origin or CDN to start playback.
            </div>
          )}
          {playerActive && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">Buffering</div>
              {bufferStats ? (
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className={`rounded px-1 py-1 ${bufferStats.buffering ? "bg-amber-100 dark:bg-amber-900/40" : "bg-slate-50 dark:bg-slate-800"}`}>
                    <div className="text-[10px] text-slate-400">Events</div>
                    <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{bufferStats.count}</div>
                  </div>
                  <div className="rounded bg-slate-50 px-1 py-1 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-400">Total</div>
                    <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{bufferStats.totalTime.toFixed(1)}s</div>
                  </div>
                  <div className="rounded bg-slate-50 px-1 py-1 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-400">Last</div>
                    <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{bufferStats.lastDuration.toFixed(1)}s</div>
                  </div>
                </div>
              ) : (
                <div className="py-1 text-center text-[11px] text-slate-400">No buffering detected.</div>
              )}
            </div>
          )}
          {playerActive && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Ad Events ({adEvents.length})
                </span>
                {adEvents.length > 0 && (
                  <button
                    onClick={() => setAdEvents([])}
                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-1 max-h-40 overflow-y-auto">
                {adEvents.length === 0 ? (
                  <div className="py-2 text-center text-[11px] text-slate-400">No ad events detected yet.</div>
                ) : (
                  <ul className="space-y-1">
                    {adEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded border border-slate-100 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none",
                              event.type === "scte35" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              : event.type === "cue" ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                              : event.type === "daterange" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : event.type === "stream" ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                              : event.type === "emsg" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            )}
                          >
                            {event.type}
                          </span>
                          <span className="truncate text-[10px] text-slate-600 dark:text-slate-300">{event.detail}</span>
                        </div>
                        {event.plannedDuration != null && (
                          <div className="mt-0.5 pl-1 text-[10px] text-slate-500 dark:text-slate-400">
                            Planned duration: {event.plannedDuration.toFixed(1)}s
                          </div>
                        )}
                        {event.messageData != null && (
                          <div className="mt-0.5 pl-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <div className="font-medium">X-MESSAGE-DATA (parsed):</div>
                            <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-1 text-[9px] dark:bg-slate-800">
                              ID3: {event.messageData || "(empty)"}
                            </pre>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Diagnostics: Origin + CDN side by side */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Origin */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Origin</div>
            <div className="space-y-1">
              <div className="break-all"><span className="font-semibold">URL:</span> {originBase || "Not configured in Settings"}</div>
              <div className="break-all"><span className="font-semibold">Playback URL:</span> {originUrl}</div>
            </div>
            {(diagnosticsOrigin.isPending || diagnosticsOrigin.data) && (
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                <DiagnosticsBlock diagnostics={diagnosticsOrigin} />
              </div>
            )}
          </div>

          {/* CDN */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">CDN</div>
            <div className="space-y-1">
              <div className="break-all"><span className="font-semibold">URL:</span> {cdnBase || "Not configured in Settings"}</div>
              <div className="break-all"><span className="font-semibold">Playback URL:</span> {cdnPlaybackUrl}</div>
            </div>
            {(diagnosticsCdn.isPending || diagnosticsCdn.data) && (
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                <DiagnosticsBlock diagnostics={diagnosticsCdn} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
