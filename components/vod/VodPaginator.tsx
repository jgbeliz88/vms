"use client";

type Props = {
  currentPage: number;
  knownMaxPage: number;
  hasNextPage: boolean;
  onChange: (page: number) => void;
};

const btnBase =
  "flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors";
const btnActive =
  "border-brand-500 bg-brand-500 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-slate-900";
const btnDefault =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";
const btnDisabled =
  "border-slate-200 bg-white text-slate-300 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600";

const WINDOW_SIZE = 5;

export function VodPaginator({ currentPage, knownMaxPage, hasNextPage, onChange }: Props) {
  let windowStart = Math.max(1, currentPage - 2);
  const windowEnd = Math.min(knownMaxPage, windowStart + WINDOW_SIZE - 1);
  windowStart = Math.max(1, windowEnd - WINDOW_SIZE + 1);

  const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);
  const showFirstShortcut = windowStart > 1;

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        disabled={currentPage === 1}
        onClick={() => onChange(currentPage - 1)}
        className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnDefault}`}
        aria-label="Previous page"
      >
        ‹
      </button>

      {showFirstShortcut && (
        <>
          <button
            onClick={() => onChange(1)}
            className={`${btnBase} ${btnDefault}`}
            aria-label="Page 1"
          >
            1
          </button>
          <span className={`${btnBase} ${btnDisabled}`} aria-hidden="true">
            …
          </span>
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onChange(page)}
          className={`${btnBase} ${page === currentPage ? btnActive : btnDefault}`}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </button>
      ))}

      <button
        disabled={!hasNextPage}
        onClick={() => onChange(currentPage + 1)}
        className={`${btnBase} ${!hasNextPage ? btnDisabled : btnDefault}`}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
