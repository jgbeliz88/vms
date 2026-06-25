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

type PopoverState = {
  path: string;
  left: number;
  anchorTop: number;
  anchorBottom: number;
  placement: Placement;
};

type ContextValue = {
  bindPath: (url: string) => {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  };
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
  const [copied, setCopied] = useState(false);
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
      setCopied(false);
      hideTimer.current = null;
    }, 130);
  }, [clearHide]);

  const bindPath = useCallback(
    (url: string) => ({
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        const path = toPath(url);
        if (!path) return;
        const rect = e.currentTarget.getBoundingClientRect();
        clearHide();
        setCopied(false);
        setPop({
          path,
          left: rect.left + rect.width / 2,
          anchorTop: rect.top,
          anchorBottom: rect.bottom,
          placement: rect.top < 170 ? "below" : "above",
        });
      },
      onMouseLeave: scheduleHide,
    }),
    [clearHide, scheduleHide]
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

  const handleCopy = useCallback(() => {
    const path = pop?.path;
    if (!path) return;
    const done = () => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
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
  }, [pop, fallbackCopy]);

  const value = useMemo(() => ({ bindPath }), [bindPath]);

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
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#8899A8]">
                Manifest path
              </div>
              <div className="flex items-start gap-2.5">
                <code className="max-w-[340px] select-all break-all font-mono text-xs leading-relaxed text-[#E2E8F0]">
                  {pop.path}
                </code>
                <button
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#3A4656] bg-[#24303F] px-2 py-1 text-[11px] font-semibold text-[#DEE4EE] transition-colors hover:bg-[#2E3A47]"
                >
                  {copied ? (
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
              </div>
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
