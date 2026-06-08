export const AVAILABLE_TAGS = ["Web", "Apps", "SmartTV", "LSG"] as const;
export type AvailableTag = (typeof AVAILABLE_TAGS)[number];

export const TAG_ICONS: Record<string, React.ReactNode> = {
  Web: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 shrink-0">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.8 1.6 1.8 10.4 0 12M8 2c-1.8 1.6-1.8 10.4 0 12" />
    </svg>
  ),
  Apps: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
      <rect x="5" y="1.5" width="6" height="13" rx="1.5" />
      <line x1="7" y1="12.5" x2="9" y2="12.5" />
    </svg>
  ),
  SmartTV: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
      <rect x="1.5" y="3" width="13" height="8" rx="1.5" />
      <line x1="5" y1="14" x2="11" y2="14" />
    </svg>
  ),
  LSG: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
      {/* fingers */}
      <path d="M5.5 8V4.5a1 1 0 0 1 2 0V8" />
      <path d="M7.5 8V3.5a1 1 0 0 1 2 0V8" />
      <path d="M9.5 8V4.5a1 1 0 0 1 2 0V8" />
      {/* thumb */}
      <path d="M5.5 7C5 6 3.5 6.5 3.5 8V9" />
      {/* palm */}
      <path d="M3.5 9v1a3.5 3.5 0 0 0 3.5 3.5h1.5a3.5 3.5 0 0 0 3.5-3.5V8" />
    </svg>
  ),
};

export function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {TAG_ICONS[tag] && <span className="text-slate-400">{TAG_ICONS[tag]}</span>}
      {tag}
    </span>
  );
}
