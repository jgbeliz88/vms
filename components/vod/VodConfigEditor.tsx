"use client";

import { useState, useEffect, useRef } from "react";
import { VOD_CONFIG_COLUMNS, type VodConfigRow } from "@/features/vod/vod-types";
import type { ConfigLayout } from "@/features/live/hooks";
import { Button } from "@/components/ui/Button";

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey = keyof Omit<VodConfigRow, "platform" | "device">;

type EditorSpec = {
  editable: boolean;
  getOptions?: (layout: ConfigLayout) => string[] | undefined;
  customizable?: (layout: ConfigLayout) => boolean;
};

/**
 * Editor metadata per column. "platform" and "device" are intentionally omitted —
 * they are fixed read-only columns rendered before COLUMNS. The Yes/No booleans
 * (drm, subt, multiaudio, drLecter) reuse the shared configLayout option lists.
 */
const EDITOR_SPECS: Partial<Record<ColKey, EditorSpec>> = {
  format:     { editable: true, getOptions: (l) => l.configLayout.Format?.options,     customizable: (l) => Boolean(l.configLayout.Format?.customizable) },
  drm:        { editable: true, getOptions: (l) => l.configLayout.DRM?.options,        customizable: (l) => Boolean(l.configLayout.DRM?.customizable) },
  token:      { editable: true, getOptions: (l) => l.configLayout.Token?.options,      customizable: (l) => Boolean(l.configLayout.Token?.customizable) },
  subt:       { editable: true, getOptions: (l) => l.configLayout.Subtitle?.options,   customizable: (l) => Boolean(l.configLayout.Subtitle?.customizable) },
  multiaudio: { editable: true, getOptions: (l) => l.configLayout.Multiaudio?.options, customizable: (l) => Boolean(l.configLayout.Multiaudio?.customizable) },
  drLecter:   { editable: true, getOptions: (l) => l.configLayout.DrLecter?.options,   customizable: (l) => Boolean(l.configLayout.DrLecter?.customizable) },
};

type ColSpec = EditorSpec & { key: ColKey; label: string };

const COLUMNS: ColSpec[] = VOD_CONFIG_COLUMNS
  .filter((c): c is { key: ColKey; label: string } => c.key !== "platform" && c.key !== "device")
  .map(({ key, label }) => ({ key, label, ...(EDITOR_SPECS[key] ?? { editable: false }) }));

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build one row per platform/device combo from the shared layout, filling in the
 * existing global config when present (matched by platform+device), else N/A.
 */
export function buildInitialRows(layout: ConfigLayout, config: VodConfigRow[]): VodConfigRow[] {
  const rows: VodConfigRow[] = [];
  const platforms = layout.configLayout.Platform;
  for (const [platform, { Devices }] of Object.entries(platforms)) {
    for (const device of Devices) {
      const existing = config.find((r) => r.platform === platform && r.device === device);
      rows.push(existing ?? { platform, device });
    }
  }
  return rows;
}

// ── Cell editor ───────────────────────────────────────────────────────────────

function CellEditor({
  value,
  options,
  customizable,
  onCommit,
  onClear,
}: {
  value: string;
  options?: string[];
  customizable?: boolean;
  onCommit: (v: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [custom, setCustom] = useState(!options || (!!customizable && !!value && !options.includes(value)));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = (v: string) => onCommit(v);

  if (options && !custom) {
    return (
      <div className="flex items-center gap-1">
        <select
          autoFocus
          value={draft}
          className="rounded border border-brand-400 bg-white px-1 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => commit(draft)}
        >
          <option value="">— N/A —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {customizable && (
          <button
            className="text-[10px] text-brand-500 underline"
            onMouseDown={(e) => { e.preventDefault(); setCustom(true); }}
          >
            custom
          </button>
        )}
        <button
          className="text-[10px] text-slate-400 hover:text-red-500"
          onMouseDown={(e) => { e.preventDefault(); onClear(); }}
          title="Clear value"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        className="w-24 rounded border border-brand-400 bg-white px-1 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") commit(value);
        }}
      />
      {options && customizable && (
        <button
          className="text-[10px] text-brand-500 underline"
          onMouseDown={(e) => { e.preventDefault(); setCustom(false); }}
        >
          pick
        </button>
      )}
      <button
        className="text-[10px] text-slate-400 hover:text-red-500"
        onMouseDown={(e) => { e.preventDefault(); onClear(); }}
        title="Clear value"
      >
        ✕
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function VodConfigEditor({
  layout,
  config,
  onSave,
  saving,
}: {
  layout: ConfigLayout;
  config: VodConfigRow[];
  onSave: (rows: VodConfigRow[]) => Promise<void>;
  saving: boolean;
}) {
  const [rows, setRows] = useState<VodConfigRow[]>(() => buildInitialRows(layout, config));
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; col: ColKey } | null>(null);
  const [dirty, setDirty] = useState(false);

  // Rebuild rows when the shared config changes externally (e.g. after a save elsewhere).
  useEffect(() => {
    setRows(buildInitialRows(layout, config));
    setDirty(false);
  }, [layout, config]);

  const updateCell = (rowIdx: number, col: ColKey, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: value };
      return next;
    });
    setDirty(true);
    setActiveCell(null);
  };

  const clearCell = (rowIdx: number, col: ColKey) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: "" };
      return next;
    });
    setDirty(true);
    setActiveCell(null);
  };

  const handleSave = async () => {
    await onSave(rows);
    setDirty(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Configuration — {rows.length} rows
        </div>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save Config"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Platform</th>
              <th className="whitespace-nowrap px-3 py-2">Device</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-2">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, rowIdx) => (
              <tr key={`${row.platform}-${row.device}`} className="hover:bg-white dark:hover:bg-slate-800/40">
                {/* Platform — read-only */}
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                  {row.platform}
                </td>
                {/* Device — read-only */}
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-200">
                  {row.device}
                </td>
                {COLUMNS.map((col) => {
                  const isActive = activeCell?.rowIdx === rowIdx && activeCell?.col === col.key;
                  const rawValue = (row[col.key] as string | undefined) ?? "";
                  const displayValue = rawValue || (
                    <span className="italic text-slate-400">N/A</span>
                  );
                  const options = col.getOptions?.(layout);
                  const isCustomizable = col.customizable?.(layout) ?? false;

                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300"
                      onClick={() => {
                        if (col.editable) setActiveCell({ rowIdx, col: col.key });
                      }}
                    >
                      {isActive ? (
                        <CellEditor
                          value={rawValue}
                          options={options}
                          customizable={isCustomizable}
                          onCommit={(v) => updateCell(rowIdx, col.key, v)}
                          onClear={() => clearCell(rowIdx, col.key)}
                        />
                      ) : (
                        <span className={col.editable ? "cursor-pointer hover:text-brand-600 dark:hover:text-brand-400" : ""}>
                          {displayValue}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
