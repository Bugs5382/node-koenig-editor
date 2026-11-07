/*
MIT License

Copyright (c) 2026 Shane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableNode,
  $isTableSelection,
  type TableCellNode,
  TableNode,
  type TableRowNode,
} from "@lexical/table";
import { $findMatchingParent } from "@lexical/utils";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import {
  $setColumnWidths,
  $setRowHeight,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  resizedWidths,
} from "./tableResize";

// Resizing a table with the pointer and the keyboard. Drag a cell's right border to set its column's
// width, or its bottom border to set its row's height, with a tip that shows the size; double-click a
// column border to fit the column to its text. With a column or row selected, Alt with the arrow
// keys changes its size by 10 pixels (40 with Shift), and a live region says the new size. Alt+Arrow
// is left alone when the cursor is just in a cell, where it moves by word.

const EDGE = 6;
const DEFAULT_COLUMN_WIDTH = 75;
const DEFAULT_ROW_HEIGHT = 32;
const STEP = 10;
const BIG_STEP = 40;

const fill = (template: string, values: Record<string, number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

interface Handle {
  cell: HTMLElement;
  kind: "column" | "row";
}

const handleAt = (event: MouseEvent): Handle | null => {
  const cell = (event.target as Element | null)?.closest?.("td, th") as HTMLElement | null;
  if (!cell) return null;
  const rect = cell.getBoundingClientRect();
  const toRight = rect.right - event.clientX;
  const toBottom = rect.bottom - event.clientY;
  if (toRight >= -2 && toRight <= EDGE) return { cell, kind: "column" };
  if (toBottom >= -2 && toBottom <= EDGE) return { cell, kind: "row" };
  return null;
};

/** The table's column widths as drawn, one per column; the stored width where nothing is laid out. */
const measureWidths = (
  element: HTMLElement | null,
  stored: readonly number[] | undefined,
  count: number,
) => {
  const widths: number[] = [];
  let column = 0;
  const first = element?.querySelector("tr");
  for (const cell of first?.children ?? []) {
    const span = Math.max((cell as HTMLTableCellElement).colSpan || 1, 1);
    const width = (cell as HTMLElement).getBoundingClientRect().width;
    for (let i = 0; i < span; i += 1) widths[column + i] = width / span;
    column += span;
  }
  return Array.from({ length: count }, (_, index) => {
    const measured = widths[index] ?? 0;
    return Math.round(measured > 0 ? measured : (stored?.[index] ?? DEFAULT_COLUMN_WIDTH));
  });
};

