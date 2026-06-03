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

export function TagChip({
  tag,
  active,
  onClick,
}: {
  tag: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = typeof onClick === "function";
  const base =
    "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium transition-colors";
  const tone = active
    ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300"
    : interactive
    ? "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand-500/50"
    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
  const iconColor = active ? "text-brand-500 dark:text-brand-400" : "text-slate-400";

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${tone}`}>
        {TAG_ICONS[tag] && <span className={iconColor}>{TAG_ICONS[tag]}</span>}
        {tag}
      </button>
    );
  }
  return (
    <span className={`${base} ${tone}`}>
      {TAG_ICONS[tag] && <span className={iconColor}>{TAG_ICONS[tag]}</span>}
      {tag}
    </span>
  );
}
