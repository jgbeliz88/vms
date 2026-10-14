"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/Badge";
import { TagChip } from "@/components/ui/TagChip";
import { useManifestPathTooltip } from "@/components/ui/ManifestPathTooltip";
import type { ManifestListItem } from "@/components/ui/ManifestPathTooltip";
import type { ChannelDetailManifestCheck, ChannelDetailSection } from "@/features/live/hooks";
import { groupLinearsByTags } from "@/features/live/tag-groups";
import type { LinearStatusRow } from "@/features/live/tag-groups";

type Variant = "detail" | "dashboard";
type Tone = ManifestListItem["tone"];

const SECTIONS = [
  { key: "origin", label: "Origin", short: "Origin" },
  { key: "originDrm", label: "Origin (DRM)", short: "DRM" },
  { key: "cdn", label: "CDN", short: "CDN" },
] as const;

const NO_DRM_TEXT = "Not checked: linear has no DRM.";

function manifestTone(m: ChannelDetailManifestCheck): Tone {
  return m.blocked ? "blocked" : m.ok ? "ok" : "fail";
}

function manifestStatusText(m: ChannelDetailManifestCheck): string {
  return m.blocked ? `Blocked · HTTP ${m.httpStatus}` : m.httpStatus ? `HTTP ${m.httpStatus}` : "Error";
}

// Same tile palette on the dashboard and in Channel Details.
const TILE_CLASSES: Record<Tone, { box: string; text: string }> = {
  ok: {
    box: "border-emerald-200 bg-emerald-50 hover:ring-emerald-500/45 dark:border-emerald-700/40 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  fail: {
    box: "border-red-200 bg-red-50 hover:ring-red-500/45 dark:border-red-700/40 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
  },
  blocked: {
    box: "border-[#FFA70B]/45 bg-[#FEF9C3] hover:ring-[#FFA70B]/55 dark:border-amber-700/45 dark:bg-amber-900/[0.22] dark:hover:ring-[#FFA70B]/50",
    text: "text-[#854D0E] dark:text-amber-400",
  },
};

const STYLES = {
  detail: {
    card: "rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-950",
    header: "px-0.5",
    count: "text-slate-400",
    toggle: "text-[10px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200",
    linear: "rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900",
    name: "text-[13px] font-semibold text-slate-900 dark:text-slate-100",
    tileLabel: "text-slate-700 dark:text-slate-200",
    expanded: "mt-2 border-t border-slate-100 pt-2 dark:border-slate-800",
    chipHover: "hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  dashboard: {
    card: "rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 dark:border-[#2E3A47] dark:bg-[#1A222C]",
    header: "",
    count: "text-[#8899A8]",
    toggle: "text-xs text-[#8899A8] group-hover:text-[#1C2434] dark:group-hover:text-white",
    linear: "",
    name: "min-w-[84px] text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#8899A8]",
    tileLabel: "text-[#1C2434] dark:text-slate-200",
    expanded: "mt-1.5",
    chipHover: "hover:bg-[#F1F5F9] dark:hover:bg-[#333A48]",
  },
} as const;

function ManifestTile({ manifest, variant }: { manifest: ChannelDetailManifestCheck; variant: Variant }) {
  const { bindPath } = useManifestPathTooltip();
  const tone = manifestTone(manifest);
  const cls = TILE_CLASSES[tone];
  return (
    <div
      {...bindPath(manifest.url)}
      className={cn("cursor-pointer rounded-lg border px-2 py-1.5 text-xs transition-shadow hover:ring-2", cls.box)}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className={cn("font-medium", STYLES[variant].tileLabel)}>{manifest.label}</span>
        {manifest.blocked && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFA70B]" />}
      </div>
      <div className={cn("mt-0.5 break-all font-mono", cls.text)}>{manifestStatusText(manifest)}</div>
    </div>
  );
}

