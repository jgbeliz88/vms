"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Film, Info, Radio } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useChannelsQuery } from "@/features/live/hooks";
import {
  useCdnRoutingQuery,
  useUpdateCdnExceptions,
  useUpdateCdnProviders,
} from "@/features/cdn-routing/hooks";
import {
  applyExceptions,
  buildPayload,
  channelSlug,
  providerLabel,
} from "@/features/cdn-routing/mapping";
import { CDN_CONFIG_NAMES, type CdnConfigEntry, type CdnKey } from "@/features/cdn-routing/types";

// Atenea currently exposes a single platform scope. Kept as a constant so the
// copy and the endpoint path stay in sync when more platforms are onboarded.
const PLATFORM = "Multisite";

type ExceptionChannel = { id: number; name: string; slug: string };

type Stream = "live" | "vod";

// Live and VOD keep independent exception sets: a multisite can be reverted to
// Akamai for its VOD while its linear feed stays on Fastly, and vice versa.
type Draft = { live: CdnKey; vod: CdnKey; enabled: Record<Stream, Set<string>> };

type Change = { title: string; from: string; to: string };

const STREAMS: Stream[] = ["live", "vod"];

const STREAM_LABELS: Record<Stream, string> = { live: "Live", vod: "VOD" };

const cloneDraft = (draft: Draft): Draft => ({
  ...draft,
  enabled: { live: new Set(draft.enabled.live), vod: new Set(draft.enabled.vod) },
});

// ── presentational helpers (same vocabulary as CdnTokenGenerator) ─────────────
const cardCls =
  "rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-[#2E3A47] dark:bg-[#24303F]";

const labelCls = "text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8899A8]";

// Smaller-scale sibling of segBtn for the "Set all channels to" row. A side lights
// up only when every channel is already on it, so it doubles as a status indicator.
const bulkSegBtn = (provider: CdnKey, lit: boolean) =>
  cn(
    "flex items-center gap-[7px] rounded-md border px-3 py-1.5 text-xs font-bold transition-colors",
    lit
      ? cn(
          "cursor-default bg-white shadow-sm dark:bg-[#24303F]",
          provider === "akamai"
            ? "border-[#EA580C] text-[#9A3412] dark:border-[#FB923C] dark:text-[#FDBA74]"
            : "border-brand-500 text-brand-600 dark:text-[#818CF8]"
        )
      : cn(
          "border-transparent text-[#64748B] hover:bg-white/70 dark:text-[#8899A8] dark:hover:bg-white/5",
          provider === "akamai"
            ? "hover:text-[#9A3412] dark:hover:text-[#FDBA74]"
            : "hover:text-brand-600 dark:hover:text-[#818CF8]"
        )
  );

const bulkDot = (provider: CdnKey) =>
  cn(
    "h-[7px] w-[7px] rounded-full",
    provider === "akamai" ? "bg-[#EA580C] dark:bg-[#FB923C]" : "bg-brand-500 dark:bg-[#818CF8]"
  );

const segBtn = (active: boolean) =>
  cn(
    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors",
    active
      ? "border-brand-500 bg-white text-brand-600 shadow-sm dark:bg-[#24303F] dark:text-[#818CF8]"
      : "border-transparent text-[#8899A8] hover:bg-white/60 dark:hover:bg-white/5"
  );

const providerBadge = (provider: CdnKey) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
    provider === "fastly"
      ? "bg-[#EEF2FF] text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]"
      : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1A222C] dark:text-[#8899A8]"
  );

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-2 rounded-[10px] border border-[#F1F5F9] bg-[#F8FAFC] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#64748B] dark:border-[#2E3A47] dark:bg-[#1A222C] dark:text-[#8899A8]">
      <Info size={15} className="mt-0.5 shrink-0 text-[#94A3B8]" />
      <span>{children}</span>
    </div>
  );
}

