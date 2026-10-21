import type { CdnKey } from "@/features/playback/hooks";

export type { CdnKey };

// Atenea stores CDN preference as a priority map. Lowest priority wins.
// Providers beyond akamai/fastly (level3 shows up in real payloads) are kept as-is.
export type CdnPriorityPayload = Record<string, { priority: number }>;

// One entry of the project's `cdn-config.configurations` array. `name` is the
// stream type: "channel" for Live, "vod" for VOD.
export type CdnConfigEntry = {
  name: string;
  active: boolean;
  payload: CdnPriorityPayload;
};

export type CdnStreamRouting = {
  provider: CdnKey;
  payload: CdnPriorityPayload;
  active: boolean;
};

// Per-origin overrides live on the "Origin Akamai" feature, in one nested entry
// per stream type. `id` identifies the row when writing; `values` holds the origin
// tokens that stay on Akamai even when the project default is Fastly — features
// override the project. Live and VOD have separate arrays so a multisite can be
// reverted for one without touching the other.
export type CdnExceptionEntry = {
  id: number;
  values: string[];
};

export type CdnExceptions = {
  documentId: string;
  live: CdnExceptionEntry | null;
  vod: CdnExceptionEntry | null;
};

// Shape returned by GET /api/cdn/routing — one read across both Atenea layers.
// Any piece Atenea does not return comes back as null so the UI can degrade.
export type CdnRouting = {
  live: CdnStreamRouting | null;
  vod: CdnStreamRouting | null;
  exceptions: CdnExceptions | null;
};

// Stream type names. Atenea uses the same strings for the project's `cdn-config`
// configurations and for the nested entries of the "Origin Akamai" feature.
export const CDN_CONFIG_NAMES = { live: "channel", vod: "vod" } as const;

export const ORIGIN_AKAMAI_FEATURE = {
  name: "Origin Akamai",
  filterType: "origin",
  matchType: "regExp",
} as const;
