import type { EnigmaLinear, MediaexcelChannel } from "@/features/live/types";
import { AVAILABLE_TAGS } from "@/components/ui/TagChip";
import { cn } from "@/lib/utils/cn";

// Icons and helpers shared by the Channel Commands panel and its modals.

export function IconLinear({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5 5 0 0 0 0 8M16 8a5 5 0 0 1 0 8" />
      <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </svg>
  );
}

export function IconPod({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function IconEncoder({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <circle cx="7" cy="7.5" r=".9" fill="currentColor" stroke="none" />
      <circle cx="7" cy="16.5" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function linearEncoderNames(linear: EnigmaLinear): string[] {
  const seen: string[] = [];
  for (const pod of linear.pods)
    for (const e of pod.encoders)
      if (!seen.includes(e.name)) seen.push(e.name);
  return seen;
}

export function countLinearPods(linears: EnigmaLinear[]): number {
  return linears.reduce((n, l) => n + l.pods.length, 0);
}

export function countLinearEncoders(linears: EnigmaLinear[]): number {
  const set = new Set<number>();
  for (const l of linears)
    for (const p of l.pods)
      for (const e of p.encoders) set.add(e.id);
  return set.size;
}

export function IconArrowsSwap() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function IconArrowRight({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function IconWarning({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M8 2L14 13H2L8 2Z" />
      <line x1="8" y1="7" x2="8" y2="10" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

function IconSync() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

// ── Action metadata ───────────────────────────────────────────────────────────

export const ACTION_META = {
  sync:     { iconBg: "bg-blue-100 dark:bg-blue-900/30",   iconColor: "text-blue-600 dark:text-blue-400",   icon: <IconSync /> },
  clean:    { iconBg: "bg-orange-100 dark:bg-orange-900/30",iconColor: "text-orange-600 dark:text-orange-400",icon: <IconTrash /> },
  move:     { iconBg: "bg-teal-100 dark:bg-teal-900/30",     iconColor: "text-teal-600 dark:text-teal-400",     icon: <IconArrowsSwap /> },
} as const;

export function CheckBox({ state }: { state: "checked" | "indeterminate" | "off" }) {
  return (
    <span className={cn(
      "grid h-3.5 w-3.5 shrink-0 place-items-center rounded border",
      state === "checked"
        ? "border-brand-500 bg-brand-500 dark:border-brand-400 dark:bg-brand-400"
        : state === "indeterminate"
        ? "border-brand-500 bg-white dark:border-brand-400 dark:bg-slate-800"
        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
    )}>
      {state === "checked" && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1.5 4.5l2 2 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {state === "indeterminate" && (
        <span className="block h-1.5 w-1.5 rounded-[1px] bg-brand-500 dark:bg-brand-400" />
      )}
    </span>
  );
}

export function byEncoder(channels: MediaexcelChannel[]) {
  const order: string[] = [];
  const map = new Map<string, MediaexcelChannel[]>();
  for (const c of channels) {
    if (!map.has(c.encoderName)) { map.set(c.encoderName, []); order.push(c.encoderName); }
    map.get(c.encoderName)!.push(c);
  }
  return order.map((enc) => ({ encoderName: enc, channels: map.get(enc)! }));
}

export function channelForPod(podName: string, channels: MediaexcelChannel[]) {
  return channels.find((c) => c.pods.includes(podName)) ?? null;
}

// Pod entry for add-linear / update-linear payloads. The encoder is the MediaExcel channel the pod
// belongs to; pods no longer in MediaExcel fall back to the given encoder IDs.
export function podPayload(podName: string, channels: MediaexcelChannel[], fallbackEncoders: number[] = []) {
  const ch = channelForPod(podName, channels);
  return { name: podName, encoders: ch ? [ch.id] : fallbackEncoders };
}

// Only AVAILABLE_TAGS are shown/editable; anything else Enigma returns is ignored.
export function knownTags(linear: EnigmaLinear): string[] {
  return AVAILABLE_TAGS.filter((t) => (linear.tags ?? []).includes(t));
}
