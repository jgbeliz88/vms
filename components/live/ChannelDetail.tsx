"use client";

import { useMemo } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PlaybackPanel } from "./PlaybackPanel";
import { LinearsPanel } from "./LinearsPanel";
import { Badge } from "@/components/ui/Badge";
import { deriveOverallStatus, deriveStatusParts } from "@/features/live/status";
import { ChannelConfigEditor } from "./ChannelConfigEditor";
import { ChannelCommands } from "./ChannelCommands";
import type { ConfigLayout } from "@/features/live/hooks";
import type { Encoder } from "@/features/live/types";
import type { AddLinearData } from "./ActionConfirmModal";
import type { ResolvedPod } from "@/features/live/types";

function statusTone(status: "ok" | "warning" | "error") {
  if (status === "ok") return "success" as const;
  if (status === "warning") return "warning" as const;
  return "error" as const;
}

export function ChannelDetail({
  channel,
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

      <ChannelCommands channel={channel} />
    </div>
  );
}
