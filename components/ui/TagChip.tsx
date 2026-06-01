export const TAG_ICONS: Record<string, React.ReactNode> = {
  Web: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-2.5 w-2.5 shrink-0">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c1.8 1.6 1.8 10.4 0 12M8 2c-1.8 1.6-1.8 10.4 0 12" />
    </svg>
  ),
  Apps: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="h-2.5 w-2.5 shrink-0">
      <rect x="5" y="1.5" width="6" height="13" rx="1.5" />
      <line x1="7" y1="12.5" x2="9" y2="12.5" />
    </svg>
  ),
  SmartTV: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="h-2.5 w-2.5 shrink-0">
      <rect x="1.5" y="3" width="13" height="8" rx="1.5" />
      <line x1="5" y1="14" x2="11" y2="14" />
    </svg>
  ),
};

export function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {TAG_ICONS[tag] && <span className="text-slate-400">{TAG_ICONS[tag]}</span>}
      {tag}
    </span>
  );
}
