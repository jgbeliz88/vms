"use client";

import { useState } from "react";
import { ResolvedChannel, EnigmaLinear, EnigmaLinearPod, ChannelAction } from "@/features/live/types";
import { channelActions } from "@/features/live/config";
import { useBatchLinearSync, useBatchLinearClean, useSendLinearAdEvent } from "@/features/live/hooks";
import { useToast } from "@/components/ui/Toast";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { useSession } from "@/lib/session/provider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { TagChip } from "@/components/ui/TagChip";
import {
  IconLinear,
  IconPod,
  IconEncoder,
  ACTION_META,
  linearEncoderNames,
  countLinearPods,
  countLinearEncoders,
} from "./linear-ui";
import { MoveLinearsModal, type MoveSource } from "./MoveLinearsModal";

// ── Payload templates ─────────────────────────────────────────────────────────

function utcPlus1Min() {
  return new Date(Date.now() + 60_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

const SCTE_OUT = (channelName: string) => `<?xml version="1.0" encoding="UTF-8"?>
<SignalProcessingNotification acquisitionPointIdentity="${channelName}">
    <ResponseSignal action="create">
        <UTCPoint utcPoint="${utcPlus1Min()}"/>
        <SCTE35PointDescriptor spliceCommandType="5">
            <SpliceInsert
                spliceEventID="1645197575"
                spliceEventCancelIndicator="false"
                outOfNetworkIndicator="true"
                duration="PT06M49S"
                uniqueProgramID="1645197575"
            />
        </SCTE35PointDescriptor>
    </ResponseSignal>
</SignalProcessingNotification>`;

const SCTE_IN = (channelName: string) => `<?xml version="1.0" encoding="UTF-8"?>
<SignalProcessingNotification acquisitionPointIdentity="${channelName}">
    <ResponseSignal action="create">
        <UTCPoint utcPoint="${utcPlus1Min()}"/>
        <SCTE35PointDescriptor spliceCommandType="5">
            <SpliceInsert
                spliceEventID="1645197575"
                spliceEventCancelIndicator="false"
                outOfNetworkIndicator="false"
                duration="PT06M49S"
                uniqueProgramID="1645197575"
            />
        </SCTE35PointDescriptor>
    </ResponseSignal>
</SignalProcessingNotification>`;

const SCTE_CUSTOM = (channelName: string) => `<?xml version="1.0" encoding="UTF-8"?>
<SignalProcessingNotification acquisitionPointIdentity="${channelName}">
    <ResponseSignal action="create">
        <UTCPoint utcPoint="${utcPlus1Min()}"/>
        <SCTE35PointDescriptor spliceCommandType="6">
            <SegmentationDescriptorInfo
                segmentationEventID="1573337"
                segmentationTypeID="52"
                pidType="12"
                upid="eyJldmVudElEIjoiMTU3MzMzNyIsImdlb1Jlc3RyaWN0aW9uIjoiYWxsIiwgImR0IjoiMjAyMy0wMi0yN1QxNToxNjoyNFoiLCJkZCI6IjI2LTIzLTAwMDExIiwiZGRlIjoicHJ1ZWJhIn0="
                duration="PT0M60S"
            />
        </SCTE35PointDescriptor>
    </ResponseSignal>
</SignalProcessingNotification>`;

const ADMODE_OUT = () => `{
    "duration": 4,
    "interval": 0,
    "start": 0,
    "frames": [
        {
            "owner": "admode",
            "information": "out_30000",
            "id": "TXXX"
        }
    ]
}`;

const ADMODE_IN = () => `{
    "duration": 4,
    "interval": 0,
    "start": 0,
    "frames": [
        {
            "owner": "admode",
            "information": "in",
            "id": "TXXX"
        }
    ]
}`;

const ADMODE_EVENT = () => `{
    "duration": 4,
    "interval": 0,
    "start": 0,
    "frames": [
        {
            "owner": "event",
            "information": "1234567_es",
            "id": "TXXX"
        }
    ]
}`;

const BLACKOUT_REPLACE = () => `{
    "operation": "replace",
    "playlist": "cartelaadlive"
}`;

const BLACKOUT_REMOVE = () => `{
    "operation": "restore"
}`;

// ── Command configuration ─────────────────────────────────────────────────────

type CommandKey = "scte" | "admode" | "blackout";

const COMMAND_CONFIG: Record<
  CommandKey,
  {
    label: string;
    desc: string;
    payloadType: "xml" | "json";
    subtypes: { id: string; label: string; template: (channelName: string) => string; desc: string }[];
  }
> = {
  scte: {
    label: "SCTE",
    desc: "Splice events",
    payloadType: "xml",
    subtypes: [
      { id: "out", label: "Out", template: SCTE_OUT, desc: "Start ad break" },
      { id: "in", label: "In", template: SCTE_IN, desc: "End ad break" },
      { id: "custom", label: "Custom", template: SCTE_CUSTOM, desc: "Send Custom SCTE Event" },
    ],
  },
  admode: {
    label: "ID3",
    desc: "ID3 ad mode",
    payloadType: "json",
    subtypes: [
      { id: "out", label: "Out", template: ADMODE_OUT, desc: "Start ID3 Ad Break" },
      { id: "in", label: "In", template: ADMODE_IN, desc: "End ID3 Ad Break" },
      { id: "event", label: "Event", template: ADMODE_EVENT, desc: "Send Current ID3 Event" },
    ],
  },
  blackout: {
    label: "Blackout",
    desc: "Static slate",
    payloadType: "json",
    subtypes: [
      { id: "replace", label: "Replace", template: BLACKOUT_REPLACE, desc: "Replace with slate" },
      { id: "remove", label: "Remove", template: BLACKOUT_REMOVE, desc: "Restore live stream" },
    ],
  },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconWaveform() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconColumns() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function IconHelpCircle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── Linear helpers ────────────────────────────────────────────────────────────

const AVAILABLE_TAGS = ["Web", "Apps", "SmartTV"] as const;

function deriveLinearStatus(linear: EnigmaLinear): EnigmaLinearPod["status"] {
  const statuses = linear.pods.map((p) => p.status);
  if (statuses.some((s) => s === "degraded")) return "degraded";
  if (statuses.some((s) => s === "stopped")) return "stopped";
  return "running";
}

const CMD_ICONS = {
  scte:     <IconWaveform />,
  admode:   <IconColumns />,
  blackout: <IconHelpCircle />,
};

// ── Shared StatusDot ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: EnigmaLinearPod["status"] }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        status === "running"  ? "bg-emerald-500" :
        status === "degraded" ? "bg-amber-500"   : "bg-red-500"
      )}
    />
  );
}

