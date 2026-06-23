import "server-only";

export { getEnigmaBaseUrl } from "@/lib/utils/enigma-url";
export { getJulesBaseUrl } from "@/lib/utils/jules-url";

export function getFastChannelsUrl(): string {
  return process.env.FAST_CHANNELS_ENDPOINT ?? "";
}

export function getAkamaiLiveKey(): string { return process.env.AKAMAI_CDN_LIVE_KEY ?? ""; }
export function getAkamaiVodKey(): string  { return process.env.AKAMAI_CDN_VOD_KEY ?? ""; }
export function getFastlyLiveKey(): string { return process.env.FASTLY_CDN_LIVE_KEY ?? ""; }
export function getFastlyVodKey(): string  { return process.env.FASTLY_CDN_VOD_KEY ?? ""; }
