"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FastChannelPlaybackPanel } from "./FastChannelPlaybackPanel";
import { TransitionsTable } from "./TransitionsTable";
import type { FastChannel } from "@/features/fast-channels/types";


const MOCK_TRANSITIONS: Record<string, string> = {
  "creation": "Success",
  "2026-02-26T05:00:00Z": "Success",
  "2026-02-27T05:00:00Z": "Success",
  "2026-02-28T05:00:00Z": "Success",
  "2026-03-01T05:00:00Z": "Success",
  "2026-03-02T05:00:00Z": "Success",
  "2026-03-03T05:00:00Z": "Success",
  "2026-03-04T05:00:00Z": "Success",
  "2026-03-05T05:00:00Z": "Success",
  "2026-03-06T05:00:00Z": "Success",
  "2026-03-07T05:00:00Z": "Success",
  "2026-03-08T05:00:00Z": "Success",
  "2026-03-13T05:00:00Z": "Success",
  "2026-03-14T05:00:00Z": "Success",
  "2026-03-15T05:00:00Z": "Success",
};

type Filters = {
  name: string;
  uri: string;
};

function buildPlaybackUri(uri: string, name: string): string {
  try {
    const { origin } = new URL(uri);
    return `${origin}/${name}.isml/.m3u8`;
  } catch {
    return uri;
  }
}

const inputCls =
  "w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder-slate-300 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-600";

function ChannelTransitions() {
  return <TransitionsTable transitions={MOCK_TRANSITIONS} />;
}

export function FastChannelTable({
  channels,
  onDelete,
  onCreateTransition,
}: {
  channels: FastChannel[];
  onDelete?: (name: string) => void;
  onCreateTransition?: (name: string) => void;
}) {
  const [filters, setFilters] = useState<Filters>({ name: "", uri: "" });
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setExpandedName(null);
  };

  const filtered = channels.filter((ch) => {
    if (filters.name && !ch.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.uri && !ch.uri.toLowerCase().includes(filters.uri.toLowerCase())) return false;
    return true;
  });

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {filtered.length} of {channels.length} channels
        </span>
        {hasFilters && (
          <button
            onClick={() => setFilters({ name: "", uri: "" })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">URI</th>
                <th className="px-4 py-3"></th>
              </tr>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2">
                  <input
                    className={inputCls}
                    placeholder="Filter name…"
                    value={filters.name}
                    onChange={(e) => setFilter("name", e.target.value)}
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    className={inputCls}
                    placeholder="Filter URI…"
                    value={filters.uri}
                    onChange={(e) => setFilter("uri", e.target.value)}
                  />
                </th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400">
                    No results match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ch) => {
                  const isExpanded = expandedName === ch.name;
                  return (
                    <Fragment key={ch.name}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {ch.name}
                        </td>
                        <td className="break-all px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                          <a
                            href={buildPlaybackUri(ch.uri, ch.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {buildPlaybackUri(ch.uri, ch.name)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => setExpandedName(isExpanded ? null : ch.name)}
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={3} className="bg-slate-50 px-4 py-4 dark:bg-slate-950">
                            <div className="space-y-4">
                              <FastChannelPlaybackPanel channelName={ch.name} />
                              {(onCreateTransition || onDelete) && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {onCreateTransition && (
                                      <Button variant="secondary" onClick={() => onCreateTransition(ch.name)}>
                                        Create Transition
                                      </Button>
                                    )}
                                    {onDelete && (
                                      <Button variant="danger" onClick={() => onDelete(ch.name)}>
                                        Delete Channel
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Transitions</div>
                                <ChannelTransitions />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
