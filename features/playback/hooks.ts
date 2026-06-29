"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { StreamingFormatMapping, DrmPathMapping } from "@/lib/storage/settings";
import { useVmsSettingsQuery } from "@/features/settings/hooks";

const defaultFormats: StreamingFormatMapping = { hls: ".m3u8", dash: ".mpd", smooth: ".Manifest" };
const defaultDrm: DrmPathMapping = { clear: "", widevine: "", fairplay: "", playready: "" };

export type FormatKey = "hls" | "dash" | "smooth";
export type DrmKey = "clear" | "widevine" | "fairplay" | "playready";
export type CdnKey = "akamai" | "fastly";

export const formatOptions = [
  { label: "HLS", value: "hls" },
  { label: "DASH", value: "dash" },
  { label: "Smooth Streaming", value: "smooth" },
];

export const drmOptions = [
  { label: "Clear", value: "clear" },
  { label: "Widevine", value: "widevine" },
  { label: "Fairplay", value: "fairplay" },
  { label: "Playready", value: "playready" },
];

export const cdnOptions = [
  { label: "Akamai", value: "akamai" },
  { label: "Fastly", value: "fastly" },
];

export function useCdnToken() {
  return useMutation({
    mutationFn: async ({
      provider,
      acl,
      contentType,
      window,
    }: {
      provider: CdnKey;
      acl: string;
      contentType: "live" | "vod";
      window?: number;
    }) => {
      const res = await fetch(`/api/cdn/token/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acl, contentType, ...(window != null ? { window } : {}) }),
      });
      if (!res.ok) throw new Error(`CDN token fetch failed: ${res.status}`);
      const data = await res.json();
      return data.cdn as string;
    },
  });
}

export function buildCdnAcl(cdnBase: string, path: string): string {
  let base = "";
  try {
    const p = new URL(cdnBase).pathname;
    base = p === "/" ? "" : p.replace(/\/$/, "");
  } catch {
    // invalid URL — use empty base
  }
  return base + path;
}

export function usePlaybackSettings() {
  const { data } = useVmsSettingsQuery();
  const [formatKey, setFormatKey] = useState<FormatKey>("hls");
  const [drmKey, setDrmKey] = useState<DrmKey>("clear");
  const [cdnKey, setCdnKey] = useState<CdnKey>("akamai");

  const formats = data?.streamingFormats ?? defaultFormats;
  const drmPaths = data?.drmPaths ?? defaultDrm;
  const extension = formats[formatKey] ?? defaultFormats[formatKey];
  const drmPath = drmPaths[drmKey] ?? defaultDrm[drmKey];
  const drmSegment = drmPath ? `/${drmPath.replace(/^\//, "")}` : "";

  return {
    formatKey, setFormatKey,
    drmKey, setDrmKey,
    cdnKey, setCdnKey,
    formats, drmPaths,
    extension, drmSegment,
  };
}
