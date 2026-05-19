"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResolvedChannel, PlaybackMode } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { usePlaybackDiagnostics } from "@/features/live/hooks";
import { Badge } from "@/components/ui/Badge";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { cn } from "@/lib/utils/cn";
import { DiagnosticsBlock } from "@/components/ui/DiagnosticsBlock";
import { Select } from "@/components/ui/Select";
import { StreamPlayer, AdEvent } from "@/components/live/StreamPlayer";
import {
  usePlaybackSettings,
  formatOptions,
  drmOptions,
  cdnOptions,
  FormatKey,
  DrmKey,
  CdnKey,
} from "@/features/playback/hooks";

export function PlaybackPanel({ channel }: { channel: ResolvedChannel }) {
  const { formatKey, setFormatKey, drmKey, setDrmKey, cdnKey, setCdnKey, extension, drmSegment } =
    usePlaybackSettings();
  const { data: vmsSettings } = useVmsSettingsQuery();
  const [mode, setMode] = useState<PlaybackMode>("direct");
  const [playerActive, setPlayerActive] = useState(false);
  const [selectedLinearIdx, setSelectedLinearIdx] = useState(0);
  const [adEvents, setAdEvents] = useState<AdEvent[]>([]);
  const [adEventFilter, setAdEventFilter] = useState<Set<AdEvent["type"]>>(new Set());
  const [adEventSearch, setAdEventSearch] = useState("");
  const [showNoLinearWarning, setShowNoLinearWarning] = useState(false);
  const diagnostics = usePlaybackDiagnostics();
  const lastFetchedUrlRef = useRef<string>("");

  const handleAdEvent = useCallback((event: AdEvent) => {
    setAdEvents((prev) => [...prev, event]);
  }, []);

  const filteredAdEvents = useMemo(() => {
    let events = adEvents;
    if (adEventFilter.size > 0) {
      events = events.filter((e) => adEventFilter.has(e.type));
    }
    if (adEventSearch.trim()) {
      const q = adEventSearch.toLowerCase();
      events = events.filter((e) => e.detail.toLowerCase().includes(q) || e.messageData?.toLowerCase().includes(q));
    }
    return events;
  }, [adEvents, adEventFilter, adEventSearch]);

  const adEventTypes = useMemo(() => {
    const types = new Set<AdEvent["type"]>();
    for (const e of adEvents) types.add(e.type);
    return types;
  }, [adEvents]);

  const toggleAdEventFilter = useCallback((type: AdEvent["type"]) => {
    setAdEventFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  useEffect(() => {
    const platform = channel.platform.toLowerCase();
    if (platform.includes("dash")) setFormatKey("dash");
    else if (platform.includes("smooth")) setFormatKey("smooth");
    else setFormatKey("hls");
    setPlayerActive(false);
    setSelectedLinearIdx(0);
    setShowNoLinearWarning(false);
  }, [channel.platform, setFormatKey]);

  const distOriginLive = vmsSettings?.origin.live;
  const distCdnLive = { akamai: vmsSettings?.akamai.live ?? "", fastly: vmsSettings?.fastly.live ?? "" };
  const originBase = distOriginLive;
  const activeCdnLive = distCdnLive;
  const cdnBase = activeCdnLive[cdnKey] || "";
  const path = String(channel.id);
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  const runDiagnostics = async (nextMode: PlaybackMode) => {
    if (nextMode === "direct" && podsWithLinears.length === 0) {
      setShowNoLinearWarning(true);
      return;
    }
    setShowNoLinearWarning(false);
    setMode(nextMode);
    setPlayerActive(true);
    setAdEvents([]);
    const url = nextMode === "direct" ? originUrl : cdnUrl;
    lastFetchedUrlRef.current = url;
    await diagnostics.mutateAsync({ url });
  };

  const podsWithLinears = channel.pods.filter((p) => p.linear !== null);
  const selectedPod = podsWithLinears[selectedLinearIdx] ?? null;
  const originUrl = selectedPod
    ? `${originBase}/${selectedPod.name}/live/${selectedPod.linear!.linearName}/main/main.isml/${extension}`
    : "";
  const cdnUrl = `${cdnBase}/${normalizedPath}${drmSegment}${extension}`;
  const playbackUrl = mode === "direct" ? originUrl : cdnUrl;
  const activeUrl = mode === "direct" ? originUrl : cdnUrl;

  useEffect(() => {
    if (!playerActive || !activeUrl || activeUrl === lastFetchedUrlRef.current) return;
    lastFetchedUrlRef.current = activeUrl;
    void diagnostics.mutateAsync({ url: activeUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl]);

  const linearOptions = podsWithLinears.map((p, i) => ({
    label: `${p.linear!.linearName} (${p.name})`,
    value: String(i),
  }));

  const resolvedFormatLabel = useMemo(
    () => formatOptions.find((option) => option.value === formatKey)?.label ?? "HLS",
    [formatKey]
  );

  const resolvedDrmLabel = useMemo(
    () => drmOptions.find((option) => option.value === drmKey)?.label ?? "Clear",
    [drmKey]
  );

  const resolvedCdnLabel = useMemo(
    () => cdnOptions.find((option) => option.value === cdnKey)?.label ?? "Akamai",
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
          onClick={() => runDiagnostics("direct")}
        >
          {playerActive && mode === "direct" ? "Origin Active" : "Origin"}
        </Button>
        <Button
          variant={playerActive && mode === "caronte" ? "primary" : "secondary"}
          onClick={() => runDiagnostics("caronte")}
        >
          {playerActive && mode === "caronte" ? "CDN Active" : "CDN"}
        </Button>
        {showNoLinearWarning ? (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            No linears found. Create a linear for this channel first.
          </span>
        ) : !playerActive ? (
          <span className="text-xs text-slate-500">Press Origin or CDN to start playback.</span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="justify-self-end text-xs text-slate-500">
          Format: {resolvedFormatLabel} · DRM: {resolvedDrmLabel} · CDN: {resolvedCdnLabel}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Select
          label="Linear"
          options={linearOptions.length > 0 ? linearOptions : [{ label: "No linears", value: "" }]}
          value={linearOptions.length > 0 ? String(selectedLinearIdx) : ""}
          onChange={(event) => setSelectedLinearIdx(Number(event.target.value))}
          disabled={linearOptions.length === 0}
        />
        <Select
          label="Streaming Format"
          options={formatOptions}
          value={formatKey}
          onChange={(event) => setFormatKey(event.target.value as FormatKey)}
        />
        <Select
          label="DRM"
          options={drmOptions}
          value={drmKey}
          onChange={(event) => setDrmKey(event.target.value as DrmKey)}
        />
        <Select
          label="CDN Provider"
          options={cdnOptions}
          value={cdnKey}
          onChange={(event) => setCdnKey(event.target.value as CdnKey)}
        />
      </div>

      <div className="mt-4 flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
        <div className="w-1/3 shrink-0 space-y-3">
          {playerActive ? (
            <StreamPlayer
              url={playbackUrl}
              format={formatKey}
              onAdEvent={handleAdEvent}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              Select Origin or CDN to start playback.
            </div>
          )}

          {playerActive && (
            <div className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Ad Events ({filteredAdEvents.length}/{adEvents.length})
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
              {adEvents.length > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {(["scte35", "cue", "daterange", "stream", "emsg", "id3"] as const)
                      .filter((t) => adEventTypes.has(t))
                      .map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleAdEventFilter(type)}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none transition-opacity",
                            adEventFilter.size === 0 || adEventFilter.has(type)
                              ? "opacity-100"
                              : "opacity-30",
                            type === "scte35"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                              : type === "cue"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                                : type === "daterange"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : type === "stream"
                                    ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                                    : type === "emsg"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                  </div>
                  <input
                    type="text"
                    value={adEventSearch}
                    onChange={(e) => setAdEventSearch(e.target.value)}
                    placeholder="Search events..."
                    className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
              )}
              <div className="mt-1 max-h-40 overflow-y-auto">
                {filteredAdEvents.length === 0 ? (
                  <div className="py-2 text-center text-[11px] text-slate-400">
                    {adEvents.length === 0 ? "No ad events detected yet." : "No events match the current filter."}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {filteredAdEvents.map((event) => (
                      <li
                        key={event.id}
                        className="rounded border border-slate-100 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none",
                              event.type === "scte35"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                : event.type === "cue"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                                  : event.type === "daterange"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                    : event.type === "stream"
                                      ? "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300"
                                      : event.type === "emsg"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            )}
                          >
                            {event.type}
                          </span>
                          <span className="truncate text-[10px] text-slate-600 dark:text-slate-300">
                            {event.detail}
                          </span>
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
        <div className="min-w-0 flex-1">
          <div className="space-y-2">
            <div>
              <span className="font-semibold">Origin:</span> {originBase || "Not set"}
            </div>
            <div>
              <span className="font-semibold">CDN:</span> {cdnBase || "Not set (using fallback)"}
            </div>
            <div className="break-all">
              <span className="font-semibold">Playback URL:</span> {playbackUrl}
            </div>
          </div>
          <div className="mt-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <DiagnosticsBlock
              diagnostics={diagnostics}
              idleText="Run a playback build to see the diagnostics."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
