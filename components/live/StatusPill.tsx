import { ChannelStatus } from "@/features/live/types";
import { cn } from "@/lib/utils/cn";

export function StatusPill({ status }: { status: ChannelStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        status === "ok" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
        status === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
        status === "error" && "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
