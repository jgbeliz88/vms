"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResolvedChannel, PlaybackMode } from "@/features/live/types";
import { Button } from "@/components/ui/Button";
import { usePlaybackDiagnostics } from "@/features/live/hooks";
import { Badge } from "@/components/ui/Badge";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { DiagnosticsBlock } from "@/components/ui/DiagnosticsBlock";
import { Select } from "@/components/ui/Select";
import { StreamPlayer, AdEvent } from "@/components/live/StreamPlayer";
import { AdEventsList } from "@/components/playback/AdEventsList";
import { DiagnosticsRail } from "@/components/playback/DiagnosticsRail";
import { EndpointCard } from "@/components/playback/EndpointCard";
import {
  usePlaybackSettings,
  useCdnToken,
  buildCdnAcl,
  formatOptions,
  drmOptions,
  cdnOptions,
  FormatKey,
  DrmKey,
  CdnKey,
} from "@/features/playback/hooks";
import { liveAclPath } from "@/features/playback/acl";

export function PlaybackPanel({ channel }: { channel: ResolvedChannel }) {
  const { formatKey, setFormatKey, drmKey, setDrmKey, cdnKey, setCdnKey, extension } =
    usePlaybackSettings();
  const { data: vmsSettings } = useVmsSettingsQuery();
  const [mode, setMode] = useState<PlaybackMode>("direct");
  const [playerActive, setPlayerActive] = useState(false);
  const [selectedLinearIdx, setSelectedLinearIdx] = useState(0);
  const [adEvents, setAdEvents] = useState<AdEvent[]>([]);
  const [adEventFilter, setAdEventFilter] = useState<Set<AdEvent["type"]>>(new Set());
  const [adEventSearch, setAdEventSearch] = useState("");
  const [showNoLinearWarning, setShowNoLinearWarning] = useState(false);
  // Remember which provider minted the token so a provider switch never pairs
  // the new CDN base with the previous provider's token.
  const [cdnTokenState, setCdnTokenState] = useState<{ provider: CdnKey; value: string } | null>(null);
  const [selectedCdnLinearName, setSelectedCdnLinearName] = useState<string>("");
  const cdnTokenMutation = useCdnToken();
  const diagnostics = usePlaybackDiagnostics();
  const lastFetchedUrlRef = useRef<string>("");
  const cdnRunVersionRef = useRef(0);

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
    setFormatKey("hls");
    setPlayerActive(false);
    setSelectedLinearIdx(0);
    setShowNoLinearWarning(false);
    setCdnTokenState(null);
    setSelectedCdnLinearName("");
  }, [channel.id, setFormatKey]);

  const distOriginLive = vmsSettings?.origin.live;
  const distCdnLive = { akamai: vmsSettings?.akamai.live ?? "", fastly: vmsSettings?.fastly.live ?? "" };
  const originBase = distOriginLive;
  const activeCdnLive = distCdnLive;
  const cdnBase = activeCdnLive[cdnKey] || "";

  const podsWithLinears = channel.pods.filter((p) => p.linear !== null);
  const selectedPod = podsWithLinears[selectedLinearIdx] ?? null;
  const uniqueLinearNames = [...new Set(
    podsWithLinears
      .map(p => p.linear!.linearName)
      .filter((n): n is string => Boolean(n))
  )];
  const effectiveCdnLinear = selectedCdnLinearName || uniqueLinearNames[0] || "";
  const originUrl = selectedPod
    ? `${originBase}/${selectedPod.name}/live/${selectedPod.linear!.linearName}/main/main.isml/${extension}`
    : "";
  const cdnUrl = effectiveCdnLinear
    ? `${cdnBase}/ori${effectiveCdnLinear}/live/${effectiveCdnLinear}/main/main.isml/${extension}`
    : "";
  const cdnToken = cdnTokenState?.provider === cdnKey ? cdnTokenState.value : null;
  const cdnPlaybackUrl = cdnToken ? `${cdnUrl}?${cdnToken}` : cdnUrl;
  const activePlaybackUrl = mode === "cdn" ? cdnPlaybackUrl : originUrl;

  const runDiagnostics = async (nextMode: PlaybackMode) => {
    if (nextMode === "direct" && podsWithLinears.length === 0) {
      setShowNoLinearWarning(true);
      return;
    }
    if (nextMode === "cdn" && !effectiveCdnLinear) {
      setShowNoLinearWarning(true);
      return;
    }
    const version = ++cdnRunVersionRef.current;
    setShowNoLinearWarning(false);
    setMode(nextMode);
    setPlayerActive(false);
    setAdEvents([]);
    setCdnTokenState(null);

    let diagnosticsUrl = nextMode === "direct" ? originUrl : cdnUrl;

    if (nextMode === "cdn" && drmKey === "clear" && cdnBase && effectiveCdnLinear) {
      const acl = buildCdnAcl(cdnBase, liveAclPath(effectiveCdnLinear));
      let token: string | null = null;
      try {
        token = await cdnTokenMutation.mutateAsync({ provider: cdnKey, acl, contentType: "live" });
        diagnosticsUrl = `${cdnUrl}?${token}`;
      } catch {
        token = null;
      }
      if (cdnRunVersionRef.current !== version) return;
      setCdnTokenState(token ? { provider: cdnKey, value: token } : null);
    }

    if (cdnRunVersionRef.current !== version) return;
    setPlayerActive(true);
    lastFetchedUrlRef.current = diagnosticsUrl;
    await diagnostics.mutateAsync({ url: diagnosticsUrl });
  };

  // Re-probe whatever the player is actually loading when an option changes.
  // In CDN + Clear mode, wait for the token instead of probing the bare URL.
  useEffect(() => {
    if (!playerActive || !activePlaybackUrl || activePlaybackUrl === lastFetchedUrlRef.current) return;
    if (mode === "cdn" && drmKey === "clear" && !cdnToken) return;
    lastFetchedUrlRef.current = activePlaybackUrl;
    void diagnostics.mutateAsync({ url: activePlaybackUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaybackUrl, playerActive]);

  useEffect(() => {
    if (mode !== "cdn" || drmKey !== "clear" || !cdnBase || !effectiveCdnLinear) return;
    ++cdnRunVersionRef.current;
    if (!playerActive) return;
    const version = cdnRunVersionRef.current;
    setPlayerActive(false);
    setCdnTokenState(null);
    const acl = buildCdnAcl(cdnBase, liveAclPath(effectiveCdnLinear));
    void cdnTokenMutation.mutateAsync({ provider: cdnKey, acl, contentType: "live" })
      .then(token => {
        if (cdnRunVersionRef.current !== version) return;
        setCdnTokenState({ provider: cdnKey, value: token });
        setPlayerActive(true);
      })
      .catch(() => {
        if (cdnRunVersionRef.current !== version) return;
        setCdnTokenState(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cdnKey]);

  const linearOptions = podsWithLinears.map((p, i) => ({
    label: `${p.linear!.linearName} (${p.name})`,
    value: String(i),
  }));
  const cdnLinearOptions = uniqueLinearNames.map(name => ({ label: name, value: name }));

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

  const diagnosticsStatus = diagnostics.data?.httpStatus;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Playback Diagnostics</div>
          <div className="text-xs text-slate-500">Compare origin vs CDN playback.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showNoLinearWarning ? (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              No linears found. Create a linear for this channel first.
            </span>
          ) : !playerActive ? (
            <span className="text-xs text-slate-500">Press Origin or CDN to start playback.</span>
          ) : null}
          <Button
            size="sm"
            variant={playerActive && mode === "direct" ? "primary" : "secondary"}
            onClick={() => runDiagnostics("direct")}
          >
            {playerActive && mode === "direct" ? "Origin Active" : "Origin"}
          </Button>
          <Button
            size="sm"
            variant={playerActive && mode === "cdn" ? "primary" : "secondary"}
            onClick={() => runDiagnostics("cdn")}
          >
            {playerActive && mode === "cdn" ? "CDN Active" : "CDN"}
          </Button>
          <Badge label={mode === "direct" ? "Origin" : "CDN"} tone="default" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {mode === "direct" ? (
          <Select
            size="sm"
            label="Linear"
            options={linearOptions.length > 0 ? linearOptions : [{ label: "No linears", value: "" }]}
            value={linearOptions.length > 0 ? String(selectedLinearIdx) : ""}
            onChange={(event) => setSelectedLinearIdx(Number(event.target.value))}
            disabled={linearOptions.length === 0}
          />
        ) : (
          <Select
            size="sm"
            label="Linear"
            options={cdnLinearOptions.length > 0 ? cdnLinearOptions : [{ label: "No linears", value: "" }]}
            value={effectiveCdnLinear}
            onChange={(event) => setSelectedCdnLinearName(event.target.value)}
            disabled={cdnLinearOptions.length === 0}
          />
        )}
        <Select
          size="sm"
          label="Streaming Format"
          options={formatOptions}
          value={formatKey}
          onChange={(event) => setFormatKey(event.target.value as FormatKey)}
        />
        <Select
          size="sm"
          label="DRM"
          options={drmOptions}
          value={drmKey}
          onChange={(event) => setDrmKey(event.target.value as DrmKey)}
        />
        <Select
          size="sm"
          label="CDN Provider"
          options={cdnOptions}
          value={cdnKey}
          onChange={(event) => setCdnKey(event.target.value as CdnKey)}
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
              infoLabel={`Format: ${resolvedFormatLabel} · DRM: ${resolvedDrmLabel} · CDN: ${resolvedCdnLabel}`}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950">
              Select Origin or CDN to start playback.
            </div>
          )}
        </div>

        <DiagnosticsRail
          adCountLabel={`${filteredAdEvents.length}/${adEvents.length}`}
          statuses={diagnosticsStatus != null && !diagnostics.isPending ? [diagnosticsStatus] : []}
          adEvents={
            playerActive ? (
              <AdEventsList
                events={filteredAdEvents}
                totalCount={adEvents.length}
                onClear={() => setAdEvents([])}
                filter={{
                  types: adEventTypes,
                  selected: adEventFilter,
                  onToggle: toggleAdEventFilter,
                  search: adEventSearch,
                  onSearch: setAdEventSearch,
                }}
              />
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Start playback to capture ad events.</div>
            )
          }
          diagnostics={
            <EndpointCard
              title="Origin vs CDN"
              rows={[
                { label: "Origin:", value: originBase || "Not set" },
                { label: "CDN:", value: cdnBase || "Not set (using fallback)" },
                { label: "Playback URL:", value: activePlaybackUrl },
              ]}
            >
              <DiagnosticsBlock
                diagnostics={diagnostics}
                idleText="Run a playback build to see the diagnostics."
              />
            </EndpointCard>
          }
        />
      </div>
    </div>
  );
}
