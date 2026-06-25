"use client";

import { useState } from "react";
import { ResolvedChannel, ChannelAction, ChannelConfigRow } from "@/features/live/types";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { PlaybackPanel } from "./PlaybackPanel";
import { LinearsSection } from "./LinearsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChannelConfigEditor } from "./ChannelConfigEditor";
import { ChannelConfigReadOnlyTable } from "./ChannelConfigReadOnlyTable";
import { ChannelCommands } from "./ChannelCommands";
import { useUpdateChannelMetadata, useChannelDetailStatus } from "@/features/live/hooks";
import type { ChannelDetailSection } from "@/features/live/hooks";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui/Toast";
import { useManifestPathTooltip } from "@/components/ui/ManifestPathTooltip";
import { useVmsSettingsQuery } from "@/features/settings/hooks";
import type { ConfigLayout } from "@/features/live/hooks";
import type { MediaexcelChannel } from "@/features/live/types";
import type { AddLinearData } from "./ActionConfirmModal";
import type { ResolvedPod } from "@/features/live/types";

function StatusCard({
  label,
  section,
  isLoading,
  isError,
  expanded,
}: {
  label: string;
  section: ChannelDetailSection | undefined;
  isLoading: boolean;
  isError: boolean;
  expanded: boolean;
}) {
  const { bindPath } = useManifestPathTooltip();
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">
      <div className="text-slate-500">{label}</div>
      <div className="mt-2">
        {isLoading ? (
          <span className="text-slate-400 animate-pulse">checking…</span>
        ) : isError ? (
          <Badge label="error" tone="error" />
        ) : section?.ok ? (
          <Badge label="OK" tone="success" />
        ) : (
          <Badge label="Failed" tone="error" />
        )}
      </div>
      {expanded && section && (
        <div className="mt-3 space-y-3">
          {section.pods.map((pod) => (
            <div key={pod.orilinear}>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {pod.orilinear}
              </div>
              <div className="flex flex-col gap-1">
                {pod.manifests.map((m) => (
                  <div
                    key={m.url}
                    {...bindPath(m.url)}
                    className={`cursor-pointer rounded-lg border px-2 py-1.5 transition-shadow hover:ring-2 ${
                      m.ok
                        ? "border-emerald-200 bg-emerald-50 hover:ring-emerald-500/45 dark:border-emerald-700/40 dark:bg-emerald-900/20"
                        : "border-red-200 bg-red-50 hover:ring-red-500/45 dark:border-red-700/40 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="font-medium text-slate-700 dark:text-slate-200">{m.label}</div>
                    <div className={`mt-0.5 font-mono break-all ${m.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                      {m.httpStatus ? `HTTP ${m.httpStatus}` : "Error"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChannelDetail({
  channel,
  configLayout,
  onSaveConfig,
  savingConfig,
  mediaexcelChannels = [],
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

  const [statusExpanded, setStatusExpanded] = useState(false);
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

  const overallOk =
    !statusQuery.isError &&
    !statusQuery.isLoading &&
    statusQuery.data?.origin.ok === true &&
    statusQuery.data?.originDrm.ok === true &&
    statusQuery.data?.cdn.ok === true;

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
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Status</div>
          <div className="flex items-center gap-2">
            {statusQuery.data && (
              <button
                onClick={() => setStatusExpanded((v) => !v)}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors select-none"
                aria-label={statusExpanded ? "Collapse details" : "Expand details"}
              >
                {statusExpanded ? "▲ collapse" : "▼ details"}
              </button>
            )}
            {!originBaseUrl || !cdnBaseUrl ? null : statusQuery.isLoading ? (
              <span className="text-xs text-slate-400 animate-pulse">checking…</span>
            ) : statusQuery.isError ? (
              <Badge label="Overall: error" tone="error" />
            ) : (
              <Badge label={overallOk ? "Overall: OK" : "Overall: Failed"} tone={overallOk ? "success" : "error"} />
            )}
          </div>
        </div>
        {!originBaseUrl || !cdnBaseUrl ? (
          <p className="mt-3 text-xs text-slate-400">Configure origin and CDN URLs in Settings to enable status checks.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <StatusCard
              label="Origin"
              section={statusQuery.data?.origin}
              isLoading={statusQuery.isLoading}
              isError={statusQuery.isError}
              expanded={statusExpanded}
            />
            <StatusCard
              label="Origin (DRM)"
              section={statusQuery.data?.originDrm}
              isLoading={statusQuery.isLoading}
              isError={statusQuery.isError}
              expanded={statusExpanded}
            />
            <StatusCard
              label="CDN"
              section={statusQuery.data?.cdn}
              isLoading={statusQuery.isLoading}
              isError={statusQuery.isError}
              expanded={statusExpanded}
            />
          </div>
        )}
      </div>

      {configLayout && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Channel Configuration
          </div>
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
        </div>
      )}

      <PlaybackPanel channel={channel} />

      {onCreateLinear && (
        <LinearsSection
          channel={channel}
          mediaexcelChannels={mediaexcelChannels ?? []}
          onCreateLinear={onCreateLinear}
        />
      )}

      <ChannelCommands channel={channel} />
    </div>
  );
}
