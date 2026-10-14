import { AVAILABLE_TAGS } from "@/components/ui/TagChip";
import type { ChannelDetailStatusResult, LinearStatusResult } from "./hooks";
import type { ResolvedChannel } from "./types";

export type TagGroup<T> = { key: string; tags: string[]; untagged: boolean; items: T[] };

export type LinearStatusRow = LinearStatusResult & { tags: string[] };

const UNTAGGED_KEY = "__untagged";

/** Canonical tag order: AVAILABLE_TAGS order first, unknown tags after, alphabetically. */
function sortTags(tags: string[]): string[] {
  const rank = (t: string) => {
    const i = (AVAILABLE_TAGS as readonly string[]).indexOf(t);
    return i === -1 ? AVAILABLE_TAGS.length : i;
  };
  return [...new Set(tags)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Group items that share the exact same tag set, regardless of tag order.
 * Groups keep first-appearance order; the untagged group always goes last.
 */
export function groupLinearsByTags<T>(items: T[], getTags: (item: T) => string[]): TagGroup<T>[] {
  const groups = new Map<string, TagGroup<T>>();
  for (const item of items) {
    const tags = sortTags(getTags(item));
    const key = tags.length ? tags.join("|") : UNTAGGED_KEY;
    if (!groups.has(key)) groups.set(key, { key, tags, untagged: tags.length === 0, items: [] });
    groups.get(key)!.items.push(item);
  }
  const all = [...groups.values()];
  return [...all.filter((g) => !g.untagged), ...all.filter((g) => g.untagged)];
}

/** Join each status result to its linear's tags, ordered as the channel lists its linears. */
export function buildLinearStatusRows(
  channel: Pick<ResolvedChannel, "linears">,
  result: ChannelDetailStatusResult
): LinearStatusRow[] {
  const order = new Map(channel.linears.map((l, i) => [l.name, i]));
  const tagsByName = new Map(channel.linears.map((l) => [l.name, l.tags ?? []]));
  return result.linears
    .map((l) => ({ ...l, tags: tagsByName.get(l.linearName) ?? [] }))
    .sort(
      (a, b) =>
        (order.get(a.linearName) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.linearName) ?? Number.MAX_SAFE_INTEGER)
    );
}
