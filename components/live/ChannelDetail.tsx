"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { ROLES } from "@/lib/auth/permissions";
import { usePermission } from "@/lib/auth/usePermission";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PlaybackPanel } from "./PlaybackPanel";
import { LinearsPanel } from "./LinearsPanel";
import { Badge } from "@/components/ui/Badge";
import { deriveOverallStatus, deriveStatusParts } from "@/features/live/status";
import { ChannelConfigEditor } from "./ChannelConfigEditor";
import type { ConfigLayout } from "@/features/live/hooks";
import type { Encoder } from "@/features/live/types";
import type { AddLinearData } from "./ActionConfirmModal";
import type { ResolvedPod } from "@/features/live/types";

function statusTone(status: "ok" | "warning" | "error") {
  if (status === "ok") return "success" as const;
  if (status === "warning") return "warning" as const;
  return "error" as const;
}

const adReplacementActions = [
  { id: "scte-in", label: "SCTE IN", variant: "primary" as const },
  { id: "scte-out", label: "SCTE OUT", variant: "secondary" as const },
  { id: "admode-in", label: "AdMode IN", variant: "primary" as const },
  { id: "admode-out", label: "AdMode OUT", variant: "secondary" as const }
];

const blackoutOptions = [
  { id: "replace-blackout", label: "Replace" },
  { id: "remove-blackout", label: "Remove" }
];

export function ChannelDetail({
  channel,
  actions,
  onAction,
  onAdAction,
  configLayout,
  onSaveConfig,
  savingConfig,
  encoders = [],
  onCreateLinear,
  onDeleteLinear,
  onDeletePod,
}: {
  channel: ResolvedChannel;
  actions: ChannelAction[];
  onAction: (action: ChannelAction) => void;
  onAdAction: (channelId: number, actionId: string) => void;
  configLayout?: ConfigLayout;
  onSaveConfig?: (channelId: number, rows: ChannelConfigRow[]) => Promise<void>;
  savingConfig?: boolean;
  encoders?: Encoder[];
  onCreateLinear?: (data: AddLinearData) => Promise<void>;
  onDeleteLinear?: (pod: ResolvedPod, linearName: string) => Promise<void>;
  onDeletePod?: (pod: ResolvedPod, linearName: string | null) => Promise<void>;
}) {
  const canOperate = usePermission([ROLES.OPERATOR]);
  const [pendingAdAction, setPendingAdAction] = useState<{ id: string; label: string } | null>(null);
  const [blackoutOpen, setBlackoutOpen] = useState(false);
  const blackoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!blackoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (blackoutRef.current && !blackoutRef.current.contains(e.target as Node)) {
        setBlackoutOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [blackoutOpen]);

  const partStatus = useMemo(() => {
    const parts = (channel.metadata as Record<string, unknown>)?.statusParts;
    return deriveStatusParts(parts, channel.status);
  }, [channel.metadata, channel.status]);

  const overallStatus = useMemo(() => deriveOverallStatus(partStatus), [partStatus]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Channel Metadata Information
        </div>
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold">Name:</span> {channel.name}
            </div>
            <div>
              <span className="font-semibold">Channel Path:</span> {channel.channelPath || "—"}
            </div>
          </div>
          <JsonViewer data={channel.metadata} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status</div>
          <Badge label={`Overall: ${overallStatus}`} tone={statusTone(overallStatus)} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
            <div className="text-slate-500">Encoding</div>
            <div className="mt-2">
              <Badge label={partStatus.encoding} tone={statusTone(partStatus.encoding)} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
            <div className="text-slate-500">Origin</div>
            <div className="mt-2">
              <Badge label={partStatus.origin} tone={statusTone(partStatus.origin)} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
            <div className="text-slate-500">CDN</div>
            <div className="mt-2">
              <Badge label={partStatus.cdn} tone={statusTone(partStatus.cdn)} />
            </div>
          </div>
        </div>
      </div>

      {configLayout && onSaveConfig && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Channel Configuration
          </div>
          <ChannelConfigEditor
            channel={channel}
            layout={configLayout}
            onSave={(rows: ChannelConfigRow[]) => onSaveConfig(channel.id, rows)}
            saving={savingConfig ?? false}
          />
        </div>
      )}

      <PlaybackPanel channel={channel} />

      {onCreateLinear && onDeleteLinear && onDeletePod && (
        <LinearsPanel
          channel={channel}
          encoders={encoders}
          onCreateLinear={onCreateLinear}
          onDeleteLinear={onDeleteLinear}
          onDeletePod={onDeletePod}
        />
      )}

      {canOperate && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</div>
            <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.tone === "danger" ? "danger" : action.tone === "warning" ? "secondary" : "primary"}
                  className="whitespace-nowrap text-xs"
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">AdReplacement</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto">
                {adReplacementActions.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    className="whitespace-nowrap text-xs"
                    onClick={() => setPendingAdAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              <div ref={blackoutRef} className="relative shrink-0">
                <Button variant="secondary" className="whitespace-nowrap text-xs" onClick={() => setBlackoutOpen((o) => !o)}>
                  Blackout ▾
                </Button>
                {blackoutOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {blackoutOptions.map((opt) => (
                      <button
                        key={opt.id}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-xl last:rounded-b-xl dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => {
                          setBlackoutOpen(false);
                          setPendingAdAction(opt);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(pendingAdAction)}
        onClose={() => setPendingAdAction(null)}
        title={`Confirm: ${pendingAdAction?.label}`}
        size="md"
      >
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            You are about to send <span className="font-semibold text-slate-900 dark:text-slate-100">{pendingAdAction?.label}</span> to channel <span className="font-semibold text-slate-900 dark:text-slate-100">{channel.name}</span>.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingAdAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingAdAction) onAdAction(channel.id, pendingAdAction.id);
                setPendingAdAction(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
