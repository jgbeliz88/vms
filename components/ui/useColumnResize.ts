"use client";

import { useCallback, useRef, useState } from "react";

export type ResizeColumn = { key: string; defaultWidth: number };

/**
 * Column-width management with a "fit-by-default, pixels-after-resize" behavior.
 *
 * Before the user drags any column the table renders at `width: 100%` with
 * proportional (percentage) column widths, so it always fits the container with
 * no horizontal scroll — long cells ellipsize. The first time a column is
 * dragged, every column is frozen to its current rendered pixel width and the
 * table is given an explicit pixel width, so widening a column past the
 * container produces a horizontal scrollbar (same as the Live table).
 *
 * The table must keep a *definite* width at all times: with `table-layout: fixed`
 * but an `auto` width (e.g. `min-w-full`), browsers fall back to automatic table
 * layout and no-wrap cells expand their column to fit the content. Hence the
 * explicit `width` returned by `getTableStyle` once resized.
 */
export function useColumnResize(columns: ResizeColumn[]) {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [resized, setResized] = useState(false);
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth]))
  );
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const totalDefault = columns.reduce((sum, c) => sum + c.defaultWidth, 0);

  /** Style for a `<col>` / `<th>`: percentage until resized, pixels after. */
  const getColStyle = useCallback(
    (key: string): React.CSSProperties => {
      if (resized) return { width: widths[key] };
      const col = columns.find((c) => c.key === key);
      return { width: `${((col?.defaultWidth ?? 0) / totalDefault) * 100}%` };
    },
    [resized, widths, columns, totalDefault]
  );

  /** Style for the `<table>`: keeps a definite width so fixed layout always applies. */
  const getTableStyle = useCallback((): React.CSSProperties => {
    const total = columns.reduce((sum, c) => sum + (widths[c.key] ?? 0), 0);
    return { tableLayout: "fixed", width: resized ? total : "100%", minWidth: "100%" };
  }, [resized, widths, columns]);

  const startResize = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();

      // On the first drag, freeze every column to its actual rendered pixel
      // width so subsequent dragging works in absolute pixels.
      let base = widths;
      if (!resized) {
        const ths = tableRef.current?.querySelectorAll<HTMLElement>(":scope > thead > tr > th");
        base = Object.fromEntries(
          columns.map((c, i) => {
            const w = ths?.[i]?.getBoundingClientRect().width;
            return [c.key, w && w > 0 ? w : c.defaultWidth];
          })
        );
        setWidths(base);
        setResized(true);
      }

      resizeRef.current = { key, startX: e.clientX, startWidth: base[key] };

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const { key, startX, startWidth } = resizeRef.current;
        const newWidth = Math.max(60, startWidth + ev.clientX - startX);
        setWidths((prev) => ({ ...prev, [key]: newWidth }));
      };

      const onMouseUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [widths, resized, columns]
  );

  return { tableRef, getColStyle, getTableStyle, startResize };
}
