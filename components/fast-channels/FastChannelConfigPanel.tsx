"use client";

import { useToast } from "@/components/ui/Toast";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useConfigLayoutQuery } from "@/features/live/hooks";
import {
  useFastChannelConfigQuery,
  useFastChannelBatchesQuery,
  useUpdateFastChannelConfig,
} from "@/features/fast-channels/hooks";
import { hasAnyConfigValue, type FastChannelConfigRow } from "@/features/fast-channels/types";
import { FastChannelConfigEditor } from "./FastChannelConfigEditor";
import { FastChannelConfigReadOnlyTable } from "./FastChannelConfigReadOnlyTable";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

/**
 * A fast channel's configuration table, shown in its Details panel. Collapsed by default;
 * editable only with the vms_fc_manage_channels permission, otherwise read-only.
 *
 * Saving needs a batchId, which is not part of the config: it comes from the batch whose
 * name equals the channel name. Without one, the table still renders but cannot be saved.
 */
export function FastChannelConfigPanel({ channelName }: { channelName: string }) {
  const canAdmin = usePermission([PERMISSIONS.FC_MANAGE_CHANNELS]);
  const { notify } = useToast();
  const layoutQuery = useConfigLayoutQuery();
  const configQuery = useFastChannelConfigQuery(channelName);
  const batchesQuery = useFastChannelBatchesQuery(canAdmin);
  const updateConfig = useUpdateFastChannelConfig();

  const batchId = batchesQuery.data?.find((b) => b.name === channelName)?.id ?? null;

  const handleSave = async (rows: FastChannelConfigRow[]) => {
    if (batchId === null) return;
    // All-N/A rows are dropped so they never create empty records upstream — unless the row
    // is already persisted, in which case it must be sent so its cleared fields get nulled.
    const configs = rows.filter(
      (row) =>
        hasAnyConfigValue(row) ||
        config.some((r) => r.platform === row.platform && r.device === row.device)
    );
    try {
      await updateConfig.mutateAsync({ channelName, batchId, configs });
      notify({ title: "Configuration saved", description: `${channelName} updated.`, variant: "success" });
    } catch (error) {
      notify({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "error",
      });
    }
  };

  const layout = layoutQuery.data;
  const config = configQuery.data ?? [];
  const loading = layoutQuery.isLoading || configQuery.isLoading || (canAdmin && batchesQuery.isLoading);
  const error = layoutQuery.isError || configQuery.isError;

  return (
    <CollapsibleCard title="Fast Channel Configuration">
      {loading ? (
        <div className="text-xs text-slate-400">Loading configuration…</div>
      ) : error || !layout ? (
        <div className="text-xs text-rose-500">Failed to load fast channel configuration.</div>
      ) : canAdmin ? (
        <FastChannelConfigEditor
          channelName={channelName}
          layout={layout}
          config={config}
          batchId={batchId}
          onSave={handleSave}
          saving={updateConfig.isPending}
        />
      ) : (
        <FastChannelConfigReadOnlyTable layout={layout} config={config} />
      )}
    </CollapsibleCard>
  );
}
