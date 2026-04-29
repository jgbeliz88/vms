"use client";

import { useState } from "react";
import { ResolvedChannel, ResolvedPod, ChannelAction } from "@/features/live/types";
import { channelActions } from "@/features/live/config";
import { useChannelAction } from "@/features/live/hooks";
import { useToast } from "@/components/ui/Toast";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

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

function IconSync() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

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

// ── Action metadata ───────────────────────────────────────────────────────────

const ACTION_META = {
  sync:     { iconBg: "bg-blue-100 dark:bg-blue-900/30",   iconColor: "text-blue-600 dark:text-blue-400",   icon: <IconSync /> },
  clean:    { iconBg: "bg-orange-100 dark:bg-orange-900/30",iconColor: "text-orange-600 dark:text-orange-400",icon: <IconTrash /> },
  descache: { iconBg: "bg-purple-100 dark:bg-purple-900/30",iconColor: "text-purple-600 dark:text-purple-400",icon: <IconDatabase /> },
} as const;

const CMD_ICONS = {
  scte:     <IconWaveform />,
  admode:   <IconColumns />,
  blackout: <IconHelpCircle />,
};

// ── Shared StatusDot ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ResolvedPod["status"] }) {
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

// ── TargetBar ─────────────────────────────────────────────────────────────────

