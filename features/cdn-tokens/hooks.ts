// Composition layer for the CDN Token Generation page.
//
// Reuses the exact same ACL builders and token mutation as the Playback Diagnostics
// sections, so a token minted here is identical to one minted while reproducing a stream.

import { buildCdnAcl, type CdnKey } from "@/features/playback/hooks";
import { liveAclPath, vodAclPath, fastAclPath } from "@/features/playback/acl";
import type { VmsSettings } from "@/lib/storage/settings";

export { useCdnToken } from "@/features/playback/hooks";

export type StreamType = "live" | "vod" | "fast";
export type ScopeType = "all" | "specific" | "custom";
export type Mam = "bitmovin" | "lightflow";

// VOD lives under its own CDN settings bucket; Live and Fast-Channels both use the
// "live" key server-side but Fast-Channels resolves its CDN base URL from the "fast" bucket.
function settingsBucket(stream: StreamType): "live" | "vod" | "fast" {
  return stream;
}

export function cdnBaseFor(
  settings: VmsSettings | undefined,
  cdn: CdnKey,
  stream: StreamType
): string {
  if (!settings) return "";
  return settings[cdn][settingsBucket(stream)] ?? "";
}

// Server-side key selection keys off contentType: "vod" uses the VOD key, everything
// else (Live, Fast-Channels) uses the LIVE key.
export function contentTypeFor(stream: StreamType): "live" | "vod" {
  return stream === "vod" ? "vod" : "live";
}

export type AclInput = {
  cdn: CdnKey;
  stream: StreamType;
  scope: ScopeType;
  settings: VmsSettings | undefined;
  linearName?: string;
  vodMam?: Mam;
  vodUuid?: string;
  fastChannel?: string;
  customAcl?: string;
};

// Builds the ACL exactly like the Playback panels. Returns "" when required inputs are
// missing, which the UI uses to disable the Generate button.
export function buildTokenAcl(input: AclInput): string {
  const { scope, stream, cdn, settings } = input;

  if (scope === "custom") return (input.customAcl ?? "").trim();

  const cdnBase = cdnBaseFor(settings, cdn, stream);

  if (scope === "all") return buildCdnAcl(cdnBase, "/*");

  // scope === "specific"
  if (stream === "live") {
    if (!input.linearName) return "";
    return buildCdnAcl(cdnBase, liveAclPath(input.linearName));
  }
  if (stream === "vod") {
    const uuid = (input.vodUuid ?? "").trim();
    if (!uuid) return "";
    return buildCdnAcl(cdnBase, vodAclPath(input.vodMam ?? "", uuid));
  }
  // stream === "fast"
  if (!input.fastChannel) return "";
  return buildCdnAcl(cdnBase, fastAclPath(input.fastChannel));
}
