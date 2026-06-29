"use client";

import { useToast } from "@/components/ui/Toast";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { useConfigLayoutQuery } from "@/features/live/hooks";
import { useVodConfigQuery, useUpdateVodConfig } from "@/features/vod/hooks";
import type { VodConfigRow } from "@/features/vod/vod-types";
import { VodConfigEditor } from "@/components/vod/VodConfigEditor";
import { VodConfigReadOnlyTable } from "@/components/vod/VodConfigReadOnlyTable";

/**
 * The shared VOD configuration table, shown in every VOD's detail view. The config
 * is global — editing it here changes it for all VODs. Always visible; editable only
 * with the vms_vod_actions permission, otherwise read-only.
 */
export function VodConfigPanel() {
  const canAdmin = usePermission([PERMISSIONS.VOD_ACTIONS]);
  const { notify } = useToast();
  const layoutQuery = useConfigLayoutQuery();
  const configQuery = useVodConfigQuery();
  const updateConfig = useUpdateVodConfig();

  const handleSave = async (rows: VodConfigRow[]) => {
    try {
      await updateConfig.mutateAsync(rows);
      notify({ title: "VOD configuration saved", variant: "success" });
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
  const loading = layoutQuery.isLoading || configQuery.isLoading;
  const error = layoutQuery.isError || configQuery.isError;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">VOD Configuration</div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Shared across all VODs — changes apply to every VOD.
      </p>

      <div className="mt-3">
        {loading ? (
          <div className="text-xs text-slate-400">Loading configuration…</div>
        ) : error || !layout ? (
          <div className="text-xs text-rose-500">Failed to load VOD configuration.</div>
        ) : canAdmin ? (
          <VodConfigEditor
            layout={layout}
            config={config}
            onSave={handleSave}
            saving={updateConfig.isPending}
          />
        ) : (
          <VodConfigReadOnlyTable layout={layout} config={config} />
        )}
      </div>
    </div>
  );
}
