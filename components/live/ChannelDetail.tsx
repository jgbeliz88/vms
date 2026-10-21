"use client";

import { useState } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PlaybackPanel } from "./PlaybackPanel";
import { LinearsSection } from "./LinearsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { ChannelConfigEditor } from "./ChannelConfigEditor";
import { ChannelConfigReadOnlyTable } from "./ChannelConfigReadOnlyTable";
import { ChannelCommands } from "./ChannelCommands";
import { useUpdateChannelMetadata, useChannelDetailStatus } from "@/features/live/hooks";
import { buildLinearStatusRows } from "@/features/live/tag-groups";
import { LinearStatusGroups } from "./LinearStatusGroups";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/Toast";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import type { ConfigLayout } from "@/features/live/hooks";
import type { MediaexcelChannel } from "@/features/live/types";
import type { AddLinearData } from "./ActionConfirmModal";
import type { ResolvedPod } from "@/features/live/types";

export function ChannelDetail({
  channel,
  configLayout,
  onSaveConfig,
  savingConfig,
  mediaexcelChannels = [],
  linkedByPod,
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
  mediaexcelChannels?: MediaexcelChannel[];
  linkedByPod: Map<string, string>;
  onCreateLinear?: (data: AddLinearData) => Promise<void>;
  onDeleteLinear?: (pod: ResolvedPod, linearName: string) => Promise<void>;
  onDeletePod?: (pod: ResolvedPod, linearName: string | null) => Promise<void>;
}) {
  const canAdmin = usePermission([PERMISSIONS.LIVE_MANAGE_CHANNELS]);
  const updateMetadata = useUpdateChannelMetadata();
  const { notify } = useToast();
  const { data: settings } = useVmsSettingsQuery();
  const originBaseUrl = settings?.origin.live ?? "";
  const cdnBaseUrl = settings?.akamai.live ?? "";
  const statusQuery = useChannelDetailStatus(channel.id, channel.pods, originBaseUrl, cdnBaseUrl);

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
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status</div>
        {!originBaseUrl || !cdnBaseUrl ? (
          <p className="mt-3 text-xs text-slate-400">Configure origin and CDN URLs in Settings to enable status checks.</p>
        ) : (
          <div className="mt-3">
            {statusQuery.isLoading ? (
              <span className="text-xs text-slate-400 animate-pulse">checking…</span>
            ) : statusQuery.isError || !statusQuery.data ? (
              <Badge label="error" tone="error" />
            ) : (
              <LinearStatusGroups variant="detail" rows={buildLinearStatusRows(channel, statusQuery.data)} />
            )}
          </div>
        )}
      </div>

      {configLayout && (
        <CollapsibleCard title="Channel Configuration">
          {canAdmin && onSaveConfig ? (
            <ChannelConfigEditor
              channel={channel}
              layout={configLayout}
              onSave={(rows: ChannelConfigRow[]) => onSaveConfig(channel.id, rows)}
              saving={savingConfig ?? false}
            />
          ) : (
            <ChannelConfigReadOnlyTable channel={channel} layout={configLayout} />
          )}
        </CollapsibleCard>
      )}

      <PlaybackPanel channel={channel} />

      {onCreateLinear && (
        <LinearsSection
          channel={channel}
          mediaexcelChannels={mediaexcelChannels ?? []}
          linkedByPod={linkedByPod}
          onCreateLinear={onCreateLinear}
        />
      )}

      <ChannelCommands channel={channel} />
    </div>
  );
}
