export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatBitrate(bps: string | number): string {
  const n = typeof bps === "string" ? parseInt(bps) : bps;
  return `${Math.round(n / 1000)} kbps`;
}