function TargetBar({
  pods,
  selected,
  onToggle,
  onSelectAll,
}: {
  pods: ResolvedPod[];
  selected: string[];
  onToggle: (name: string) => void;
  onSelectAll: () => void;
}) {
  const allSelected = pods.length > 0 && selected.length === pods.length;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-700 dark:bg-slate-950">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Target Linears
      </span>

      <div className="flex flex-1 flex-wrap gap-2">
        {pods.length === 0 ? (
          <span className="text-xs text-slate-400">No pods configured</span>
        ) : (
          pods.map((pod) => {
            const active = selected.includes(pod.name);
            return (
              <button
                key={pod.name}
                type="button"
                onClick={() => onToggle(pod.name)}
                className={cn(
                  "flex select-none items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-all",
                  active
                    ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20"
                    : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-600 dark:hover:bg-brand-900/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                    active
                      ? "border-brand-500 bg-brand-500 dark:border-brand-400"
                      : "border-slate-300 dark:border-slate-600"
                  )}
                >
                  {active && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {pod.name}
                  </div>
                  <div className="text-[10px] text-slate-400">{pod.linear?.linearName ?? "—"}</div>
                </div>
                <StatusDot status={pod.status} />
              </button>
            );
          })
        )}
      </div>

      {selected.length === 0 && pods.length > 0 && (
        <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
          ⚠ No target selected
        </span>
      )}

      {pods.length > 0 && (
        <button
          type="button"
          onClick={onSelectAll}
          className="shrink-0 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      )}
    </div>
  );
}

// ── ActionsColumn ─────────────────────────────────────────────────────────────

function ActionsColumn({
  selectedPodNames,
  onRequestConfirm,
}: {
  selectedPodNames: string[];
  onRequestConfirm: (action: ChannelAction) => void;
}) {
  const noTarget = selectedPodNames.length === 0;

  return (
    <div className="flex flex-col gap-2.5 p-4">
      {channelActions.map((action) => {
        const meta = ACTION_META[action.id as keyof typeof ACTION_META];
        return (
          <button
            key={action.id}
            type="button"
            disabled={noTarget}
            onClick={() => onRequestConfirm(action)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
              noTarget
                ? "cursor-not-allowed border-slate-200 opacity-45 dark:border-slate-700"
                : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-brand-900/10"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                meta?.iconBg
              )}
            >
              <span className={meta?.iconColor}>{meta?.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                {action.label}
              </span>
              <span className="block text-[10px] text-slate-400">{action.description}</span>
            </span>
            <svg
              className="shrink-0 text-slate-300 dark:text-slate-600"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        );
      })}

      {noTarget && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-center text-[10px] text-amber-600 dark:border-amber-700/30 dark:bg-amber-900/10 dark:text-amber-400">
          Select target linears above to enable actions
        </p>
      )}
    </div>
  );
}

// ── AdReplacementColumn ───────────────────────────────────────────────────────

function AdReplacementColumn({ selectedPodNames, channelName }: { selectedPodNames: string[]; channelName: string }) {
  const [activeCmd, setActiveCmd] = useState<CommandKey>("scte");
  const [activeSubtype, setActiveSubtype] = useState(COMMAND_CONFIG.scte.subtypes[0].id);
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const cfg = COMMAND_CONFIG[activeCmd];
  const subtypeCfg = cfg.subtypes.find((s) => s.id === activeSubtype) ?? cfg.subtypes[0];
  const payloadKey = `${activeCmd}_${activeSubtype}`;
  const payload = payloads[payloadKey] ?? subtypeCfg.template(channelName);
  const noTarget = selectedPodNames.length === 0;

  const switchCmd = (cmd: CommandKey) => {
    setActiveCmd(cmd);
    setActiveSubtype(COMMAND_CONFIG[cmd].subtypes[0].id);
    setSent(false);
  };

  const handleSend = async () => {
    if (noTarget || sending) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Command tabs */}
      <div className="flex gap-2">
        {(Object.entries(COMMAND_CONFIG) as [CommandKey, (typeof COMMAND_CONFIG)[CommandKey]][]).map(
          ([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchCmd(key)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-all",
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
              <span
                className={cn(
                  "text-[9px]",
                  activeCmd === key ? "text-brand-400" : "text-slate-400"
                )}
              >
                {c.desc}
              </span>
            </button>
          )
        )}
      </div>

      {/* Subtype selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Event type
        </span>
        {cfg.subtypes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setActiveSubtype(s.id);
              setSent(false);
            }}
            className={cn(
              "rounded-md border px-4 py-1.5 text-xs font-medium transition-all",
              activeSubtype === s.id
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            )}
          >
            {s.label}
            {activeSubtype === s.id && (
              <span className="ml-1.5 text-[10px] opacity-75">— {s.desc}</span>
            )}
          </button>
        ))}
      </div>

      {/* Payload editor */}
      <div className="flex flex-col gap-1.5">
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
          rows={8}
          className={cn(
            "w-full resize-y rounded-lg border bg-slate-50 px-3.5 py-3 font-mono text-[11px] leading-relaxed outline-none transition-all focus:bg-white focus:ring-2 dark:bg-slate-950 dark:focus:bg-slate-900",
            cfg.payloadType === "xml"
              ? "border-slate-200 text-teal-700 focus:border-teal-400 focus:ring-teal-400/10 dark:border-slate-700 dark:text-teal-300 dark:focus:border-teal-500"
              : "border-slate-200 text-purple-700 focus:border-purple-400 focus:ring-purple-400/10 dark:border-slate-700 dark:text-purple-300 dark:focus:border-purple-500"
          )}
        />
      </div>

      {/* Send button */}
      <button
        type="button"
        disabled={noTarget || sending}
        onClick={handleSend}
        className={cn(
          "flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white transition-all",
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
            Send {cfg.label} {subtypeCfg.label} Event
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
  );
}

// ── ChannelCommands ───────────────────────────────────────────────────────────

export function ChannelCommands({ channel }: { channel: ResolvedChannel }) {
  const canOperate = usePermission([ROLES.OPERATOR]);
  const channelAction = useChannelAction();
  const { notify } = useToast();

  const [selectedPodNames, setSelectedPodNames] = useState<string[]>(() =>
    channel.pods.map((p) => p.name)
  );
  const [confirmingAction, setConfirmingAction] = useState<ChannelAction | null>(null);

  const togglePod = (name: string) => {
    setSelectedPodNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    setSelectedPodNames(
      selectedPodNames.length === channel.pods.length ? [] : channel.pods.map((p) => p.name)
    );
  };

  const selectedPods = channel.pods.filter((p) => selectedPodNames.includes(p.name));

  const executeAction = async () => {
    if (!confirmingAction) return;
    const filteredChannel = { ...channel, pods: selectedPods };
    try {
      const result = await channelAction.mutateAsync({
        channel: filteredChannel,
        actionId: confirmingAction.id,
      });
      const summary = result.podResults.map((p) => `${p.podName}: ${p.status}`).join(" · ");
      notify({ title: "Action executed", description: `${confirmingAction.label} — ${summary}` });
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
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Card header */}
      <div className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Channel Commands
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          Select target linears, then trigger actions or send ad replacement events
        </div>
      </div>

      {/* Shared target bar */}
      <TargetBar
        pods={channel.pods}
        selected={selectedPodNames}
        onToggle={togglePod}
        onSelectAll={handleSelectAll}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-[300px_1fr]">
        {/* Left: Actions */}
        <div className="border-r border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Actions</span>
            <span className="text-[10px] text-slate-400">Send commands to linears</span>
          </div>
          <ActionsColumn
            selectedPodNames={selectedPodNames}
            onRequestConfirm={setConfirmingAction}
          />
        </div>

        {/* Right: Ad Replacement */}
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Ad Replacement
            </span>
            <span className="text-[10px] text-slate-400">SCTE, ID3, or Blackout events</span>
          </div>
          <AdReplacementColumn selectedPodNames={selectedPodNames} channelName={channel.name} />
        </div>
      </div>

      {/* Action confirm dialog */}
      <Modal
        open={Boolean(confirmingAction)}
        onClose={() => setConfirmingAction(null)}
        title={`Confirm: ${confirmingAction?.label ?? ""}`}
        size="md"
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>This action will be sent to the following linears:</p>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            {selectedPods.map((pod) => (
              <div key={pod.id} className="flex items-center gap-2">
                <StatusDot status={pod.status} />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{pod.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {pod.linear?.linearName ?? "—"}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  ({pod.encoderName})
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmingAction(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmingAction?.tone === "danger" ? "danger" : "primary"}
              onClick={executeAction}
              disabled={channelAction.isPending}
            >
              {channelAction.isPending ? "Executing…" : `${confirmingAction?.label ?? ""} →`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
