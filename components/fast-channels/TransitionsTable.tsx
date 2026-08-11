"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useDeleteFastChannelTransition } from "@/features/fast-channels/hooks";
import { formatUtc } from "@/features/fast-channels/format";
import type { FastChannelTransitions } from "@/features/fast-channels/types";
import { usePermission } from "@/lib/auth/usePermission";
import { PERMISSIONS } from "@/lib/auth/permissions";

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "success") return "success" as const;
  if (s === "failed" || s === "error") return "error" as const;
  if (s === "running" || s === "pending") return "warning" as const;
  return "default" as const;
}

function formatKey(key: string): string {
  if (key === "creation") return "Creation";
  return formatUtc(key);
}

function sortKey(key: string): number {
  if (key === "creation") return -Infinity;
  const d = new Date(key);
  return isNaN(d.getTime()) ? Infinity : d.getTime();
}

export function TransitionsTable({
  channelName,
  transitions,
}: {
  channelName: string;
  transitions: FastChannelTransitions;
}) {
  const canAdmin = usePermission([PERMISSIONS.FC_MANAGE_TRANSITIONS]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const deleteMutation = useDeleteFastChannelTransition();

  const entries = Object.entries(transitions).sort(([a], [b]) => sortKey(a) - sortKey(b));

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-950">
        No transitions found.
      </div>
    );
  }

  function smilUrl(key: string): string {
    if (key === "creation") {
      return `/api/fast-channels/${encodeURIComponent(channelName)}/smil`;
    }
    return `/api/fast-channels/${encodeURIComponent(channelName)}/transitions/${encodeURIComponent(key)}/smil`;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Nombre</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">Status</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map(([key, status]) => (
            <tr key={key} className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{formatKey(key)}</td>
              <td className="px-4 py-3">
                <Badge label={status} tone={statusTone(status)} />
              </td>
              <td className="px-4 py-3 text-right">
                {canAdmin && deleteConfirm === key ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-slate-500">Delete?</span>
                    <Button
                      variant="danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        deleteMutation.mutate(
                          { channelName, transitionName: key },
                          { onSettled: () => setDeleteConfirm(null) }
                        );
                      }}
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Yes"}
                    </Button>
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => window.open(smilUrl(key), "_blank", "noopener,noreferrer")}
                    >
                      SMIL
                    </Button>
                    {canAdmin && key !== "creation" && (
                      <Button variant="danger" onClick={() => setDeleteConfirm(key)}>
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
