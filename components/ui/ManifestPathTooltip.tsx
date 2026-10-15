"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Copy, Check } from "lucide-react";

type Placement = "above" | "below";

export type ManifestListItem = {
  label: string;
  url: string;
  statusText: string;
  tone: "ok" | "fail" | "blocked";
};

type PopoverState = {
  text: string;
  /**
   * "path" shows the "Manifest path" heading + copy button; "text" is a plain tooltip;
   * "list" shows `text` as a heading over every manifest in `items`, each with its own copy button.
   */
  kind: "path" | "text" | "list";
  items?: (ManifestListItem & { path: string })[];
  emptyText?: string;
  left: number;
  anchorTop: number;
  anchorBottom: number;
  placement: Placement;
};

type Binder = (value: string) => {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
};

type ListBinder = (
  title: string,
  items: ManifestListItem[],
  emptyText?: string
) => ReturnType<Binder>;

type ContextValue = {
  /** Bind a manifest URL — shown as a copyable path. */
  bindPath: Binder;
  /** Bind arbitrary text — shown as a plain tooltip (e.g. a full, truncated name). */
  bindText: Binder;
  /** Bind a group of manifests — each shown with its status and a copyable path. */
  bindManifests: ListBinder;
};

const TONE_TEXT: Record<ManifestListItem["tone"], string> = {
  ok: "text-[#4ADE80]",
  fail: "text-[#F87171]",
  blocked: "text-[#FBBF24]",
};

const ManifestPathTooltipContext = createContext<ContextValue | null>(null);

/** Strip the host from a full URL, keeping only the path (+ query if any). */
function toPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

export function ManifestPathTooltipProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [pop, setPop] = useState<PopoverState | null>(null);
  // Key of the path that was just copied: "path" for the single-path popover, the row index for "list".
  const [copied, setCopied] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => {
      setPop(null);
      setCopied(null);
      hideTimer.current = null;
    }, 130);
  }, [clearHide]);

  const show = useCallback(
    (
      text: string,
      kind: PopoverState["kind"],
      e: React.MouseEvent<HTMLElement>,
      extra?: Pick<PopoverState, "items" | "emptyText">
    ) => {
      if (!text) return;
      const rect = e.currentTarget.getBoundingClientRect();
      clearHide();
      setCopied(null);
      setPop({
        text,
        kind,
        ...extra,
        left: rect.left + rect.width / 2,
        anchorTop: rect.top,
        anchorBottom: rect.bottom,
        placement: rect.top < 170 ? "below" : "above",
      });
    },
    [clearHide]
  );

  const bindPath = useCallback(
    (url: string) => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(toPath(url), "path", e),
      onMouseLeave: scheduleHide,
    }),
    [show, scheduleHide]
  );

  const bindText = useCallback(
    (value: string) => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => show(value.trim(), "text", e),
      onMouseLeave: scheduleHide,
    }),
    [show, scheduleHide]
  );

  const bindManifests = useCallback<ListBinder>(
    (title, items, emptyText) => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) =>
        show(title, "list", e, { items: items.map((m) => ({ ...m, path: toPath(m.url) })), emptyText }),
      onMouseLeave: scheduleHide,
    }),
    [show, scheduleHide]
  );

  const fallbackCopy = useCallback((text: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      /* noop */
    }
  }, []);

  const handleCopy = useCallback((path: string, key: string) => {
    if (!path) return;
    const done = () => {
      setCopied(key);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1500);
    };
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(path)
          .then(done)
          .catch(() => {
            fallbackCopy(path);
            done();
          });
      } else {
        fallbackCopy(path);
        done();
      }
    } catch {
      fallbackCopy(path);
      done();
    }
  }, [fallbackCopy]);

  const value = useMemo(() => ({ bindPath, bindText, bindManifests }), [bindPath, bindText, bindManifests]);

  const copyButton = (path: string, key: string) => (
    <button
      onClick={() => handleCopy(path, key)}
      title="Copy to clipboard"
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#3A4656] bg-[#24303F] px-2 py-1 text-[11px] font-semibold text-[#DEE4EE] transition-colors hover:bg-[#2E3A47]"
    >
      {copied === key ? (
        <>
          <Check size={13} className="text-[#4ADE80]" />
          <span className="text-[#4ADE80]">Copied</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>Copy</span>
        </>
      )}
    </button>
  );

  const isAbove = pop?.placement === "above";

  return (
    <ManifestPathTooltipContext.Provider value={value}>
      {children}
      {mounted &&
        pop &&
        createPortal(
          <div
            onMouseEnter={clearHide}
            onMouseLeave={scheduleHide}
            style={{
              position: "fixed",
              left: pop.left,
              top: isAbove ? pop.anchorTop - 12 : pop.anchorBottom + 12,
              transform: isAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
              zIndex: 200,
            }}
            role="tooltip"
          >
            <div className="relative w-max rounded-lg bg-[#1C2434] px-3 py-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.32)]">
              {pop.kind === "path" ? (
                <>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8899A8]">
                    Manifest path
                  </div>
                  <div className="flex items-start gap-2.5">
                    <code className="max-w-[340px] select-all break-all font-mono text-xs leading-relaxed text-[#E2E8F0]">
                      {pop.text}
                    </code>
                    {copyButton(pop.text, "path")}
                  </div>
                </>
              ) : pop.kind === "list" ? (
                <div className="max-w-[440px]">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8899A8]">
                    {pop.text}
                  </div>
                  {pop.items?.length ? (
                    <div className="flex flex-col gap-2.5">
                      {pop.items.map((m, i) => (
                        <div key={m.url} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-[#E2E8F0]">{m.label}</span>
                            <span className={`font-mono ${TONE_TEXT[m.tone]}`}>{m.statusText}</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <code className="flex-1 select-all break-all font-mono text-xs leading-relaxed text-[#E2E8F0]">
                              {m.path}
                            </code>
                            {copyButton(m.path, String(i))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#E2E8F0]">{pop.emptyText}</div>
                  )}
                </div>
              ) : (
                <div className="max-w-md break-all text-xs leading-relaxed text-[#E2E8F0]">
                  {pop.text}
                </div>
              )}
              <div
                className="absolute left-1/2 h-2.5 w-2.5 rotate-45 bg-[#1C2434]"
                style={isAbove ? { bottom: -5, transform: "translateX(-50%) rotate(45deg)" } : { top: -5, transform: "translateX(-50%) rotate(45deg)" }}
              />
            </div>
          </div>,
          document.body
        )}
    </ManifestPathTooltipContext.Provider>
  );
}

export function useManifestPathTooltip() {
  const ctx = useContext(ManifestPathTooltipContext);
  if (!ctx) throw new Error("useManifestPathTooltip must be used within ManifestPathTooltipProvider");
  return ctx;
}
