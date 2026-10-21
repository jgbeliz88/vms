import type { CdnKey, CdnPriorityPayload } from "./types";

export const CDN_PROVIDERS: CdnKey[] = ["akamai", "fastly"];

export function otherProvider(provider: CdnKey): CdnKey {
  return provider === "akamai" ? "fastly" : "akamai";
}

export function providerLabel(provider: CdnKey): string {
  return provider === "akamai" ? "Akamai" : "Fastly";
}

/**
 * Origin tokens in the "Origin Akamai" values array are lowercase and stripped of
 * punctuation, because they are matched against Origin headers like https://telecinco.es.
 * "Be Mad" → "bemad".
 */
export function channelSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The active provider is the one with priority 1 — in practice, the lowest priority
 * among akamai/fastly. Payloads in the wild sometimes list only one of them.
 */
export function selectedProvider(payload: CdnPriorityPayload | undefined): CdnKey {
  if (!payload) return "akamai";
  const ranked = CDN_PROVIDERS.filter((p) => typeof payload[p]?.priority === "number").sort(
    (a, b) => payload[a].priority - payload[b].priority
  );
  return ranked[0] ?? "akamai";
}

/**
 * Puts `selected` at priority 1 and the other CDN at priority 2, leaving any other
 * provider in the payload (e.g. level3) exactly as Atenea had it.
 */
export function buildPayload(
  current: CdnPriorityPayload | undefined,
  selected: CdnKey
): CdnPriorityPayload {
  return {
    ...(current ?? {}),
    [selected]: { priority: 1 },
    [otherProvider(selected)]: { priority: 2 },
  };
}

/**
 * Rewrites the "Origin Akamai" values array so that exactly the channels in
 * `enabled` are present. Entries the VMS does not own — regexes, and sites that
 * are not Enigma live channels — are preserved verbatim and in their original
 * position. Newly enabled channels are appended in `allSlugs` order.
 */
export function applyExceptions(
  values: string[],
  allSlugs: readonly string[],
  enabled: ReadonlySet<string>
): string[] {
  const owned = new Set(allSlugs);
  const kept = values.filter((value) => {
    const slug = value.trim().toLowerCase();
    return !owned.has(slug) || enabled.has(slug);
  });

  const present = new Set(kept.map((value) => value.trim().toLowerCase()));
  const added = allSlugs.filter((slug) => enabled.has(slug) && !present.has(slug));

  return [...kept, ...added];
}
