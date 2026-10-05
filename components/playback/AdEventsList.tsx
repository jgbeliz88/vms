"use client";

import type { AdEvent } from "@/components/live/StreamPlayer";
import { cn } from "@/lib/utils/cn";
import { AD_EVENT_TYPES, adEventTypeClass } from "@/components/playback/ad-event-styles";

type FilterControls = {
  /** Types present in the captured (unfiltered) events. */
  types: Set<AdEvent["type"]>;
  /** Selected types; empty means "all". */
  selected: Set<AdEvent["type"]>;
  onToggle: (type: AdEvent["type"]) => void;
  search: string;
  onSearch: (value: string) => void;
};

type Props = {
  /** Events to render (already filtered by the caller). */
  events: AdEvent[];
  /** Number of captured events before filtering. */
  totalCount: number;
  onClear: () => void;
  /** Type chips + search box; only the Live panel passes this. */
  filter?: FilterControls;
};

export function AdEventsList({ events, totalCount, onClear, filter }: Props) {
  const hasEvents = totalCount > 0;

  return (
    <div className="flex flex-col gap-2">
      {hasEvents && (
        <div className="flex flex-wrap items-center gap-1">
          {filter
            ? AD_EVENT_TYPES.filter((t) => filter.types.has(t)).map((type) => (
                <button
                  key={type}
                  onClick={() => filter.onToggle(type)}
                  className={cn(
                    "rounded px-[7px] py-1 text-[10px] font-bold uppercase leading-none transition-opacity",
                    filter.selected.size === 0 || filter.selected.has(type) ? "opacity-100" : "opacity-30",
                    adEventTypeClass(type)
                  )}
                >
                  {type}
                </button>
              ))
            : null}
          <button
            onClick={onClear}
            className="ml-auto text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Clear
          </button>
        </div>
      )}
      {filter && hasEvents && (
        <input
          type="text"
          value={filter.search}
          onChange={(e) => filter.onSearch(e.target.value)}
          placeholder="Search events..."
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        />
      )}
      {events.length === 0 ? (
        <div className="py-4 text-center text-xs text-slate-400">
          {hasEvents ? "No events match the current filter." : "No ad events detected yet."}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-block shrink-0 rounded px-1.5 py-[3px] text-[10px] font-bold uppercase leading-none",
                    adEventTypeClass(event.type)
                  )}
                >
                  {event.type}
                </span>
                <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">{event.detail}</span>
              </div>
              {event.plannedDuration != null && (
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Planned duration: {event.plannedDuration.toFixed(1)}s
                </div>
              )}
              {event.messageData != null && (
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="font-medium">X-MESSAGE-DATA (parsed):</div>
                  <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-1 text-[10px] dark:bg-slate-800">
                    ID3: {event.messageData || "(empty)"}
                  </pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