function CardHeader({
  icon,
  title,
  subtitle,
  provider,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  provider: CdnKey;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#EEF2FF] text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]">
          {icon}
        </span>
        <div>
          <div className="text-base font-bold text-[#1C2434] dark:text-[#DEE4EE]">{title}</div>
          <div className="text-xs text-[#64748B] dark:text-[#8899A8]">{subtitle}</div>
        </div>
      </div>
      <span className={providerBadge(provider)}>{providerLabel(provider)}</span>
    </div>
  );
}

function ProviderSegment({
  value,
  onChange,
  name,
}: {
  value: CdnKey;
  onChange: (provider: CdnKey) => void;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="flex gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1.5 dark:border-[#2E3A47] dark:bg-[#1A222C]"
    >
      {(["akamai", "fastly"] as CdnKey[]).map((provider) => (
        <button
          key={provider}
          type="button"
          role="radio"
          aria-checked={value === provider}
          onClick={() => onChange(provider)}
          className={segBtn(value === provider)}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-90" />
          {providerLabel(provider)}
        </button>
      ))}
    </div>
  );
}

/**
 * Per-channel overrides for one stream. Rendered by both cards — the exceptions
 * only apply while that stream's default is Fastly, since an exception can only
 * pull a channel back to Akamai.
 */