const textWidth = (cell: HTMLElement): number => {
  const style = window.getComputedStyle(cell);
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font};letter-spacing:${style.letterSpacing}`;
  probe.textContent = cell.textContent ?? "";
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return (
    width +
    Number.parseFloat(style.paddingLeft || "0") +
    Number.parseFloat(style.paddingRight || "0") +
    2
  );
};

interface Target {
  column: number;
  count: number;
  row: number;
  rowNode: TableRowNode;
  table: TableNode;
}

const $targetOfCell = (cell: HTMLElement, kind: "column" | "row"): Target | null => {
  const node = $getNearestNodeFromDOMNode(cell);
  const cellNode = node
    ? ($findMatchingParent(node, $isTableCellNode) as TableCellNode | null)
    : null;
  const table = cellNode ? $findMatchingParent(cellNode, $isTableNode) : null;
  if (!cellNode || !table) return null;
  const column = $getTableColumnIndexFromTableCellNode(cellNode) + cellNode.getColSpan() - 1;
  const row =
    $getTableRowIndexFromTableCellNode(cellNode) + (kind === "row" ? cellNode.getRowSpan() - 1 : 0);
  const rowNode = table.getChildAtIndex(row) as TableRowNode | null;
  if (!rowNode) return null;
  const columns = table.getColWidths()?.length ?? rowNode.getChildrenSize();
  return { column, count: Math.max(columns, column + 1), row, rowNode, table };
};

export const TableResizePlugin = () => {
  const [editor] = useLexicalComposerContext();
  const t = useKoenigStrings().table;
  const [tip, setTip] = useState<{ left: number; text: string; top: number } | null>(null);
  const [status, setStatus] = useState("");
  const hovering = useRef<Handle | null>(null);
  const strings = useRef(t);
  strings.current = t;

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root || !editor.hasNodes([TableNode])) return undefined;

    const setCursor = (value: string) => {
      root.style.cursor = value;
    };

    const onMove = (event: MouseEvent) => {
      if (!editor.isEditable()) {
        hovering.current = null;
        return;
      }
      const handle = handleAt(event);
      hovering.current = handle;
      setCursor(handle ? (handle.kind === "column" ? "col-resize" : "row-resize") : "");
    };

    const onDown = (event: MouseEvent) => {
      const handle = hovering.current;
      if (!handle || event.button !== 0 || !editor.isEditable()) return;
      let target: Target | null = null;
      let element: HTMLElement | null = null;
      let stored: readonly number[] | undefined;
      editor.read(() => {
        target = $targetOfCell(handle.cell, handle.kind);
        if (target) {
          element = editor.getElementByKey(target.table.getKey()) as HTMLElement | null;
          stored = target.table.getColWidths();
        }
      });
      const start = target as Target | null;
      if (!start) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidths = measureWidths(element, stored, start.count);
      const startHeight =
        handle.cell.closest("tr")?.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT;
      let last = "";

      const onDrag = (move: MouseEvent) => {
        if (handle.kind === "column") {
          const widths = resizedWidths(startWidths, start.column, move.clientX - startX);
          last = fill(strings.current.columnWidthStatus, {
            column: start.column + 1,
            width: widths[start.column] ?? 0,
          });
          editor.update(() => $setColumnWidths(start.table.getLatest(), widths), {
            discrete: true,
          });
          setTip({
            left: move.clientX + 12,
            text: `${widths[start.column]} px`,
            top: move.clientY + 12,
          });
        } else {
          const height = Math.max(
            Math.round(startHeight + (move.clientY - startY)),
            MIN_ROW_HEIGHT,
          );
          last = fill(strings.current.rowHeightStatus, { height, row: start.row + 1 });
          editor.update(() => $setRowHeight(start.rowNode.getLatest(), height), { discrete: true });
          setTip({ left: move.clientX + 12, text: `${height} px`, top: move.clientY + 12 });
        }
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onDrag);
        window.removeEventListener("mouseup", onUp);
        setTip(null);
        if (last) setStatus(last);
      };
      window.addEventListener("mousemove", onDrag);
      window.addEventListener("mouseup", onUp);
    };

    // double-click on a column border fits the column to its longest cell
    const onDouble = (event: MouseEvent) => {
      const handle = hovering.current;
      if (!handle || handle.kind !== "column" || !editor.isEditable()) return;
      event.preventDefault();
      let fitted = 0;
      let columnNumber = 0;
      editor.update(
        () => {
          const target = $targetOfCell(handle.cell, "column");
          if (!target) return;
          const element = editor.getElementByKey(target.table.getKey()) as HTMLElement | null;
          const widths = measureWidths(element, target.table.getColWidths(), target.count);
          let widest = MIN_COLUMN_WIDTH;
          for (const row of element?.querySelectorAll("tr") ?? []) {
            const cell = [...row.children][target.column] as HTMLElement | undefined;
            if (cell) widest = Math.max(widest, textWidth(cell));
          }
          widths[target.column] = Math.round(widest);
          fitted = widths[target.column] ?? 0;
          columnNumber = target.column + 1;
          $setColumnWidths(target.table, widths);
        },
        { discrete: true },
      );
      if (fitted)
        setStatus(fill(strings.current.columnWidthStatus, { column: columnNumber, width: fitted }));
    };

    root.addEventListener("mousemove", onMove);
    root.addEventListener("mousedown", onDown, true);
    root.addEventListener("dblclick", onDouble);
    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!event.altKey || event.ctrlKey || event.metaKey || !editor.isEditable()) return false;
        const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
        const vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
        if (!horizontal && !vertical) return false;
        const selection = $getSelection();
        if (!$isTableSelection(selection)) return false;
        const cells = selection.getNodes().filter($isTableCellNode);
        const first = cells[0];
        const table = first ? $findMatchingParent(first, $isTableNode) : null;
        if (!first || !table) return false;
        const step =
          (event.shiftKey ? BIG_STEP : STEP) *
          (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
        const element = editor.getElementByKey(table.getKey()) as HTMLElement | null;
        event.preventDefault();
        if (horizontal) {
          const columns = [
            ...new Set(cells.map((cell) => $getTableColumnIndexFromTableCellNode(cell))),
          ];
          const count = Math.max(
            table.getColWidths()?.length ?? 0,
            ...columns.map((column) => column + 1),
            first.getParent()?.getChildrenSize() ?? 0,
          );
          let widths = measureWidths(element, table.getColWidths(), count);
          for (const column of columns) widths = resizedWidths(widths, column, step);
          $setColumnWidths(table, widths);
          const column = columns[0] ?? 0;
          setStatus(
            fill(strings.current.columnWidthStatus, {
              column: column + 1,
              width: widths[column] ?? 0,
            }),
          );
        } else {
          const rows = [...new Set(cells.map((cell) => $getTableRowIndexFromTableCellNode(cell)))];
          let reported = 0;
          for (const index of rows) {
            const row = table.getChildAtIndex(index) as TableRowNode | null;
            if (!row) continue;
            const rowElement = editor.getElementByKey(row.getKey()) as HTMLElement | null;
            const current =
              row.getHeight() ??
              (Math.round(rowElement?.getBoundingClientRect().height ?? 0) || DEFAULT_ROW_HEIGHT);
            const next = Math.max(current + step, MIN_ROW_HEIGHT);
            $setRowHeight(row, next);
            reported = next;
          }
          setStatus(
            fill(strings.current.rowHeightStatus, { height: reported, row: (rows[0] ?? 0) + 1 }),
          );
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mousedown", onDown, true);
      root.removeEventListener("dblclick", onDouble);
      setCursor("");
      unregister();
    };
  }, [editor]);

  return (
    <>
      <div aria-live="polite" className="sr-only" data-kg-table-resize-status role="status">
        {status}
      </div>
      {tip ? (
        <FloatingPortal
          to={
            (editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement | null) ??
            document.body
          }
        >
          <div
            className="not-kg-prose pointer-events-none fixed z-[10001] rounded bg-black px-2 py-1 font-sans text-[1.2rem] text-white dark:bg-white dark:text-black forced-colors:border forced-colors:border-[ButtonText]"
            data-kg-table-resize-tip
            style={{ left: tip.left, top: tip.top }}
          >
            {tip.text}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
};

export default TableResizePlugin;
