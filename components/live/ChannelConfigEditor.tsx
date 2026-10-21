"use client";

import { useState, useEffect, useRef } from "react";
import { CHANNEL_CONFIG_COLUMNS, ResolvedChannel, ChannelConfigRow } from "@/features/live/types";
import type { ConfigLayout } from "@/features/live/hooks";
import { Button } from "@/components/ui/Button";

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey = keyof Omit<ChannelConfigRow, "platform" | "device">;

type EditorSpec = {
  editable: boolean;
  getOptions?: (layout: ConfigLayout, channel: ResolvedChannel, row: ChannelConfigRow) => string[] | undefined;
  customizable?: (layout: ConfigLayout) => boolean;
};

/**
 * Editor-specific metadata for columns that need dropdowns or custom behaviour.
 * Columns absent from this map default to { editable: false }.
 * "platform" and "device" are intentionally omitted — they are fixed read-only
 * columns rendered before COLUMNS in the table header.
 */
const EDITOR_SPECS: Partial<Record<ColKey, EditorSpec>> = {
  source:     { editable: true,  getOptions: (l) => l.configLayout.Source?.options,    customizable: (l) => Boolean(l.configLayout.Source?.customizable) },
  cvpId:      { editable: true },
  format:     { editable: true,  getOptions: (l) => l.configLayout.Format?.options,    customizable: (l) => Boolean(l.configLayout.Format?.customizable) },
  midroll:    { editable: true,  getOptions: (l) => l.configLayout.Midroll?.options,   customizable: (l) => Boolean(l.configLayout.Midroll?.customizable) },
  drm:        { editable: true,  getOptions: (l) => l.configLayout.DRM?.options,       customizable: (l) => Boolean(l.configLayout.DRM?.customizable) },
  encoder:    { editable: true,  getOptions: (_l, ch) => [...new Set(ch.pods.map((p) => p.encoderName))] },
  linear:     { editable: false },
  token:      { editable: true,  getOptions: (l) => l.configLayout.Token?.options,     customizable: (l) => Boolean(l.configLayout.Token?.customizable) },
  scteId3:    { editable: true,  getOptions: (l) => l.configLayout["Scte/ID3"]?.options as string[] | undefined, customizable: (l) => Boolean((l.configLayout["Scte/ID3"] as Record<string, unknown>)?.customizable) },
  subtitle:   { editable: true,  getOptions: (l) => l.configLayout.Subtitle?.options,  customizable: (l) => Boolean(l.configLayout.Subtitle?.customizable) },
  multiaudio: { editable: true,  getOptions: (l) => l.configLayout.Multiaudio?.options, customizable: (l) => Boolean(l.configLayout.Multiaudio?.customizable) },
  drLecter:   { editable: true,  getOptions: (l) => l.configLayout.DrLecter?.options,  customizable: (l) => Boolean(l.configLayout.DrLecter?.customizable) },
};

type ColSpec = EditorSpec & { key: ColKey; label: string };

/** Derived from the shared column list — platform and device are fixed columns rendered separately. */
const COLUMNS: ColSpec[] = CHANNEL_CONFIG_COLUMNS
  .filter((c): c is { key: ColKey; label: string } => c.key !== "platform" && c.key !== "device")
  .map(({ key, label }) => ({ key, label, ...(EDITOR_SPECS[key] ?? { editable: false }) }));

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildInitialRows(layout: ConfigLayout, channel: ResolvedChannel): ChannelConfigRow[] {
  const rows: ChannelConfigRow[] = [];
  const platforms = layout.configLayout.Platform;
  for (const [platform, { Devices }] of Object.entries(platforms)) {
    for (const device of Devices) {
      const existing = channel.config?.find(
        (r) => r.platform === platform && r.device === device
      );
      rows.push(existing ?? { platform, device, cvpId: channel.name });
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

export function ChannelConfigEditor({
  channel,
  layout,
  onSave,
  saving,
}: {
  channel: ResolvedChannel;
  layout: ConfigLayout;
  onSave: (rows: ChannelConfigRow[]) => Promise<void>;
  saving: boolean;
}) {
  const [rows, setRows] = useState<ChannelConfigRow[]>(() =>
    buildInitialRows(layout, channel)
  );
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; col: ColKey } | null>(null);
  const [dirty, setDirty] = useState(false);

  // Rebuild rows when channel.config changes externally (e.g. after save)
  useEffect(() => {
    setRows(buildInitialRows(layout, channel));
    setDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  const updateCell = (rowIdx: number, col: ColKey, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [col]: value };
      // If encoder changed, autofill linear from the assigned pod
      if (col === "encoder") {
        const pod = channel.pods.find((p) => p.encoderName === value);
        next[rowIdx] = { ...next[rowIdx], linear: pod?.linear?.linearName ?? "" };
      }
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
    const rowsWithLinear = rows.map((row) => ({
      ...row,
      linear: channel.pods.find((p) => p.encoderName === row.encoder)?.linear?.linearName ?? row.linear ?? "",
    }));
    await onSave(rowsWithLinear);
    setDirty(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Configuration — {rows.length} rows
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save Config"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-100 text-[11px] uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="whitespace-nowrap px-3 py-2">Station</th>
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
                {/* Station — read-only */}
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-500 dark:text-slate-400">
                  {channel.name}
                </td>
                {/* Platform — read-only */}
                <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">
                  {row.platform}
                </td>
                {/* Device — read-only */}
                <td className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-200">
                  {row.device}
                </td>
                {COLUMNS.map((col) => {
                  const isActive =
                    activeCell?.rowIdx === rowIdx && activeCell?.col === col.key;
                  const rawValue = col.key === "linear"
                    ? (channel.pods.find((p) => p.encoderName === row.encoder)?.linear?.linearName ?? (row.linear ?? ""))
                    : (row[col.key] as string | undefined) ?? "";
                  const displayValue = rawValue || (
                    <span className="italic text-slate-400">N/A</span>
                  );
                  const options = col.getOptions?.(layout, channel, row);
                  const isCustomizable = col.customizable?.(layout) ?? false;

                  return (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-3 py-1.5 text-slate-700 dark:text-slate-300"
                      onClick={() => {
                        if (col.editable) {
                          setActiveCell({ rowIdx, col: col.key });
                        }
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
