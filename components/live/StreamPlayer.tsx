"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type AdEvent = {
  id: string;
  type: "scte35" | "daterange" | "cue" | "emsg" | "id3" | "stream";
  timestamp: number;
  duration?: number;
  plannedDuration?: number;
  messageData?: string;
  detail: string;
};

export type BufferStats = {
  count: number;
  totalTime: number;
  lastDuration: number;
  buffering: boolean;
};

type AudioTrack = {
  id: number;
  name: string;
  lang: string;
};

type Rendition = {
  index: number;
  width: number;
  height: number;
  bitrate: number;
};

type StreamPlayerProps = {
  url: string;
  format: "hls" | "dash" | "smooth";
  cdnToken?: string;
  onAdEvent?: (event: AdEvent) => void;
  onBufferUpdate?: (stats: BufferStats) => void;
  /** Display-only summary of the current settings, e.g. "Format: HLS · DRM: Clear · CDN: Akamai". */
  infoLabel?: string;
  /** Extra content for the strip under the video (e.g. buffering stats). */
  stripExtra?: ReactNode;
};

/** Parse ID3v2 TXXX frames from raw bytes and return "key=value" pairs */
function parseId3Txxx(bytes: Uint8Array): string | null {
  // Verify ID3v2 header: "ID3"
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;

  // ID3v2 header is 10 bytes; frame data starts after
  let offset = 10;
  const results: string[] = [];

  while (offset + 10 < bytes.length) {
    const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const frameSize =
      (bytes[offset + 4] << 24) |
      (bytes[offset + 5] << 16) |
      (bytes[offset + 6] << 8) |
      bytes[offset + 7];
    const frameDataStart = offset + 10; // 4 id + 4 size + 2 flags

    if (frameSize <= 0 || frameDataStart + frameSize > bytes.length) break;

    if (frameId === "TXXX") {
      // encoding byte (0 = ISO-8859-1, 3 = UTF-8) + null-terminated description + value
      const encoding = bytes[frameDataStart];
      const content = bytes.slice(frameDataStart + 1, frameDataStart + frameSize);
      const nullIdx = content.indexOf(0);
      if (nullIdx !== -1) {
        const decoder = new TextDecoder(encoding === 3 ? "utf-8" : "iso-8859-1");
        const description = decoder.decode(content.slice(0, nullIdx));
        const value = decoder.decode(content.slice(nullIdx + 1));
        results.push(`${description}=${value}`);
      }
    }

    offset = frameDataStart + frameSize;
  }

  return results.length > 0 ? results.join(", ") : null;
}

/** "1080p · 5.2 Mbps", or just the bitrate when the rendition has no height */
function formatRendition(r: Rendition): string {
  const rate = r.bitrate >= 1_000_000
    ? `${(r.bitrate / 1_000_000).toFixed(1)} Mbps`
    : `${Math.round(r.bitrate / 1000)} kbps`;
  return r.height ? `${r.height}p · ${rate}` : rate;
}

