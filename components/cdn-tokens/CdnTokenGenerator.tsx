"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Copy, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import { useChannelsQuery } from "@/features/live/hooks";
import { useFastChannelsQuery } from "@/features/fast-channels/hooks";
import { type CdnKey } from "@/features/playback/hooks";
import {
  useCdnToken,
  buildTokenAcl,
  cdnBaseFor,
  contentTypeFor,
  type StreamType,
  type ScopeType,
  type Mam,
} from "@/features/cdn-tokens/hooks";

type WindowOption = { key: string; label: string };

const WINDOW_OPTIONS: WindowOption[] = [
  { key: "1800", label: "30 min" },
  { key: "3600", label: "1 hour" },
  { key: "86400", label: "1 day" },
  { key: "604800", label: "1 week" },
  { key: "2592000", label: "1 month" },
  { key: "31536000", label: "1 year" },
  { key: "custom", label: "Custom" },
];

const CDN_OPTIONS: { key: CdnKey; label: string; sub: string }[] = [
  { key: "akamai", label: "Akamai", sub: "Edge tokenization" },
  { key: "fastly", label: "Fastly", sub: "Signed URLs" },
];

const STREAM_OPTIONS: { key: StreamType; label: string; sub: string }[] = [
  { key: "live", label: "Live", sub: "Linear channels" },
  { key: "vod", label: "VOD", sub: "On-demand" },
  { key: "fast", label: "Fast-Channels", sub: "FAST playlists" },
];

const MAM_OPTIONS: { key: Mam; label: string }[] = [
  { key: "bitmovin", label: "Bitmovin" },
  { key: "lightflow", label: "Lightflow" },
];

const STREAM_LABELS: Record<StreamType, string> = {
  live: "Live",
  vod: "VOD",
  fast: "Fast-Channels",
};

function fmtWindow(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [u, name] of units) {
    if (sec % u === 0) {
      const n = sec / u;
      return `${n} ${name}${n === 1 ? "" : "s"}`;
    }
  }
  return `${sec} seconds`;
}

// ── small presentational helpers ─────────────────────────────────────────────
const segBtn = (active: boolean) =>
  cn(
    "flex flex-1 flex-col items-start gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
    active
      ? "border-brand-500 bg-white text-brand-600 shadow-sm dark:bg-[#24303F] dark:text-[#818CF8]"
      : "border-transparent text-[#64748B] hover:bg-white/60 dark:text-[#8899A8] dark:hover:bg-white/5"
  );

const scopeCard = (active: boolean) =>
  cn(
    "flex flex-1 flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors",
    active
      ? "border-brand-500 bg-[#EEF2FF] text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]"
      : "border-[#E2E8F0] bg-white text-[#1C2434] hover:border-brand-500/50 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]"
  );

const chip = (active: boolean) =>
  cn(
    "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-colors",
    active
      ? "border-brand-500 bg-[#EEF2FF] text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]"
      : "border-[#E2E8F0] bg-white text-[#1C2434] hover:border-brand-500/50 dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]"
  );

const sectionCls =
  "rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm dark:border-[#2E3A47] dark:bg-[#24303F]";
const stepNum =
  "flex h-6 w-6 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-bold text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]";