function ExceptionGrid({
  channels,
  enabled,
  onToggle,
  onSetAll,
  emptyNote,
}: {
  channels: ExceptionChannel[];
  enabled: Set<string>;
  onToggle: (slug: string) => void;
  onSetAll: (provider: CdnKey) => void;
  emptyNote: string;
}) {
  const allAkamai = channels.length > 0 && channels.every((channel) => enabled.has(channel.slug));
  const allFastly = channels.every((channel) => !enabled.has(channel.slug));

  return (
    <div className="mt-[18px]">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <div className={labelCls}>Channel exceptions · revert to Akamai</div>
        <span className="whitespace-nowrap text-[11.5px] font-semibold text-[#9A3412] dark:text-[#FDBA74]">
          {enabled.size} on Akamai
        </span>
      </div>
      {channels.length > 0 && (
        <div className="mb-2.5 flex items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-3.5 pr-2 dark:border-[#2E3A47] dark:bg-[#1A222C]">
          <span className="text-[12.5px] font-medium text-[#64748B] dark:text-[#8899A8]">
            Set all {channels.length} channel{channels.length === 1 ? "" : "s"} to
          </span>
          <div
            role="radiogroup"
            aria-label="Set all channels to"
            className="flex gap-1 rounded-[9px] border border-[#E2E8F0] bg-[#F1F5F9] p-1 dark:border-[#2E3A47] dark:bg-[#24303F]"
          >
            <button
              type="button"
              role="radio"
              aria-checked={allAkamai}
              disabled={allAkamai}
              onClick={() => onSetAll("akamai")}
              className={bulkSegBtn("akamai", allAkamai)}
            >
              <span className={bulkDot("akamai")} />
              Deselect All
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={allFastly}
              disabled={allFastly}
              onClick={() => onSetAll("fastly")}
              className={bulkSegBtn("fastly", allFastly)}
            >
              <span className={bulkDot("fastly")} />
              Select All
            </button>
          </div>
        </div>
      )}
      {channels.length === 0 ? (
        <InfoNote>{emptyNote}</InfoNote>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => {
            const reverted = enabled.has(channel.slug);
            return (
              <button
                key={channel.id}
                type="button"
                role="switch"
                aria-checked={reverted}
                aria-label={`${channel.name} on Akamai`}
                onClick={() => onToggle(channel.slug)}
                className={cn(
                  "flex items-center justify-between gap-2.5 rounded-[10px] border px-3 py-2.5 text-left transition-colors",
                  reverted
                    ? "border-[#FED7AA] bg-[#FFF7ED] dark:border-[#7C2D12] dark:bg-[#3B1F0B]"
                    : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] dark:border-[#2E3A47] dark:bg-[#1A222C]"
                )}
              >
                <span className="flex min-w-0 flex-col items-start gap-px">
                  <span className="max-w-[130px] truncate text-[13px] font-bold text-[#1C2434] dark:text-[#DEE4EE]">
                    {channel.name}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold",
                      reverted
                        ? "text-[#9A3412] dark:text-[#FDBA74]"
                        : "text-brand-600 dark:text-[#818CF8]"
                    )}
                  >
                    {reverted ? "Akamai" : "Fastly"}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                    reverted ? "bg-[#CBD5E1] dark:bg-[#2E3A47]" : "bg-brand-500"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      !reverted && "translate-x-4"
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CdnTrafficRouting() {
  const { notify } = useToast();
  const routingQuery = useCdnRoutingQuery();
  const channelsQuery = useChannelsQuery();
  const updateProviders = useUpdateCdnProviders();
  const updateExceptions = useUpdateCdnExceptions();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const routing = routingQuery.data;

  const channels = useMemo<ExceptionChannel[]>(() => {
    const rows = (channelsQuery.data ?? [])
      .map((channel) => ({ id: channel.id, name: channel.name, slug: channelSlug(channel.name) }))
      .filter((channel) => channel.slug.length > 0);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [channelsQuery.data]);

  const slugs = useMemo(() => channels.map((channel) => channel.slug), [channels]);

  // Server truth, normalised into the same shape the UI edits.
  const committed = useMemo<Draft | null>(() => {
    if (!routing) return null;
    const enabledFor = (values: string[] | undefined) => {
      const present = new Set((values ?? []).map((value) => value.trim().toLowerCase()));
      return new Set(slugs.filter((slug) => present.has(slug)));
    };
    return {
      live: routing.live?.provider ?? "akamai",
      vod: routing.vod?.provider ?? "akamai",
      enabled: {
        live: enabledFor(routing.exceptions?.live?.values),
        vod: enabledFor(routing.exceptions?.vod?.values),
      },
    };
  }, [routing, slugs]);

  // Re-seeds after every successful apply, since the mutations invalidate the query.
  useEffect(() => {
    setDraft(committed ? cloneDraft(committed) : null);
  }, [committed]);

  const changes = useMemo<Change[]>(() => {
    if (!committed || !draft) return [];
    const out: Change[] = [];
    if (draft.live !== committed.live) {
      out.push({
        title: "Live default",
        from: providerLabel(committed.live),
        to: providerLabel(draft.live),
      });
    }
    if (draft.vod !== committed.vod) {
      out.push({
        title: "VOD default",
        from: providerLabel(committed.vod),
        to: providerLabel(draft.vod),
      });
    }
    // Exceptions only exist — and are only written — while that stream's default is
    // Fastly. Both cards can list the same channel, so the title carries the stream.
    for (const stream of STREAMS) {
      if (draft[stream] !== "fastly") continue;
      for (const channel of channels) {
        const was = committed.enabled[stream].has(channel.slug);
        const now = draft.enabled[stream].has(channel.slug);
        if (was !== now) {
          out.push({
            title: `${STREAM_LABELS[stream]} · ${channel.name}`,
            from: was ? "Akamai" : "Fastly",
            to: now ? "Akamai" : "Fastly",
          });
        }
      }
    }
    return out;
  }, [committed, draft, channels]);

  const dirty = changes.length > 0;
  const saving = updateProviders.isPending || updateExceptions.isPending;

  const setProvider = (stream: Stream, provider: CdnKey) =>
    setDraft((current) => (current ? { ...current, [stream]: provider } : current));

  const toggleChannel = (stream: Stream, slug: string) =>
    setDraft((current) => {
      if (!current) return current;
      const enabled = new Set(current.enabled[stream]);
      if (enabled.has(slug)) enabled.delete(slug);
      else enabled.add(slug);
      return { ...current, enabled: { ...current.enabled, [stream]: enabled } };
    });

  // Bulk override for one stream: "akamai" reverts every channel, "fastly"
  // clears every exception. Always builds a fresh Set so `changes` recomputes.
  const setAllChannels = (stream: Stream, provider: CdnKey) =>
    setDraft((current) => {
      if (!current) return current;
      const enabled = provider === "akamai" ? new Set(slugs) : new Set<string>();
      return { ...current, enabled: { ...current.enabled, [stream]: enabled } };
    });

  const discard = () => setDraft(committed ? cloneDraft(committed) : null);

  const apply = async () => {
    if (!routing || !committed || !draft) return;

    const configurations: CdnConfigEntry[] = [];
    if (draft.live !== committed.live) {
      configurations.push({
        name: CDN_CONFIG_NAMES.live,
        active: routing.live?.active ?? true,
        payload: buildPayload(routing.live?.payload, draft.live),
      });
    }
    if (draft.vod !== committed.vod) {
      configurations.push({
        name: CDN_CONFIG_NAMES.vod,
        active: routing.vod?.active ?? true,
        payload: buildPayload(routing.vod?.payload, draft.vod),
      });
    }

    // One entry per stream whose exceptions actually moved. Both go in a single PUT.
    const changedStreams = STREAMS.filter(
      (stream) =>
        draft[stream] === "fastly" &&
        channels.some(
          (channel) =>
            committed.enabled[stream].has(channel.slug) !==
            draft.enabled[stream].has(channel.slug)
        )
    );

    try {
      // Project layer first, then the feature overrides that take precedence over it.
      if (configurations.length > 0) {
        await updateProviders.mutateAsync(configurations);
      }
      if (changedStreams.length > 0) {
        if (!routing.exceptions) {
          throw new Error(`The "Origin Akamai" feature is missing in Atenea`);
        }
        const exceptions = routing.exceptions;
        const features = changedStreams.map((stream) => {
          const entry = exceptions[stream];
          if (!entry) {
            throw new Error(
              `The "${CDN_CONFIG_NAMES[stream]}" entry is missing from the "Origin Akamai" feature in Atenea`
            );
          }
          return {
            id: entry.id,
            values: applyExceptions(entry.values, slugs, draft.enabled[stream]),
          };
        });
        await updateExceptions.mutateAsync({ documentId: exceptions.documentId, features });
      }
      setConfirmOpen(false);
      notify({
        title: "Routing updated",
        description: `${PLATFORM} traffic routing has been applied.`,
        variant: "success",
      });
    } catch (error) {
      notify({
        title: "Failed to apply routing changes",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    }
  };

  if (routingQuery.isPending || channelsQuery.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-[104px] animate-pulse rounded-xl bg-[#E2E8F0] dark:bg-[#24303F]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-[320px] animate-pulse rounded-xl bg-[#E2E8F0] dark:bg-[#24303F]" />
          <div className="h-[320px] animate-pulse rounded-xl bg-[#E2E8F0] dark:bg-[#24303F]" />
        </div>
      </div>
    );
  }

  if (routingQuery.isError || !routing || !draft) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
        {routingQuery.error instanceof Error
          ? routingQuery.error.message
          : "Could not load the CDN routing configuration from Atenea."}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Platform scope */}
        <section className={cn(cardCls, "py-[18px]")}>
          <div className={cn(labelCls, "mb-2 block")}>Platform scope</div>
          <span className="inline-flex items-center gap-[7px] rounded-[9px] border border-brand-500 bg-[#EEF2FF] px-3.5 py-2 text-[13px] font-bold text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            {PLATFORM}
          </span>
          <div className="mt-3 flex gap-2 border-t border-[#F1F5F9] pt-3 text-[12.5px] leading-relaxed text-[#64748B] dark:border-[#2E3A47] dark:text-[#8899A8]">
            <Info size={15} className="mt-px shrink-0 text-brand-500" />
            <span>
              You are editing{" "}
              <b className="text-[#1C2434] dark:text-[#DEE4EE]">{PLATFORM}</b>. Changes here apply
              only to the multisite platform — additional platforms will appear here as they are
              onboarded.
            </span>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {/* Live */}
          <section className={cardCls}>
            <CardHeader
              icon={<Radio size={18} />}
              title="Live"
              subtitle="Linear channels"
              provider={draft.live}
            />
            <div className={cn(labelCls, "mb-2 block")}>Default provider</div>
            <ProviderSegment
              name="Live default provider"
              value={draft.live}
              onChange={(provider) => setProvider("live", provider)}
            />

            {draft.live === "fastly" ? (
              <ExceptionGrid
                channels={channels}
                enabled={draft.enabled.live}
                onToggle={(slug) => toggleChannel("live", slug)}
                onSetAll={(provider) => setAllChannels("live", provider)}
                emptyNote="No live channels available to configure exceptions for."
              />
            ) : (
              <InfoNote>
                All live channels are served from Akamai. Switch the default to{" "}
                <b className="text-[#1C2434] dark:text-[#DEE4EE]">Fastly</b> to enable per-channel
                exceptions.
              </InfoNote>
            )}
          </section>

          {/* VOD */}
          <section className={cardCls}>
            <CardHeader
              icon={<Film size={18} />}
              title="VOD"
              subtitle="On-demand delivery"
              provider={draft.vod}
            />
            <div className={cn(labelCls, "mb-2 block")}>Default provider</div>
            <ProviderSegment
              name="VOD default provider"
              value={draft.vod}
              onChange={(provider) => setProvider("vod", provider)}
            />

            {draft.vod === "fastly" ? (
              <ExceptionGrid
                channels={channels}
                enabled={draft.enabled.vod}
                onToggle={(slug) => toggleChannel("vod", slug)}
                onSetAll={(provider) => setAllChannels("vod", provider)}
                emptyNote="No channels available to configure exceptions for."
              />
            ) : (
              <InfoNote>
                All on-demand assets are served from Akamai. Switch the default to{" "}
                <b className="text-[#1C2434] dark:text-[#DEE4EE]">Fastly</b> to enable per-channel
                exceptions.
              </InfoNote>
            )}
          </section>
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#E2E8F0] bg-white/90 px-6 py-3.5 backdrop-blur dark:border-[#2E3A47] dark:bg-[#1A222C]/90">
        <div className="text-[13px] text-[#64748B] dark:text-[#8899A8]">
          {dirty
            ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}`
            : "No unsaved changes"}
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={discard} disabled={!dirty || saving}>
            Discard
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={!dirty || saving}>
            Review &amp; apply
          </Button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apply routing changes"
        size="md"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-[#64748B] dark:text-[#8899A8]">Platform</span>
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-brand-500 bg-[#EEF2FF] px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]">
            <span className="h-[7px] w-[7px] rounded-full bg-brand-500" />
            {PLATFORM}
          </span>
        </div>

        <div className="mb-[18px] flex flex-col gap-2">
          {changes.map((change) => (
            <div
              key={`${change.title}-${change.to}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 dark:border-[#2E3A47] dark:bg-[#1A222C]"
            >
              <span className="text-[13.5px] font-bold text-[#1C2434] dark:text-[#DEE4EE]">
                {change.title}
              </span>
              <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                <span className="text-[#94A3B8]">{change.from}</span>
                <ArrowRight size={15} className="text-[#94A3B8]" />
                <span
                  className={cn(
                    "font-bold",
                    change.to === "Fastly"
                      ? "text-brand-600 dark:text-[#818CF8]"
                      : "text-[#9A3412] dark:text-[#FDBA74]"
                  )}
                >
                  {change.to}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="mb-5 flex items-start gap-2.5 rounded-[10px] border border-[#FDE68A] bg-[#FEF9C3] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#854D0E] dark:border-[#854D0E] dark:bg-[#422006] dark:text-[#FDE68A]">
          <AlertTriangle size={16} className="mt-px shrink-0" />
          <span>
            This re-routes <b>production</b> multisite traffic as soon as you apply. Playback
            sessions already in progress are unaffected.
          </span>
        </div>

        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={saving}>
            {saving ? "Applying…" : "Apply changes"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
