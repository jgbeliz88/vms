import { NextResponse } from "next/server";
import { getAteneaBaseUrl } from "@/app/api/_lib/env-urls";
import { fetchVMS } from "@/app/api/_lib/fetch";
import { extractUpstreamMessage } from "@/app/api/_lib/responses";
import { logInfo, logError } from "@/app/api/_lib/logger";
import { selectedProvider } from "@/features/cdn-routing/mapping";
import { CDN_CONFIG_NAMES, ORIGIN_AKAMAI_FEATURE } from "@/features/cdn-routing/types";
import type {
  CdnConfigEntry,
  CdnExceptionEntry,
  CdnExceptions,
  CdnRouting,
  CdnStreamRouting,
} from "@/features/cdn-routing/types";

const LOG_NAME = "app.api.cdn.routing.route";

// Only the slices of the Atenea responses this route reads.
type AteneaServices = {
  "cdn-config"?: { configurations?: CdnConfigEntry[] };
};

// The nested per-stream rows of a feature document. `name` is the stream type,
// matching CDN_CONFIG_NAMES. The document also has a root `values` array, which
// the VMS deliberately neither reads nor writes.
type AteneaNestedFeature = {
  id?: number;
  name?: string;
  values?: string[];
};

type AteneaFeature = {
  documentId?: string;
  name?: string;
  filterType?: string;
  matchType?: string;
  features?: AteneaNestedFeature[];
};

async function getJson(url: string, fn: string): Promise<unknown> {
  const response = await fetchVMS(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    logError({
      name: LOG_NAME,
      fn,
      msg: `Non-OK response url=${url}`,
      error: new Error(`HTTP ${response.status}: ${text}`),
    });
    throw new Error(extractUpstreamMessage(text, response.status));
  }
  return response.json();
}

function toStreamRouting(
  configurations: CdnConfigEntry[],
  name: string
): CdnStreamRouting | null {
  const entry = configurations.find((config) => config.name === name);
  if (!entry) return null;
  return {
    provider: selectedProvider(entry.payload),
    payload: entry.payload ?? {},
    active: entry.active ?? true,
  };
}

// A stream is only editable when Atenea gives us its numeric id — that id is the
// discriminator the PUT needs, so without it we return null and the UI degrades
// instead of writing to the wrong row.
function toExceptionEntry(
  nested: AteneaNestedFeature[],
  name: string
): CdnExceptionEntry | null {
  const entry = nested.find((item) => item.name === name);
  if (typeof entry?.id !== "number") return null;
  return { id: entry.id, values: entry.values ?? [] };
}

function toExceptions(features: AteneaFeature[]): CdnExceptions | null {
  const feature = features.find(
    (item) =>
      item.name === ORIGIN_AKAMAI_FEATURE.name &&
      item.filterType === ORIGIN_AKAMAI_FEATURE.filterType &&
      item.matchType === ORIGIN_AKAMAI_FEATURE.matchType
  );
  if (!feature?.documentId) return null;

  const nested = Array.isArray(feature.features) ? feature.features : [];
  return {
    documentId: feature.documentId,
    live: toExceptionEntry(nested, CDN_CONFIG_NAMES.live),
    vod: toExceptionEntry(nested, CDN_CONFIG_NAMES.vod),
  };
}

export async function GET() {
  const base = getAteneaBaseUrl();
  const servicesUrl = `${base}/api/projects/multisite/caronte/services`;
  const featuresUrl = `${base}/api/features`;

  let services: AteneaServices;
  let features: AteneaFeature[];
  try {
    [services, features] = (await Promise.all([
      getJson(servicesUrl, "GET"),
      getJson(featuresUrl, "GET"),
    ])) as [AteneaServices, AteneaFeature[]];
  } catch (err) {
    logError({ name: LOG_NAME, fn: "GET", msg: "Failed to load Atenea routing state", error: err });
    const msg = err instanceof Error ? err.message : "Failed to load CDN routing";
    return NextResponse.json({ message: msg }, { status: 502 });
  }

  const configurations = services["cdn-config"]?.configurations ?? [];
  const routing: CdnRouting = {
    live: toStreamRouting(configurations, CDN_CONFIG_NAMES.live),
    vod: toStreamRouting(configurations, CDN_CONFIG_NAMES.vod),
    exceptions: toExceptions(Array.isArray(features) ? features : []),
  };

  logInfo({ name: LOG_NAME, fn: "GET", msg: "Atenea response", data: routing });
  return NextResponse.json(routing);
}