const labelCls =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8899A8]";
const inputCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 font-mono text-[13px] text-[#1C2434] outline-none focus:border-brand-500 dark:border-[#2E3A47] dark:bg-[#1A222C] dark:text-[#DEE4EE]";

type TokenResult = {
  value: string;
  cdn: CdnKey;
  stream: StreamType;
  window: number;
  exp: number;
};

export function CdnTokenGenerator() {
  const { data: settings } = useVmsSettingsQuery();
  const { data: channels } = useChannelsQuery();
  const { data: fastChannels } = useFastChannelsQuery();
  const tokenMutation = useCdnToken();

  const [cdn, setCdn] = useState<CdnKey>("akamai");
  const [stream, setStream] = useState<StreamType>("live");
  const [scope, setScope] = useState<ScopeType>("all");
  const [liveChannelId, setLiveChannelId] = useState<number | null>(null);
  const [liveLinear, setLiveLinear] = useState<string | null>(null);
  const [vodMam, setVodMam] = useState<Mam>("bitmovin");
  const [vodUuid, setVodUuid] = useState("");
  const [fastChannel, setFastChannel] = useState<string | null>(null);
  const [customAcl, setCustomAcl] = useState("/*");
  const [windowSel, setWindowSel] = useState("3600");
  const [customWindow, setCustomWindow] = useState("3600");
  const [token, setToken] = useState<TokenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Any change invalidates a previously generated token.
  const invalidate = () => {
    setToken(null);
    setCopied(false);
    setError(null);
  };

  const selectedChannel = useMemo(
    () => channels?.find((c) => c.id === liveChannelId) ?? null,
    [channels, liveChannelId]
  );

  const linearNames = useMemo(() => {
    if (!selectedChannel) return [] as string[];
    return [
      ...new Set(
        selectedChannel.pods
          .map((p) => p.linear?.linearName)
          .filter((n): n is string => Boolean(n))
      ),
    ];
  }, [selectedChannel]);

  const windowSeconds =
    windowSel === "custom" ? parseInt(customWindow, 10) || 0 : parseInt(windowSel, 10);

  const acl = buildTokenAcl({
    cdn,
    stream,
    scope,
    settings,
    linearName: liveLinear ?? undefined,
    vodMam,
    vodUuid,
    fastChannel: fastChannel ?? undefined,
    customAcl,
  });

  const contentType = contentTypeFor(stream);
  const cdnBase = cdnBaseFor(settings, cdn, stream);
  const canGenerate = Boolean(acl) && windowSeconds > 0 && !tokenMutation.isPending;

  const bodyPreview =
    "{\n" +
    `  "acl": "${acl || "…"}",\n` +
    `  "key": "••••••••",\n` +
    `  "window": ${windowSeconds > 0 ? windowSeconds : 0}\n` +
    "}";

  const specificLabel = { live: "A linear", vod: "A VOD asset", fast: "A FAST channel" }[stream];
  const specificDesc = {
    live: "Channel → linear",
    vod: "MAM + content UUID",
    fast: "Pick one channel",
  }[stream];

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    try {
      const value = await tokenMutation.mutateAsync({
        provider: cdn,
        acl,
        contentType,
        window: windowSeconds,
      });
      setToken({
        value,
        cdn,
        stream,
        window: windowSeconds,
        exp: Math.floor(Date.now() / 1000) + windowSeconds,
      });
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token generation failed");
    }
  };

  const handleCopy = () => {
    if (!token) return;
    try {
      void navigator.clipboard?.writeText(token.value);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ── Form column ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col gap-4">
        {/* Step 1: CDN */}
        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={stepNum}>1</span>
            <div>
              <div className="text-[15px] font-bold text-[#1C2434] dark:text-white">Choose CDN</div>
              <div className="text-xs text-[#64748B] dark:text-[#8899A8]">
                Determines which signing key is used (resolved server-side).
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1.5 dark:border-[#2E3A47] dark:bg-[#1A222C]">
            {CDN_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  setCdn(o.key);
                  invalidate();
                }}
                className={segBtn(cdn === o.key)}
              >
                <span className="text-[13px] font-bold">{o.label}</span>
                <span className="text-[11px] font-medium opacity-70">{o.sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: Stream type */}
        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={stepNum}>2</span>
            <div>
              <div className="text-[15px] font-bold text-[#1C2434] dark:text-white">Stream type</div>
              <div className="text-xs text-[#64748B] dark:text-[#8899A8]">
                What kind of content this token is for.
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1.5 dark:border-[#2E3A47] dark:bg-[#1A222C]">
            {STREAM_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  setStream(o.key);
                  setScope("all");
                  invalidate();
                }}
                className={segBtn(stream === o.key)}
              >
                <span className="text-[13px] font-bold">{o.label}</span>
                <span className="text-[11px] font-medium opacity-70">{o.sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Step 3: Access scope */}
        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={stepNum}>3</span>
            <div>
              <div className="text-[15px] font-bold text-[#1C2434] dark:text-white">
                Access scope (ACL)
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#8899A8]">
                What paths the token is allowed to reach on the CDN.
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            {(
              [
                { key: "all", label: "Everything", desc: "/* — all paths" },
                { key: "specific", label: specificLabel, desc: specificDesc },
                { key: "custom", label: "Custom", desc: "Type the ACL" },
              ] as { key: ScopeType; label: string; desc: string }[]
            ).map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  setScope(o.key);
                  invalidate();
                }}
                className={scopeCard(scope === o.key)}
              >
                <span className="text-[13px] font-bold">{o.label}</span>
                <span className="text-[11px] font-medium text-[#8899A8]">{o.desc}</span>
              </button>
            ))}
          </div>

          {/* Specific: Live */}
          {scope === "specific" && stream === "live" && (
            <div className="mt-4 flex flex-col gap-3.5">
              <div>
                <div className={labelCls}>Channel</div>
                <div className="flex flex-wrap gap-2">
                  {(channels ?? []).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setLiveChannelId(c.id);
                        setLiveLinear(null);
                        invalidate();
                      }}
                      className={chip(liveChannelId === c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                  {channels && channels.length === 0 && (
                    <span className="text-xs text-[#8899A8]">No channels available.</span>
                  )}
                </div>
              </div>
              {selectedChannel && (
                <div>
                  <div className={labelCls}>Linear · {selectedChannel.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {linearNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          setLiveLinear(name);
                          invalidate();
                        }}
                        className={chip(liveLinear === name)}
                      >
                        {name}
                      </button>
                    ))}
                    {linearNames.length === 0 && (
                      <span className="text-xs text-[#8899A8]">
                        No linears assigned to this channel.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Specific: VOD */}
          {scope === "specific" && stream === "vod" && (
            <div className="mt-4 flex flex-col gap-3.5">
              <div>
                <div className={labelCls}>MAM</div>
                <div className="flex max-w-xs gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1.5 dark:border-[#2E3A47] dark:bg-[#1A222C]">
                  {MAM_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      onClick={() => {
                        setVodMam(o.key);
                        invalidate();
                      }}
                      className={segBtn(vodMam === o.key)}
                    >
                      <span className="text-[13px] font-bold">{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-2">
                <span className={labelCls + " mb-0"}>Content UUID</span>
                <input
                  value={vodUuid}
                  onChange={(e) => {
                    setVodUuid(e.target.value);
                    invalidate();
                  }}
                  placeholder="efbd130a-393e-44ce-bc06-0ba73050c73f"
                  spellCheck={false}
                  className={cn(inputCls, "max-w-md")}
                />
              </label>
            </div>
          )}

          {/* Specific: Fast */}
          {scope === "specific" && stream === "fast" && (
            <div className="mt-4">
              <div className={labelCls}>FAST channel</div>
              <div className="flex flex-wrap gap-2">
                {(fastChannels ?? []).map((c) => (
                  <button
                    key={c.name}
                    onClick={() => {
                      setFastChannel(c.name);
                      invalidate();
                    }}
                    className={chip(fastChannel === c.name)}
                  >
                    {c.name}
                  </button>
                ))}
                {fastChannels && fastChannels.length === 0 && (
                  <span className="text-xs text-[#8899A8]">No fast channels available.</span>
                )}
              </div>
            </div>
          )}

          {/* Custom ACL */}
          {scope === "custom" && (
            <div className="mt-4">
              <label className="flex flex-col gap-2">
                <span className={labelCls + " mb-0"}>Custom ACL path</span>
                <input
                  value={customAcl}
                  onChange={(e) => {
                    setCustomAcl(e.target.value);
                    invalidate();
                  }}
                  placeholder="/staging/mitele-comedia.isml/*"
                  spellCheck={false}
                  className={inputCls}
                />
                <span className="text-xs text-[#64748B] dark:text-[#8899A8]">
                  Type any path. Use <code className="font-mono">{"/*"}</code> to allow everything.
                </span>
              </label>
            </div>
          )}
        </section>

        {/* Step 4: Window */}
        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={stepNum}>4</span>
            <div>
              <div className="text-[15px] font-bold text-[#1C2434] dark:text-white">
                Validity window
              </div>
              <div className="text-xs text-[#64748B] dark:text-[#8899A8]">
                How long the token stays valid, from the moment it is generated.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w.key}
                onClick={() => {
                  setWindowSel(w.key);
                  invalidate();
                }}
                className={chip(windowSel === w.key)}
              >
                {w.label}
              </button>
            ))}
          </div>
          {windowSel === "custom" && (
            <label className="mt-3.5 flex max-w-[260px] flex-col gap-2">
              <span className={labelCls + " mb-0"}>Seconds</span>
              <input
                type="number"
                min={1}
                value={customWindow}
                onChange={(e) => {
                  setCustomWindow(e.target.value);
                  invalidate();
                }}
                className={inputCls}
              />
            </label>
          )}
        </section>
      </div>

      {/* ── Preview / output column ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-[88px]">
        <section className={cn(sectionCls, "flex flex-col gap-4")}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-brand-600 dark:text-[#818CF8]" />
            <span className="text-[15px] font-bold text-[#1C2434] dark:text-white">
              Request preview
            </span>
          </div>

          <div>
            <div className={labelCls}>ACL being generated</div>
            <div
              className={cn(
                "break-all rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-3.5 py-3 font-mono text-[13px] leading-relaxed dark:border-[#2E3A47] dark:bg-[#1A222C]",
                acl ? "text-[#1C2434] dark:text-[#DEE4EE]" : "text-[#8899A8]"
              )}
            >
              {acl || "Select a target above to build the ACL"}
            </div>
            {scope !== "custom" && !cdnBase && (
              <div className="mt-2 text-[11.5px] leading-relaxed text-amber-600 dark:text-amber-400">
                No CDN base URL configured for {STREAM_LABELS[stream]} / {cdn} in Settings — the ACL
                has no path prefix.
              </div>
            )}
          </div>

          <div>
            <div className={labelCls}>Body sent to Enigma</div>
            <pre className="m-0 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#0F172A] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#A7F3D0]">
              {bodyPreview}
            </pre>
          </div>

          <div className="flex items-center gap-2 text-[12.5px] text-[#64748B] dark:text-[#8899A8]">
            <Clock size={15} />
            <span>
              {windowSeconds > 0
                ? `Valid for ${fmtWindow(windowSeconds)} (${windowSeconds}s) after generation.`
                : "Set a validity window."}
            </span>
          </div>
        </section>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-600",
            !canGenerate && "cursor-not-allowed opacity-45 hover:bg-brand-500"
          )}
        >
          <Sparkles size={17} />
          {tokenMutation.isPending ? "Generating…" : "Generate token"}
        </button>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {token && (
          <section className={cn(sectionCls, "flex flex-col gap-3.5")}>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Check size={18} className="text-emerald-600" strokeWidth={2.4} />
                <span className="text-[15px] font-bold text-[#1C2434] dark:text-white">
                  Token generated
                </span>
              </div>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-[#3C50E0]/20 dark:text-[#818CF8]">
                  {token.cdn === "akamai" ? "Akamai" : "Fastly"}
                </span>
                <span className="rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748B] dark:border-[#2E3A47] dark:bg-[#1A222C] dark:text-[#8899A8]">
                  {STREAM_LABELS[token.stream]}
                </span>
              </div>
            </div>
            <div className="max-h-40 overflow-auto break-all rounded-lg bg-[#0F172A] p-3.5 font-mono text-[12.5px] leading-relaxed text-[#A7F3D0]">
              {token.value}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#64748B] dark:text-[#8899A8]">
                Expires {new Date(token.exp * 1000).toLocaleString()} · valid{" "}
                {fmtWindow(token.window)}
              </span>
              <button
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors",
                  copied
                    ? "border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                    : "border-[#E2E8F0] bg-white text-[#1C2434] hover:bg-[#F1F5F9] dark:border-[#2E3A47] dark:bg-[#24303F] dark:text-[#DEE4EE]"
                )}
              >
                {copied ? <Check size={15} strokeWidth={2.4} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy token"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
