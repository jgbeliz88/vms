const SETTINGS_KEY = "agiletv.settings";

export type StreamingFormatMapping = {
  hls: string;
  dash: string;
  smooth: string;
};

export type DrmPathMapping = {
  clear: string;
  widevine: string;
  fairplay: string;
  playready: string;
};

export type CdnProviderSettings = {
  akamai?: string;
  fastly?: string;
};

export type DistributionSettings = {
  origin?: {
    live?: string;
    vod?: string;
    fast?: string;
  };
  cdn?: {
    live?: CdnProviderSettings;
    vod?: CdnProviderSettings;
    fast?: CdnProviderSettings;
  };
};

export type Settings = {
  darkMode?: boolean;
  streamingFormats?: StreamingFormatMapping;
  drmPaths?: DrmPathMapping;
  distribution?: DistributionSettings;
};

const defaultSettings: Settings = {
  darkMode: false,
  streamingFormats: {
    hls: ".m3u8",
    dash: ".mpd",
    smooth: ".Manifest"
  },
  drmPaths: {
    clear: "",
    widevine: "",
    fairplay: "",
    playready: ""
  },
  distribution: {
    origin: { live: "", vod: "", fast: "" },
    cdn: {
      live: { akamai: "", fastly: "" },
      vod: { akamai: "", fastly: "" },
      fast: { akamai: "", fastly: "" }
    }
  }
};

function hasOldEnvStructure(parsed: Record<string, unknown>): boolean {
  const dist = parsed.distribution as Record<string, unknown> | undefined;
  if (!dist) return false;
  const origin = dist.origin as Record<string, unknown> | undefined;
  if (origin && (
    "livePre" in origin || "livePro" in origin ||
    "vodPre" in origin || "vodPro" in origin ||
    "fastPre" in origin || "fastPro" in origin
  )) return true;
  return false;
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (hasOldEnvStructure(parsed)) {
      localStorage.removeItem(SETTINGS_KEY);
      return defaultSettings;
    }
    return { ...defaultSettings, ...parsed } as Settings;
  } catch {
    return defaultSettings;
  }
}

export function setSettings(next: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...next }));
}

export function clearSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETTINGS_KEY);
}
