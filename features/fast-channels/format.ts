/** Renders an ISO timestamp as `YYYY-MM-DD HH:MM:SS UTC`, or returns it untouched if unparseable. */
export function formatUtc(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())} UTC`
  );
}

/** How far `iso` is in the future, e.g. `in 3h` / `in 12m` / `due now`. */
export function relativeTo(iso: string, from: Date = new Date()): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - from.getTime();
  if (diffMs <= 0) return "due now";

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 48) return `in ${hours}h`;
  return `in ${Math.round(diffMs / 86_400_000)}d`;
}