function CheckChip({
  label,
  short,
  linearName,
  section,
  variant,
}: {
  label: string;
  short: string;
  linearName: string;
  section: ChannelDetailSection;
  variant: Variant;
}) {
  const { bindManifests } = useManifestPathTooltip();
  const checked = section.manifests.length > 0;
  const blocked = section.manifests.some((m) => m.blocked);
  const dot = !checked ? "bg-[#CBD5E1]" : blocked ? "bg-[#FFA70B]" : section.ok ? "bg-[#219653]" : "bg-[#D34053]";
  const items = section.manifests.map((m) => ({
    label: m.label,
    url: m.url,
    statusText: manifestStatusText(m),
    tone: manifestTone(m),
  }));
  return (
    <span
      {...bindManifests(`${label} · ${linearName}`, items, NO_DRM_TEXT)}
      className={cn(
        "inline-flex cursor-default items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 transition-colors",
        STYLES[variant].chipHover
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {short}
    </span>
  );
}

function SectionColumns({ linear, variant }: { linear: LinearStatusRow; variant: Variant }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SECTIONS.map(({ key, label }) => {
        const section = linear[key];
        return (
          <div key={key} className="min-w-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            {section.manifests.length === 0 ? (
              <span className="text-xs text-slate-400">—</span>
            ) : (
              <div className="flex flex-col gap-1">
                {section.manifests.map((m) => (
                  <ManifestTile key={m.url} manifest={m} variant={variant} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LinearChips({ linear, variant }: { linear: LinearStatusRow; variant: Variant }) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-1">
      {SECTIONS.map(({ key, label, short }) => (
        <CheckChip
          key={key}
          label={label}
          short={short}
          linearName={linear.linearName}
          section={linear[key]}
          variant={variant}
        />
      ))}
    </div>
  );
}

function LinearRow({ linear, open, variant }: { linear: LinearStatusRow; open: boolean; variant: Variant }) {
  const s = STYLES[variant];
  if (variant === "dashboard") {
    // Dashboard: chips while the group is collapsed, manifest tiles once it is expanded.
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("shrink-0", s.name)}>{linear.linearName}</span>
          {!open && <LinearChips linear={linear} variant={variant} />}
        </div>
        {open && (
          <div className={s.expanded}>
            <SectionColumns linear={linear} variant={variant} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={cn("text-xs", s.linear)}>
      <div className="flex items-center gap-3">
        <span className={s.name}>{linear.linearName}</span>
        <LinearChips linear={linear} variant={variant} />
        <span className="shrink-0 whitespace-nowrap">
          <Badge label={linear.ok ? "Overall: OK" : "Overall: Failed"} tone={linear.ok ? "success" : "error"} />
        </span>
      </div>
      {open && (
        <div className={s.expanded}>
          <SectionColumns linear={linear} variant={variant} />
        </div>
      )}
    </div>
  );
}

export function LinearStatusGroups({ rows, variant }: { rows: LinearStatusRow[]; variant: Variant }) {
  // Every group starts collapsed and toggles on its own.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const groups = groupLinearsByTags(rows, (r) => r.tags);
  const s = STYLES[variant];

  if (groups.length === 0) {
    return <p className="text-xs text-slate-400">No linears to check.</p>;
  }

  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {groups.map((g) => {
        const isOpen = !!open[g.key];
        const toggleLabel = variant === "detail" ? (isOpen ? "▲ collapse" : "▼ details") : isOpen ? "▲" : "▼";
        return (
          <div key={g.key} className={cn("flex flex-col gap-2", s.card)}>
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [g.key]: !prev[g.key] }))}
              aria-expanded={isOpen}
              className={cn("group flex w-full items-center gap-1.5 text-left", s.header)}
            >
              <span className="flex flex-1 flex-wrap items-center gap-1.5">
                {(g.untagged ? ["Untagged"] : g.tags).map((t) => (
                  <TagChip key={t} tag={t} surface={variant === "dashboard" ? "dashboard" : "default"} />
                ))}
                <span className={cn("text-[11px]", s.count)}>
                  {g.items.length} {g.items.length === 1 ? "linear" : "linears"}
                </span>
              </span>
              <span className={cn("select-none whitespace-nowrap transition-colors", s.toggle)}>{toggleLabel}</span>
            </button>
            {g.items.map((linear) => (
              <LinearRow key={linear.orilinear} linear={linear} open={isOpen} variant={variant} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
