import type { AdEvent } from "@/components/live/StreamPlayer";

/** Display order for the ad-event type filter chips. */
export const AD_EVENT_TYPES: AdEvent["type"][] = ["scte35", "cue", "daterange", "stream", "emsg", "id3"];

export function adEventTypeClass(type: AdEvent["type"]): string {
  switch (type) {
    case "scte35":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    case "cue":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
    case "daterange":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "stream":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
    case "emsg":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
}