// ── PodEncoderTree ────────────────────────────────────────────────────────────

function PodEncoderTree({ linear }: { linear: EnigmaLinear }) {
  return (
    <div className="space-y-1.5">
      {linear.pods.map((pod) => (
        <div key={pod.id} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-1.5">
            <IconPod className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">pod</span>
            <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{pod.name}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] capitalize text-slate-400 dark:text-slate-500">
              <StatusDot status={pod.status} />{pod.status}
            </span>
          </div>
          <div className="ml-4 mt-1 border-l border-dashed border-slate-200 pl-2.5 dark:border-slate-700">
            {pod.encoders.map((e) => (
              <div key={`${pod.id}-${e.id}`} className="flex flex-wrap items-center gap-1.5 py-0.5 text-[10px]">
                <IconEncoder className="h-2.5 w-2.5 text-slate-400 dark:text-slate-500" />
                <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500">enc</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{e.name}</span>
                <span className="text-slate-400 dark:text-slate-500">· {e.deviceId}.{e.channelIndex}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LinearSummaryLine ─────────────────────────────────────────────────────────

function LinearSummaryLine({ linear }: { linear: EnigmaLinear }) {
  const encs = linearEncoderNames(linear);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
      <span className="inline-flex items-center gap-1">
        <IconPod className="h-2.5 w-2.5" />
        {linear.pods.length} {linear.pods.length === 1 ? "pod" : "pods"}
      </span>
      <span className="text-slate-300 dark:text-slate-600">·</span>
      <span className="inline-flex items-center gap-1">
        <IconEncoder className="h-2.5 w-2.5" />
        {encs.join(", ")}
      </span>
    </span>
  );
}

// ── ActionsRow ────────────────────────────────────────────────────────────────

function ActionsRow({
  selectedLinearIds,
  onRequestConfirm,
}: {
  selectedLinearIds: number[];
  onRequestConfirm: (action: ChannelAction) => void;
}) {
  const { user } = useSession();
  const noTarget = selectedLinearIds.length === 0;
  const visibleActions = channelActions.filter(
    (a) => !a.allowedPermissions || hasPermission(user, a.allowedPermissions)
  );

  return (
    <div className="grid grid-cols-1 gap-2.5 p-4">
      {visibleActions.map((action) => {
        const meta = ACTION_META[action.id as keyof typeof ACTION_META];
        return (
          <button
            key={action.id}
            type="button"
            disabled={noTarget}
            onClick={() => onRequestConfirm(action)}
            className={cn(
              "group flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all",
              noTarget
                ? "cursor-not-allowed border-slate-200 opacity-45 dark:border-slate-700"
                : "border-slate-200 bg-white hover:-translate-y-px hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-brand-900/10"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                meta?.iconBg
              )}
            >
              <span className={meta?.iconColor}>{meta?.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                {action.label}
              </span>
              <span className="block text-[10px] leading-snug text-slate-400">{action.description}</span>
            </span>
            <svg
              className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ── AdReplacementRow ──────────────────────────────────────────────────────────

function AdReplacementRow({
  channelName,
  selectedLinearIds,
}: {
  channelName: string;
  selectedLinearIds: number[];
}) {
  const [activeCmd, setActiveCmd] = useState<CommandKey>("scte");
  const [activeSubtype, setActiveSubtype] = useState(COMMAND_CONFIG.scte.subtypes[0].id);
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const sendEvent = useSendLinearAdEvent();
  const { notify } = useToast();

  const cfg = COMMAND_CONFIG[activeCmd];
  const subtypeCfg = cfg.subtypes.find((s) => s.id === activeSubtype) ?? cfg.subtypes[0];
  const payloadKey = `${activeCmd}_${activeSubtype}`;
  const payload = payloads[payloadKey] ?? subtypeCfg.template(channelName);
  const noTarget = selectedLinearIds.length === 0;
  const sending = sendEvent.isPending;

  const switchCmd = (cmd: CommandKey) => {
    setActiveCmd(cmd);
    setActiveSubtype(COMMAND_CONFIG[cmd].subtypes[0].id);
    setSent(false);
  };

  const handleSend = async () => {
    if (noTarget || sending) return;
    try {
      const { results } = await sendEvent.mutateAsync({
        linearIds: selectedLinearIds,
        command: activeCmd,
        payload,
      });
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        notify({ title: `${cfg.label} sent successfully`, variant: "success" });
        setSent(true);
        setTimeout(() => setSent(false), 2500);
      } else {
        const description = failed
          .map((r) => `${r.encoderName}: ${r.error ?? "unknown error"}`)
          .join("\n");
        notify({ title: `Failed to send ${cfg.label} to`, description, variant: "error" });
      }
    } catch {
      notify({ title: `Failed to send ${cfg.label}`, variant: "error" });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_1.4fr]">
      {/* Column A: command + subtype + send */}
      <div className="flex flex-col gap-3">
        <div>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Command
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(COMMAND_CONFIG) as [CommandKey, (typeof COMMAND_CONFIG)[CommandKey]][]).map(
              ([key, c]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchCmd(key)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-all",
                    activeCmd === key
                      ? "border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-400"
                      : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md",
                      activeCmd === key
                        ? "bg-brand-100 dark:bg-brand-900/40"
                        : "bg-slate-100 dark:bg-slate-800"
                    )}
                  >
                    {CMD_ICONS[key]}
                  </span>
                  <span className="text-[11px] font-semibold">{c.label}</span>
                </button>
              )
            )}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Event type
          </span>
          <div className="flex flex-wrap gap-1.5">
            {cfg.subtypes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSubtype(s.id);
                  setSent(false);
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all",
                  activeSubtype === s.id
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">{subtypeCfg.desc}</p>
        </div>

        <button
          type="button"
          disabled={noTarget || sending}
          onClick={handleSend}
          className={cn(
            "mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all",
            sent
              ? "bg-emerald-600 dark:bg-emerald-700"
              : sending
              ? "cursor-wait bg-brand-400"
              : noTarget
              ? "cursor-not-allowed bg-brand-400 opacity-50"
              : "bg-brand-500 hover:-translate-y-px hover:bg-brand-600 hover:shadow-md dark:bg-brand-600 dark:hover:bg-brand-500"
          )}
        >
          {sending ? (
            <>
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Sending…
            </>
          ) : sent ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Sent!
            </>
          ) : (
            <>
              Send {cfg.label} {subtypeCfg.label}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Column B: payload editor */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Payload · {cfg.payloadType.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() =>
              setPayloads((p) => ({ ...p, [payloadKey]: subtypeCfg.template(channelName) }))
            }
            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Reset template
          </button>
        </div>
        <textarea
          value={payload}
          onChange={(e) =>
            setPayloads((p) => ({ ...p, [payloadKey]: e.target.value }))
          }
          spellCheck={false}
          className={cn(
            "w-full flex-1 resize-none rounded-lg border bg-slate-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed outline-none transition-all focus:bg-white focus:ring-2 dark:bg-slate-950 dark:focus:bg-slate-900",
            "min-h-[180px]",
            cfg.payloadType === "xml"
              ? "border-slate-200 text-teal-700 focus:border-teal-400 focus:ring-teal-400/10 dark:border-slate-700 dark:text-teal-300 dark:focus:border-teal-500"
              : "border-slate-200 text-purple-700 focus:border-purple-400 focus:ring-purple-400/10 dark:border-slate-700 dark:text-purple-300 dark:focus:border-purple-500"
          )}
        />
      </div>
    </div>
  );
}

// ── ChannelCommands ───────────────────────────────────────────────────────────

export function ChannelCommands({ channel }: { channel: ResolvedChannel }) {
  const canOperate = usePermission([PERMISSIONS.LINEAR_ACTIONS]);
  const batchSync = useBatchLinearSync();
  const batchClean = useBatchLinearClean();
  const { notify } = useToast();

  const activeLinears = channel.linears.filter((l) => l.name !== null);

  const [selectedLinearIds, setSelectedLinearIds] = useState<number[]>(() =>
    activeLinears.map((l) => l.id)
  );
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<ChannelAction | null>(null);
  // Frozen at open time: the post-move refetch drops the moved linears from `channel`.
  const [moveSnapshot, setMoveSnapshot] = useState<{ source: MoveSource; linears: EnigmaLinear[] } | null>(null);

  const visibleLinears =
    activeTags.length === 0
      ? activeLinears
      : activeLinears.filter((l) => activeTags.some((t) => l.tags.includes(t)));
  const visibleIds = visibleLinears.map((l) => l.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedLinearIds.includes(id));
  const noTarget = selectedLinearIds.length === 0;

  const selectedLinears = visibleLinears.filter((l) => selectedLinearIds.includes(l.id));

  const toggleTagFilter = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const toggleLinear = (id: number) =>
    setSelectedLinearIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSelectAll = () =>
    setSelectedLinearIds(allSelected ? [] : visibleIds);

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  const isPending = batchSync.isPending || batchClean.isPending;

  const requestAction = (action: ChannelAction) => {
    if (action.id === "move") {
      setMoveSnapshot({
        source: { id: channel.id, name: channel.name, activeCount: activeLinears.length },
        linears: selectedLinears,
      });
      return;
    }
    setConfirmingAction(action);
  };

  const handleLinearsMoved = (ids: number[]) =>
    setSelectedLinearIds((prev) => prev.filter((id) => !ids.includes(id)));

  const executeAction = async () => {
    if (!confirmingAction) return;

    const batchInput = selectedLinears.map((l) => ({
      linearId: l.id,
      linearName: l.name,
      channelId: channel.id,
      channelName: channel.name,
      tags: l.tags,
    }));

    try {
      const results =
        confirmingAction.id === "sync"
          ? await batchSync.mutateAsync(batchInput)
          : await batchClean.mutateAsync(batchInput);

      const failures = results.filter((r) => r.status === "error");
      if (failures.length === 0) {
        const verb = confirmingAction.id === "sync" ? "synchronized" : "cleaned";
        notify({ title: `Linears ${verb}`, variant: "success" });
      } else {
        const description = failures
          .map((r) => `${r.linearName ?? r.linearId}: ${r.error}`)
          .join(" · ");
        notify({ title: "Action failed", description, variant: "error" });
      }
    } catch (error) {
      notify({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unable to execute action",
        variant: "error",
      });
    } finally {
      setConfirmingAction(null);
    }
  };

  if (!canOperate) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Card header */}
      <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Channel Commands
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          Select linears once — use them for actions or ad-replacement events
        </div>
      </div>

      {/* Two-column layout: shared Target Linears left + stacked sections right */}
      <div className="grid grid-cols-[minmax(340px,388px)_1fr]">

        {/* LEFT: Shared Target Linears */}
        <div className="border-r border-slate-200 dark:border-slate-700">
          <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <span className="block whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-slate-400">Target linears</span>
                <span className="block whitespace-nowrap text-[10px] text-slate-400/80">
                  {selectedLinearIds.length}/{visibleLinears.length} selected · {countLinearPods(selectedLinears)} pods
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="shrink-0 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Device-tag filter */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
              <span className="mr-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">By device</span>
              {AVAILABLE_TAGS.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  active={activeTags.includes(tag)}
                  onClick={() => toggleTagFilter(tag)}
                />
              ))}
            </div>

            {/* Linear list */}
            <div className="flex flex-col gap-2 p-3">
              {visibleLinears.length === 0 ? (
                <span className="text-xs text-slate-400">No linears configured</span>
              ) : (
                visibleLinears.map((linear) => {
                  const active = selectedLinearIds.includes(linear.id);
                  const isOpen = expandedIds.has(linear.id);
                  return (
                    <div
                      key={linear.id}
                      className={cn(
                        "select-none rounded-lg border transition-all",
                        active
                          ? "border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-900/20"
                          : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600"
                      )}
                    >
                      <div className="flex items-start gap-2.5 px-3 py-2">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleLinear(linear.id)}
                          className="mt-0.5 flex shrink-0 items-center"
                          aria-label={`Toggle ${linear.name}`}
                        >
                          <span
                            className={cn(
                              "grid h-3.5 w-3.5 place-items-center rounded-[4px] border transition-colors",
                              active
                                ? "border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-400"
                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                            )}
                          >
                            {active && (
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <path d="M1.5 4.5l2 2 4-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                        </button>

                        {/* Linear info */}
                        <button
                          type="button"
                          onClick={() => toggleLinear(linear.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="flex flex-wrap items-center gap-1.5">
                            <IconLinear className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{linear.name}</span>
                            <StatusDot status={deriveLinearStatus(linear)} />
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {linear.tags.map((t) => <TagChip key={t} tag={t} />)}
                          </span>
                          <LinearSummaryLine linear={linear} />
                        </button>

                        {/* Disclosure toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(linear.id)}
                          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          aria-expanded={isOpen}
                        >
                          details
                          <svg
                            className={cn("h-3 w-3 transition-transform", isOpen ? "rotate-0" : "-rotate-90")}
                            viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="5,6 8,9 11,6" />
                          </svg>
                        </button>
                      </div>

                      {/* Accordion body */}
                      {isOpen && (
                        <div className="border-t border-slate-200/70 px-3 py-2.5 dark:border-slate-700/60">
                          <PodEncoderTree linear={linear} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Stacked sections */}
        <div className="flex flex-col">
          {/* Linear Actions */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-1.5 dark:border-slate-800 dark:bg-slate-950/50">
            <span className="size-1.5 rounded-full bg-brand-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Linear actions
            </span>
          </div>
          <ActionsRow
            selectedLinearIds={selectedLinearIds}
            onRequestConfirm={requestAction}
          />

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-slate-700" />

          {/* Ad Replacement */}
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-5 py-1.5 dark:border-slate-800 dark:bg-slate-950/50">
            <span className="size-1.5 rounded-full bg-violet-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Ad Replacement
            </span>
          </div>
          <AdReplacementRow
            channelName={channel.name}
            selectedLinearIds={selectedLinearIds}
          />

          {/* Shared no-target warning */}
          {noTarget && (
            <p className="mx-4 mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
              Select at least one linear to enable actions and ad-replacement events
            </p>
          )}
        </div>
      </div>

      {/* Action confirm dialog */}
      <Modal
        open={Boolean(confirmingAction)}
        onClose={() => setConfirmingAction(null)}
        title={`Confirm · ${confirmingAction?.label ?? ""}`}
        size="md"
      >
        {confirmingAction && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  ACTION_META[confirmingAction.id as keyof typeof ACTION_META]?.iconBg
                )}
              >
                <span className={ACTION_META[confirmingAction.id as keyof typeof ACTION_META]?.iconColor}>
                  {ACTION_META[confirmingAction.id as keyof typeof ACTION_META]?.icon}
                </span>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {confirmingAction.label}
                </p>
                <p className="text-[11px] text-slate-400">
                  {selectedLinears.length} {selectedLinears.length === 1 ? "linear" : "linears"} ·{" "}
                  {countLinearPods(selectedLinears)} pods ·{" "}
                  {countLinearEncoders(selectedLinears)} encoders
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              This action will be sent to the following linears and everything they affect:
            </p>

            <div className="max-h-72 space-y-3 overflow-y-auto">
              {selectedLinears.map((linear) => (
                <div
                  key={linear.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-950/40"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <IconLinear className="h-3.5 w-3.5 text-brand-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {linear.name}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {linear.tags.map((t) => <TagChip key={t} tag={t} />)}
                    </div>
                  </div>
                  <PodEncoderTree linear={linear} />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmingAction(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmingAction.tone === "warning" || confirmingAction.tone === "danger" ? "danger" : "primary"}
                onClick={executeAction}
                disabled={isPending}
              >
                {isPending ? "Executing…" : `${confirmingAction.label} →`}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {moveSnapshot && (
        <MoveLinearsModal
          onClose={() => setMoveSnapshot(null)}
          source={moveSnapshot.source}
          linears={moveSnapshot.linears}
          onMoved={handleLinearsMoved}
        />
      )}
    </div>
  );
}
