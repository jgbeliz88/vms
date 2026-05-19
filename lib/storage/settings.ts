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

export type VmsSettings = {
  streamingFormats: StreamingFormatMapping;
  drmPaths: DrmPathMapping;
  akamai: { live: string; vod: string; fast: string };
  fastly: { live: string; vod: string; fast: string };
  origin: { live: string; vod: string; fast: string };
};

const DARK_MODE_KEY = "agiletv.darkMode";

export function getDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(localStorage.getItem(DARK_MODE_KEY) ?? "false") === true;
  } catch {
    return false;
  }
}

export function setDarkMode(next: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DARK_MODE_KEY, JSON.stringify(next));
}
