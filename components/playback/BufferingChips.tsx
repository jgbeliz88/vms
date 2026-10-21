import type { BufferStats } from "@/components/live/StreamPlayer";
import { cn } from "@/lib/utils/cn";

const chip = "rounded px-1.5 py-0.5 text-[10px] text-slate-400";

export function BufferingChips({ stats }: { stats: BufferStats | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-slate-400">Buffering</span>
      {stats ? (
        <>
          <span className={cn(chip, stats.buffering ? "bg-amber-900" : "bg-slate-800")}>
            Events <b className="text-white">{stats.count}</b>
          </span>
          <span className={cn(chip, "bg-slate-800")}>
            Total <b className="text-white">{stats.totalTime.toFixed(1)}s</b>
          </span>
          <span className={cn(chip, "bg-slate-800")}>
            Last <b className="text-white">{stats.lastDuration.toFixed(1)}s</b>
          </span>
        </>
      ) : (
        <span className="text-[10px] text-slate-500">No buffering detected.</span>
      )}
    </div>
  );
}
