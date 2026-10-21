import { cn } from "@/lib/utils/cn";

/** Compact HTTP status badge: green for 2xx/3xx, red otherwise. */
export function HttpStatusPill({ status }: { status: number }) {
  const ok = status >= 200 && status < 400;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-px text-[11px] font-bold",
        ok
          ? "bg-[#DCFCE7] text-[#166534] dark:bg-emerald-500/20 dark:text-emerald-200"
          : "bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-500/20 dark:text-rose-200"
      )}
    >
      {status}
    </span>
  );
}
