"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { getLocalHistory, LocalHistoryItem } from "@/features/history/storage";
import { useHistoryQuery } from "@/features/actions/hooks";
import { getToken } from "@/lib/storage/token";

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Success", value: "success" },
  { label: "Error", value: "error" }
];

export default function HistoryPage() {
  const [status, setStatus] = useState("all");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<LocalHistoryItem | null>(null);

  const localHistory = useMemo(() => getLocalHistory(), []);
  const filtered = useMemo(() => {
    return localHistory.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (actionFilter && !item.actionId.toLowerCase().includes(actionFilter.toLowerCase())) {
        return false;
      }
      if (dateFilter && !item.createdAt.startsWith(dateFilter)) return false;
      return true;
    });
  }, [localHistory, status, actionFilter, dateFilter]);

  const hasToken = useMemo(() => Boolean(getToken()), []);
  const historyQuery = useHistoryQuery(hasToken);

  return (
    <AuthGuard>
      <AppShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">History</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Review actions executed locally and on the backend.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  label="Action"
                  placeholder="Filter by action id"
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                />
                <Select
                  label="Status"
                  options={statusOptions}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Local Runs
                </div>
                <div className="mt-3 space-y-2">
                  {filtered.length === 0 ? (
                    <div className="text-sm text-slate-500">No matching history.</div>
                  ) : (
                    filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500">{item.createdAt}</div>
                        </div>
                        <Badge label={item.status} tone={item.status === "success" ? "success" : "error"} />
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Backend History
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {!hasToken
                    ? "Token required to fetch /history"
                    : historyQuery.isLoading
                      ? "Loading..."
                      : historyQuery.isError
                        ? "Unable to fetch /history"
                        : `${historyQuery.data?.data.items.length ?? 0} items`}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Details</div>
              {selected ? (
                <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">Request</div>
                    <JsonViewer data={selected.request} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">Response</div>
                    <JsonViewer data={selected.response ?? selected.error} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-slate-500">Select a run to view details.</div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
