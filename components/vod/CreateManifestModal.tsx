"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

export type ManifestTarget = {
  mam: string;
  uuid: string;
  name: string;
  id: string;
};

export type ManifestParams = {
  trackLanguage: string;
  isKms: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  targets: ManifestTarget[];
  onConfirm: (params: ManifestParams) => void;
  isSubmitting?: boolean;
};

const LANG_OPTIONS = [
  { code: "spa", label: "Spanish" },
  { code: "eng", label: "English" },
  { code: "por", label: "Portuguese" },
  { code: "fre", label: "French" },
  { code: "ger", label: "German" },
];

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
          checked ? "bg-brand-500" : "bg-slate-200 dark:bg-slate-700"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : ""
          )}
        />
      </button>
    </div>
  );
}

export function CreateManifestModal({ open, onClose, targets, onConfirm, isSubmitting }: Props) {
  const isBulk = targets.length > 1;
  const [trackLanguage, setTrackLanguage] = useState("spa");
  const [useCustom, setUseCustom] = useState(false);
  const [customLang, setCustomLang] = useState("");
  const [isKms, setIsKms] = useState(true);

  useEffect(() => {
    if (open) {
      setTrackLanguage("spa");
      setUseCustom(false);
      setCustomLang("");
      setIsKms(true);
    }
  }, [open]);

  const effectiveLang = useCustom ? customLang.trim().toLowerCase() : trackLanguage;
  const customValid = !useCustom || /^[a-z]{2,3}$/.test(customLang.trim().toLowerCase());
  const canSubmit = !isSubmitting && customValid && !(useCustom && !customLang.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({ trackLanguage: effectiveLang, isKms });
  };

  const title = isBulk ? `Create Server Manifest · ${targets.length} VODs` : "Create Server Manifest";

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-5">
        {/* Target info */}
        {isBulk ? (
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
            {targets.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 last:border-0 dark:border-slate-800"
              >
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{t.id}</span>
                <Badge label={t.mam} tone={t.mam === "bitmovin" ? "purple" : "warning"} />
              </div>
            ))}
          </div>
        ) : targets[0] ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Target</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{targets[0].id}</span>
              <Badge label={targets[0].mam} tone={targets[0].mam === "bitmovin" ? "purple" : "warning"} />
            </div>
          </div>
        ) : null}

        {/* Track language */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Track language</div>
          <div className="grid grid-cols-3 gap-2">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => { setUseCustom(false); setTrackLanguage(opt.code); }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition",
                  !useCustom && trackLanguage === opt.code
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <div className="font-mono text-xs font-medium">{opt.code}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{opt.label}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseCustom(true)}
              className={cn(
                "rounded-xl border border-dashed px-3 py-2 text-left transition",
                useCustom
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                  : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <div className="font-mono text-xs font-medium">custom</div>
              <div className="text-xs">Other code…</div>
            </button>
          </div>
          {useCustom && (
            <div className="pt-1">
              <input
                autoFocus
                value={customLang}
                onChange={(e) => setCustomLang(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 3))}
                placeholder="e.g. cat, gle, baq"
                maxLength={3}
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2 font-mono text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100",
                  customValid
                    ? "border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-700"
                    : "border-rose-400 focus:border-rose-400 focus:ring-rose-400/20"
                )}
              />
              <p className={cn("mt-1 text-xs", customValid ? "text-slate-400" : "text-rose-500")}>
                {customValid
                  ? "Enter an ISO 639-2 code (2–3 lowercase letters)."
                  : "Must be 2–3 lowercase letters (ISO 639-2)."}
              </p>
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="space-y-3 rounded-xl border border-slate-200 px-4 py-4 dark:border-slate-700">
          <Toggle
            checked={isKms}
            onChange={setIsKms}
            label="isKms"
            description="Use the Key Management Service for content key delivery."
          />
        </div>

        {/* Payload preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Request payload</div>
          <pre className="font-mono text-xs text-slate-700 dark:text-slate-300">{`{
  "trackLanguage": "${effectiveLang}",
  "isKms": ${isKms}
}`}</pre>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? "Creating…" : "Create Manifest"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
