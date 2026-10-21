"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const VOD2LIVE_RE = /(name="vod2live_start_time"\s+content=")[^"]*(")/;

export type TransitionPayload =
  | { mode: "json"; payload: object }
  | { mode: "xml"; transitionName: string; xml: string };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.05em] text-text-muted">
      {children}
    </span>
  );
}

function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: "json" | "xml";
  onChange: (m: "json" | "xml") => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-base bg-slate-50 p-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800">
      {(
        [
          ["json", "JSON"],
          ["xml", "SMIL / XML"],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 transition disabled:cursor-not-allowed",
            mode === k
              ? "bg-white text-text-primary shadow-soft dark:bg-slate-700 dark:text-slate-100"
              : "text-text-secondary hover:text-text-primary dark:text-slate-400"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function CreateTransitionForm({
  channelName,
  onSubmit,
  isSubmitting,
  initialMode = "json",
  onModeChange,
}: {
  channelName: string;
  onSubmit: (values: TransitionPayload) => void;
  isSubmitting?: boolean;
  initialMode?: "json" | "xml";
  onModeChange?: (mode: "json" | "xml") => void;
}) {
  const [mode, setMode] = useState<"json" | "xml">(initialMode);

  const handleModeChange = (next: "json" | "xml") => {
    setMode(next);
    onModeChange?.(next);
  };
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [transitionName, setTransitionName] = useState("");
  const [xml, setXml] = useState("");
  const [xmlErrors, setXmlErrors] = useState<{ transitionName?: string; xml?: string }>({});

  const syncingFromXml = useRef(false);

  const handleTransitionNameChange = (value: string) => {
    setTransitionName(value);
    if (xml && !syncingFromXml.current) {
      setXml((prev) => prev.replace(VOD2LIVE_RE, `$1${value}$2`));
    }
  };

  const handleXmlChange = (value: string) => {
    setXml(value);
    const match = value.match(VOD2LIVE_RE);
    if (match) {
      const extracted = match[0].match(/content="([^"]*)"/)?.[1] ?? "";
      syncingFromXml.current = true;
      setTransitionName(extracted);
      setTimeout(() => {
        syncingFromXml.current = false;
      }, 0);
    }
  };

  const handleSubmit = () => {
    if (mode === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        setJsonError("Invalid JSON");
        return;
      }
      const body = parsed as Record<string, unknown>;
      const epg = body?.epg as Record<string, unknown> | undefined;
      const channels = epg?.channel as Array<Record<string, unknown>> | undefined;
      const found = channels?.[0]?.channel as string | undefined;
      if (found !== channelName) {
        setJsonError(
          `Channel name mismatch: expected '${channelName}', got '${found ?? "(missing)"}'`
        );
        return;
      }
      setJsonError("");
      onSubmit({ mode: "json", payload: body });
    } else {
      const errors: { transitionName?: string; xml?: string } = {};
      if (!transitionName.trim()) errors.transitionName = "Transition name is required";
      if (!xml.trim()) errors.xml = "SMIL / XML is required";
      if (Object.keys(errors).length > 0) {
        setXmlErrors(errors);
        return;
      }
      setXmlErrors({});
      onSubmit({ mode: "xml", transitionName: transitionName.trim(), xml: xml.trim() });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header — the panel title lives in the Actions breadcrumb */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-text-secondary">
          Schedule the next program swap on{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-text-primary dark:bg-slate-800 dark:text-slate-100">
            {channelName}
          </code>
          .
        </p>
        <ModeToggle mode={mode} onChange={handleModeChange} disabled={isSubmitting} />
      </div>

      {/* Body */}
      <div className="space-y-4">
        {mode === "json" ? (
          <div className="flex flex-col gap-2">
            <FieldLabel>EPG JSON</FieldLabel>
            <div
              className={cn(
                "overflow-hidden rounded-xl border bg-white shadow-soft transition dark:bg-slate-900",
                jsonError
                  ? "border-danger focus-within:ring-2 focus-within:ring-danger/20"
                  : "border-border-base focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700"
              )}
            >
              <div className="flex items-center border-b border-border-base bg-slate-50/60 px-3 py-1.5 text-[11px] text-text-muted dark:border-slate-700 dark:bg-slate-800/60">
                <span className="font-mono">
                  epg.channel[].channel must equal{" "}
                  <span className="text-text-primary dark:text-slate-200">{channelName}</span>
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setJsonError("");
                }}
                placeholder='{ "epg": { "channel": [{ "channel": "..." }], ... } }'
                spellCheck={false}
                disabled={isSubmitting}
                className="block w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 min-h-[240px]"
              />
            </div>
            {jsonError && <span className="text-xs text-danger">{jsonError}</span>}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>Transition Name (UTC)</FieldLabel>
              <input
                value={transitionName}
                onChange={(e) => handleTransitionNameChange(e.target.value)}
                placeholder="2022-04-14T06:00:00Z"
                disabled={isSubmitting}
                className={cn(
                  "w-full rounded-md border bg-white px-3.5 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-muted shadow-soft transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100",
                  xmlErrors.transitionName
                    ? "border-danger focus:border-danger focus:ring-danger/20"
                    : "border-border-base focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-700"
                )}
              />
              {xmlErrors.transitionName && (
                <span className="text-xs text-danger">{xmlErrors.transitionName}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>SMIL / XML</FieldLabel>
              <div
                className={cn(
                  "overflow-hidden rounded-xl border bg-white shadow-soft transition dark:bg-slate-900",
                  xmlErrors.xml
                    ? "border-danger focus-within:ring-2 focus-within:ring-danger/20"
                    : "border-border-base focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700"
                )}
              >
                <div className="flex items-center border-b border-border-base bg-slate-50/60 px-3 py-1.5 text-[11px] text-text-muted dark:border-slate-700 dark:bg-slate-800/60">
                  <span className="font-mono">application/smil+xml</span>
                </div>
                <textarea
                  value={xml}
                  onChange={(e) => handleXmlChange(e.target.value)}
                  placeholder={`<?xml version='1.0' encoding='UTF-8'?>...`}
                  spellCheck={false}
                  disabled={isSubmitting}
                  className="block w-full resize-y bg-transparent px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 min-h-[240px]"
                />
              </div>
              {xmlErrors.xml && <span className="text-xs text-danger">{xmlErrors.xml}</span>}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base pt-4 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0 text-text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          Submitting will append a new transition under{" "}
          <span className="font-mono text-text-primary dark:text-slate-200">{channelName}</span>.
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Creating…
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Transition
            </>
          )}
        </button>
      </div>
    </div>
  );
}
