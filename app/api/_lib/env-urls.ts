import "server-only";

export { getEnigmaBaseUrl } from "@/lib/utils/enigma-url";
export { getJulesBaseUrl } from "@/lib/utils/jules-url";

export function getFastChannelsUrl(): string {
  return process.env.FAST_CHANNELS_ENDPOINT ?? "";
}