export function StreamPlayer({ url, format, cdnToken, onAdEvent, onBufferUpdate, infoLabel, stripExtra }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hlsRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashRef = useRef<any>(null);
  const adEventCounterRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [audioTrackIndex, setAudioTrackIndex] = useState(0);
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  // -1 = Auto (ABR)
  const [selectedRendition, setSelectedRendition] = useState(-1);
  const [activeRendition, setActiveRendition] = useState<number | null>(null);
  const selectedRenditionRef = useRef(-1);

  // Force a video rendition (or back to ABR with -1). Switches immediately, flushing the buffer.
  const handleRenditionChange = (index: number) => {
    setSelectedRendition(index);
    selectedRenditionRef.current = index;
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    } else if (dashRef.current) {
      const auto = index === -1;
      dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: auto } } } });
      if (!auto) dashRef.current.setQualityFor("video", index, true);
    }
  };

  // Switch audio track via HLS.js / DASH when the user picks a different language
  const handleAudioTrackChange = (index: number) => {
    setAudioTrackIndex(index);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
    } else if (dashRef.current) {
      const tracks = dashRef.current.getTracksFor?.("audio") ?? [];
      if (tracks[index]) dashRef.current.setCurrentTrack(tracks[index]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hlsInstance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dashInstance: any;
    // Guards the async dynamic imports below: if the effect is cleaned up
    // (URL/CDN switch, unmount, StrictMode remount) before import() resolves,
    // we must not create an orphaned player that keeps polling the old URL.
    let cancelled = false;
    const seenDateRanges = new Set<string>();
    const seenCueTags = new Set<string>();

    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setAudioTracks([]);
    setAudioTrackIndex(0);
    setRenditions([]);
    setSelectedRendition(-1);
    setActiveRendition(null);
    selectedRenditionRef.current = -1;

    // Buffering tracking via polling (more reliable than events with HLS.js)
    let bufferCount = 0;
    let bufferTotalTime = 0;
    let bufferLastDuration = 0;
    let bufferStartTime: number | null = null;
    let isBuffering = false;

    const bufferInterval = setInterval(() => {
      if (video.paused || video.ended || video.readyState === 0) return;
      const nowBuffering = video.readyState < 3; // < HAVE_FUTURE_DATA
      if (nowBuffering && !isBuffering) {
        isBuffering = true;
        bufferStartTime = Date.now();
        onBufferUpdate?.({ count: bufferCount, totalTime: bufferTotalTime, lastDuration: bufferLastDuration, buffering: true });
      } else if (!nowBuffering && isBuffering) {
        isBuffering = false;
        if (bufferStartTime !== null) {
          bufferLastDuration = (Date.now() - bufferStartTime) / 1000;
          bufferTotalTime += bufferLastDuration;
          bufferCount += 1;
          bufferStartTime = null;
        }
        onBufferUpdate?.({ count: bufferCount, totalTime: bufferTotalTime, lastDuration: bufferLastDuration, buffering: false });
      }
    }, 250);

    const emit = (event: Omit<AdEvent, "id">) => {
      onAdEvent?.({ ...event, id: `ad-${++adEventCounterRef.current}` });
    };

    const setupHls = async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (Hls.isSupported()) {
        hlsInstance = new Hls(cdnToken ? {
          xhrSetup: (xhr: XMLHttpRequest, reqUrl: string) => {
            const sep = reqUrl.includes("?") ? "&" : "?";
            xhr.open("GET", `${reqUrl}${sep}${cdnToken}`, true);
          },
        } : {});
        hlsRef.current = hlsInstance;
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);

        hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw: any[] = hlsInstance.audioTracks ?? [];
          if (raw.length < 2) return;
          const tracks: AudioTrack[] = raw.map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Track ${i + 1}`,
            lang: t.lang || "",
          }));
          setAudioTracks(tracks);
          setAudioTrackIndex(0);
        });

        const updateLevels = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const levels: any[] = hlsInstance.levels ?? [];
          setRenditions(levels.map((l, i) => ({
            index: i,
            width: l.width ?? 0,
            height: l.height ?? 0,
            bitrate: l.bitrate ?? 0,
          })));
          // A level was dropped (e.g. failed variant) and the manual pick no longer exists
          if (selectedRenditionRef.current >= levels.length) {
            selectedRenditionRef.current = -1;
            setSelectedRendition(-1);
            hlsInstance.currentLevel = -1;
          }
        };
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, updateLevels);
        hlsInstance.on(Hls.Events.LEVELS_UPDATED, updateLevels);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_event: string, data: any) => {
          setActiveRendition(data.level);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hlsInstance.on(Hls.Events.FRAG_PARSING_METADATA, (_event: string, data: any) => {
          for (const sample of data.samples ?? []) {
            const text = sample.data
              ? new TextDecoder("utf-8", { fatal: false }).decode(sample.data)
              : "";
            const isSCTE = text.includes("SCTE") || text.includes("scte35");
            emit({
              type: isSCTE ? "scte35" : "id3",
              timestamp: sample.pts ?? Date.now() / 1000,
              detail: isSCTE
                ? `SCTE-35 ID3 tag at PTS ${(sample.pts ?? 0).toFixed(2)}s`
                : `ID3 metadata at PTS ${(sample.pts ?? 0).toFixed(2)}s`
            });
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hlsInstance.on(Hls.Events.LEVEL_UPDATED, (_event: string, data: any) => {
          const details = data.details;
          if (!details) return;

          // #EXT-X-DATERANGE tags
          const dateRanges = details.dateRanges;
          if (dateRanges) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const [rangeId, range] of Object.entries<any>(dateRanges)) {
              if (seenDateRanges.has(rangeId)) continue;
              seenDateRanges.add(rangeId);
              const hasSCTE =
                range.attr?.["SCTE35-CMD"] ||
                range.attr?.["SCTE35-OUT"] ||
                range.attr?.["SCTE35-IN"];
              const isCueOut = range.attr?.["SCTE35-OUT"] != null;
              const isCueIn = range.attr?.["SCTE35-IN"] != null;
              const label = isCueOut
                ? "CUE-OUT (ad start)"
                : isCueIn
                  ? "CUE-IN (ad end)"
                  : hasSCTE
                    ? "SCTE-35 DateRange"
                    : `DateRange "${rangeId}"`;

              // Decode X-MESSAGE-DATA: base64 → ID3v2 TXXX frames
              let messageData: string | undefined;
              const rawMsg = range.attr?.["X-MESSAGE-DATA"];
              if (rawMsg) {
                try {
                  const binary = atob(rawMsg);
                  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
                  messageData = parseId3Txxx(bytes) || binary.replace(/[^\x20-\x7E]/g, "");
                } catch {
                  messageData = rawMsg;
                }
              }

              emit({
                type: hasSCTE ? "scte35" : "daterange",
                timestamp: range.startTime ?? 0,
                duration: range.duration ?? undefined,
                messageData,
                detail: `${label}${range.duration ? ` — ${range.duration.toFixed(1)}s` : ""}${messageData ? ` | ${messageData}` : ""}`
              });
            }
          }

          // #EXT-X-CUE-OUT / #EXT-X-CUE-IN tags
          for (const frag of details.fragments ?? []) {
            if (frag.tagList) {
              for (const tag of frag.tagList) {
                const tagName = Array.isArray(tag) ? tag[0] : tag;
                const tagValue = Array.isArray(tag) ? tag[1] : undefined;
                if (tagName !== "EXT-X-CUE-OUT" && tagName !== "EXT-X-CUE-IN") continue;
                const cueKey = `${tagName}-${frag.sn}`;
                if (seenCueTags.has(cueKey)) continue;
                seenCueTags.add(cueKey);
                const isCueOut = tagName === "EXT-X-CUE-OUT";
                let plannedDuration: number | undefined;
                if (isCueOut && tagValue) {
                  const durationMatch = tagValue.match(/DURATION=([\d.]+)/i);
                  plannedDuration = durationMatch
                    ? parseFloat(durationMatch[1])
                    : parseFloat(tagValue) || undefined;
                }
                emit({
                  type: "cue",
                  timestamp: frag.start ?? 0,
                  plannedDuration,
                  detail: isCueOut
                    ? `CUE-OUT (ad break start)${plannedDuration ? ` — planned ${plannedDuration.toFixed(1)}s` : ""}`
                    : "CUE-IN (ad break end)"
                });
              }
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = cdnToken ? `${url}?${cdnToken}` : url;
      } else {
        setError("HLS is not supported in this browser.");
      }
    };

    const setupDash = async () => {
      const dashjs = await import("dashjs");
      if (cancelled) return;
      dashInstance = dashjs.MediaPlayer().create();
      dashRef.current = dashInstance;
      if (cdnToken) {
        const token = cdnToken;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dashInstance.extend("RequestModifier", function () {
          return {
            modifyRequestURL: (reqUrl: string) => {
              const sep = reqUrl.includes("?") ? "&" : "?";
              return `${reqUrl}${sep}${token}`;
            },
            modifyRequestHeader: (xhr: XMLHttpRequest) => xhr,
          };
        }, true);
      }
      dashInstance.initialize(video, url, true);

      const scteSchemes = [
        "urn:scte:scte35:2013:bin",
        "urn:scte:scte35:2014:xml+bin",
        "urn:scte:scte35:2013:xml"
      ];

      for (const scheme of scteSchemes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dashInstance.on(scheme, (event: any) => {
          emit({
            type: "scte35",
            timestamp: event.event?.presentationTime ?? Date.now() / 1000,
            duration: event.event?.duration ?? undefined,
            detail: `SCTE-35 (${scheme.split(":").pop()}) at ${(event.event?.presentationTime ?? 0).toFixed(2)}s`
          });
        });
      }

      // Video renditions — STREAM_INITIALIZED re-fires on each new period of multi-period streams
      dashInstance.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const infos: any[] = dashInstance.getBitrateInfoListFor?.("video") ?? [];
        setRenditions(infos.map((b) => ({
          index: b.qualityIndex,
          width: b.width ?? 0,
          height: b.height ?? 0,
          bitrate: b.bitrate ?? 0,
        })));
        const selected = selectedRenditionRef.current;
        if (selected === -1) return;
        if (infos.some((b) => b.qualityIndex === selected)) {
          dashInstance.setQualityFor("video", selected, true);
        } else {
          selectedRenditionRef.current = -1;
          setSelectedRendition(-1);
          dashInstance.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dashInstance.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
        if (e.mediaType === "video") setActiveRendition(e.newQuality);
      });

      dashInstance.on(dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
        const manifest = dashInstance.getManifest?.();
        if (!manifest) return;
        for (const period of manifest.Period_asArray ?? manifest.Period ?? []) {
          for (const es of period.EventStream_asArray ?? period.EventStream ?? []) {
            const scheme = es.schemeIdUri ?? "";
            for (const evt of es.Event_asArray ?? es.Event ?? []) {
              emit({
                type: scheme.includes("scte35") ? "scte35" : "emsg",
                timestamp: parseFloat(evt.presentationTime ?? "0"),
                duration: parseFloat(evt.duration ?? "0") || undefined,
                detail: `MPD Event (${scheme}) at ${parseFloat(evt.presentationTime ?? "0").toFixed(2)}s`
              });
            }
          }
        }

        // Audio track detection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawTracks: any[] = dashInstance.getTracksFor?.("audio") ?? [];
        if (rawTracks.length >= 2) {
          const tracks: AudioTrack[] = rawTracks.map((t, i) => ({
            id: i,
            name: t.roles?.join(", ") || t.lang || `Track ${i + 1}`,
            lang: t.lang || "",
          }));
          setAudioTracks(tracks);
          setAudioTrackIndex(0);
        }
      });

      // Stream events (EVENT_MODE_ON_START / EVENT_MODE_ON_RECEIVE)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streamEventHandler = (type: string) => (event: any) => {
        const evt = event.event ?? event;
        const scheme = evt.schemeIdUri ?? evt.schemeIdURI ?? "";
        const pts = evt.presentationTime ?? evt.calculatedPresentationTime ?? 0;
        emit({
          type: scheme.includes("scte35") ? "scte35" : "stream",
          timestamp: pts,
          duration: evt.duration ?? undefined,
          detail: `Stream ${type} (${scheme || "unknown"}) at ${Number(pts).toFixed(2)}s${evt.messageData ? ` — ${String(evt.messageData).slice(0, 60)}` : ""}`
        });
      };

      dashInstance.on(
        dashjs.MediaPlayer.events.EVENT_MODE_ON_START,
        streamEventHandler("onStart")
      );
      dashInstance.on(
        dashjs.MediaPlayer.events.EVENT_MODE_ON_RECEIVE,
        streamEventHandler("onReceive")
      );
    };

    if (format === "hls") {
      void setupHls();
    } else if (format === "dash") {
      void setupDash();
    } else {
      setError("Smooth Streaming playback not supported in this player.");
    }

    return () => {
      cancelled = true;
      clearInterval(bufferInterval);
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsRef.current = null;
      }
      if (dashInstance) {
        dashInstance.reset();
        dashRef.current = null;
      }
    };
  }, [url, format, cdnToken, onAdEvent, onBufferUpdate]);

  const sortedRenditions = [...renditions].sort((a, b) => b.bitrate - a.bitrate);
  const activeRenditionInfo = renditions.find((r) => r.index === activeRendition);
  const autoLabel = selectedRendition === -1 && activeRenditionInfo
    ? `Auto · ${activeRenditionInfo.height ? `${activeRenditionInfo.height}p` : formatRendition(activeRenditionInfo)}`
    : "Auto";

  const chipClass = (selected: boolean) =>
    cn(
      "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
      selected ? "bg-white text-black" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
    );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        crossOrigin="anonymous"
        className="aspect-video w-full bg-black"
      />
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 bg-slate-900 px-3 py-2.5">
        <span className="text-xs text-slate-300">Preview</span>
        {infoLabel ? <span className="text-[11px] text-slate-400">{infoLabel}</span> : null}
        {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
        {audioTracks.length >= 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Language</span>
            {audioTracks.map((t, i) => (
              <button
                key={t.id}
                onClick={() => handleAudioTrackChange(i)}
                className={chipClass(audioTrackIndex === i)}
              >
                {t.lang ? t.lang.toUpperCase() : t.name || `Track ${i + 1}`}
              </button>
            ))}
          </div>
        )}
        {renditions.length >= 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Quality</span>
            {[{ index: -1, label: autoLabel }, ...sortedRenditions.map((r) => ({ index: r.index, label: formatRendition(r) }))].map(
              (opt) => (
                <button
                  key={opt.index}
                  onClick={() => handleRenditionChange(opt.index)}
                  className={chipClass(selectedRendition === opt.index)}
                >
                  {opt.label}
                </button>
              )
            )}
          </div>
        )}
        {stripExtra ? <div className="ml-auto">{stripExtra}</div> : null}
      </div>
    </div>
  );
}
