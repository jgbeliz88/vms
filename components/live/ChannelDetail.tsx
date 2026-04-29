"use client";

import { useMemo, useState } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PlaybackPanel } from "./PlaybackPanel";
import { LinearsPanel } from "./LinearsPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { deriveOverallStatus, deriveStatusParts } from "@/features/live/status";
import { ChannelConfigEditor } from "./ChannelConfigEditor";
import { ChannelCommands } from "./ChannelCommands";
import { useUpdateChannelMetadata } from "@/features/live/hooks";
import { usePermission } from "@/lib/auth/usePermission";
import { ROLES } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/Toast";
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
  const canAdmin = usePermission([ROLES.ADMIN]);
  const updateMetadata = useUpdateChannelMetadata();
  const { notify } = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const enterEdit = () => {
    setDraft(JSON.stringify(channel.metadata, null, 2));
    setParseError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setParseError(null);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch {
      setParseError("Invalid JSON");
    }
  };

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setParseError("Invalid JSON");
      return;
    }
    try {
      await updateMetadata.mutateAsync({ id: channel.id, metadata: parsed });
      notify({ title: "Metadata saved", description: "Channel metadata updated successfully" });
      setEditing(false);
    } catch (err) {
      notify({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unable to save metadata",
        variant: "error",
      });
    }
  };

  const partStatus = useMemo(() => {
    const parts = (channel.metadata as Record<string, unknown>)?.statusParts;
    return deriveStatusParts(parts, channel.status);
  }, [channel.metadata, channel.status]);

  const overallStatus = useMemo(() => deriveOverallStatus(partStatus), [partStatus]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Channel Metadata Information
          </div>
          {canAdmin && !editing && (
            <Button variant="secondary" onClick={enterEdit}>
              Edit Metadata
            </Button>
          )}
          {canAdmin && editing && (
            <div className="flex items-center gap-2">
              {parseError && (
                <span className="text-[11px] text-red-500">{parseError}</span>
              )}
              <Button variant="secondary" onClick={cancelEdit} disabled={updateMetadata.isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!!parseError || updateMetadata.isPending}
              >
                {updateMetadata.isPending ? "Saving…" : "Save Metadata"}
              </Button>
            </div>
          )}
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
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              spellCheck={false}
              rows={8}
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-100 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-slate-700"
            />
          ) : (
            <JsonViewer data={channel.metadata} />
          )}
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
