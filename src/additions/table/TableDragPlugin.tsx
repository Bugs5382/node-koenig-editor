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
import { $moveTableColumn, $moveTableRow, TableNode } from "@lexical/table";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import { $readTableState } from "./tableActions";
import { dropIndex, type Line } from "./tableDrag";

// Drag a row or column to a new place. A small grip sits at the left of the cursor's row and under
// its column; hold it and drag, and a line shows where the row or column will land. The same moves
// are in the table menu and toolbar (move up, down, left, right) for anyone who does not drag.

interface Active {
  column: number;
  columns: number;
  row: number;
  rows: number;
  tableKey: string;
}

interface Boxes {
  columnLines: Line[];
  columnRect: DOMRect | null;
  rowLines: Line[];
  rowRect: DOMRect | null;
  table: DOMRect;
}

const fill = (template: string, values: Record<string, number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const measure = (element: HTMLElement, active: Active): Boxes => {
  const rows = [...element.querySelectorAll("tr")];
  const rowLines = rows.map((tr) => {
    const rect = tr.getBoundingClientRect();
    return { end: rect.bottom, start: rect.top };
  });
  const widest = rows.reduce<Element | undefined>(
    (best, tr) => (tr.children.length > (best?.children.length ?? -1) ? tr : best),
    undefined,
  );
  const columnLines = [...(widest?.children ?? [])].map((cell) => {
    const rect = cell.getBoundingClientRect();
    return { end: rect.right, start: rect.left };
  });
  const rowBox = rows[active.row]?.getBoundingClientRect() ?? null;
  const columnCell = widest?.children[active.column];
  return {
    columnLines,
    columnRect: columnCell?.getBoundingClientRect() ?? null,
    rowLines,
    rowRect: rowBox,
    table: element.getBoundingClientRect(),
  };
};

export const TableDragPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const t = useKoenigStrings().table;
  const strings = useRef(t);
  strings.current = t;
  const [active, setActive] = useState<Active | null>(null);
  const [boxes, setBoxes] = useState<Boxes | null>(null);
  const [drop, setDrop] = useState<{
    horizontal: boolean;
    left: number;
    size: number;
    top: number;
  } | null>(null);
  const [status, setStatus] = useState("");
  const dragging = useRef(false);

  const refresh = useCallback(() => {
    if (dragging.current) return;
    if (!editor.isEditable() || !editor.hasNodes([TableNode])) {
      setActive(null);
      return;
    }
    let next: Active | null = null;
    editor.getEditorState().read(() => {
      const state = $readTableState();
      if (state)
        next = {
          column: state.column,
          columns: state.columns,
          row: state.row,
          rows: state.rows,
          tableKey: state.table.getKey(),
        };
    });
    setActive((previous) => {
      const found = next as Active | null;
      if (!found) return null;
      return previous &&
        previous.column === found.column &&
        previous.row === found.row &&
        previous.rows === found.rows &&
        previous.columns === found.columns &&
        previous.tableKey === found.tableKey
        ? previous
        : found;
    });
  }, [editor]);

  useEffect(() => {
    refresh();
    const stopUpdates = editor.registerUpdateListener(refresh);
    const stopEditable = editor.registerEditableListener(refresh);
    return () => {
      stopUpdates();
      stopEditable();
    };
  }, [editor, refresh]);

  // where the grips go, measured from the page; again when the window or a scroller moves
  useEffect(() => {
    if (!active) {
      setBoxes(null);
      return undefined;
    }
    const place = () => {
      const found = editor.getElementByKey(active.tableKey);
      const element = found?.tagName === "TABLE" ? found : found?.querySelector("table");
      if (element) setBoxes(measure(element as HTMLElement, active));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const unregister = editor.registerUpdateListener(() => requestAnimationFrame(place));
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      unregister();
    };
  }, [active, editor]);

  const start = (kind: "column" | "row") => (event: React.MouseEvent) => {
    if (!active || !boxes || event.button !== 0) return;
    event.preventDefault();
    const from = kind === "row" ? active.row : active.column;
    const lines = kind === "row" ? boxes.rowLines : boxes.columnLines;
    let target = from;
    dragging.current = true;
    const line = (index: number) => {
      const edge = lines[index];
      if (!edge) return;
      // the line sits on the far side of the target when moving down or right, the near side otherwise
      const at = index > from ? edge.end : edge.start;
      if (kind === "row")
        setDrop({ horizontal: true, left: boxes.table.left, size: boxes.table.width, top: at });
      else setDrop({ horizontal: false, left: at, size: boxes.table.height, top: boxes.table.top });
    };
    const onMove = (move: MouseEvent) => {
      target = dropIndex(lines, kind === "row" ? move.clientY : move.clientX);
      line(target);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragging.current = false;
      setDrop(null);
      if (target !== from) {
        editor.update(
          () => {
            const state = $readTableState();
            if (!state) return;
            if (kind === "row") $moveTableRow(state.table, from, target);
            else $moveTableColumn(state.table, from, target);
          },
          { discrete: true },
        );
        setStatus(
          fill(
            kind === "row" ? strings.current.rowMovedStatus : strings.current.columnMovedStatus,
            {
              from: from + 1,
              to: target + 1,
            },
          ),
        );
      }
      refresh();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const target = editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement | null;
  const grip =
    "fixed z-[9998] flex cursor-grab items-center justify-center rounded bg-white text-grey-700 shadow-sm hover:bg-grey-200/80 active:cursor-grabbing dark:bg-grey-950 dark:text-grey-300 forced-colors:border forced-colors:border-[ButtonText]";
  // nothing to draw until a table is being edited: no portal, no extra node in the editor's tree
  if (!(active && boxes) && !drop && !status) return null;
  return (
    <FloatingPortal to={target ?? document.body}>
      {active && boxes?.rowRect ? (
        <div
          aria-label={fill(t.dragRow, { row: active.row + 1 })}
          className={`${grip} h-6 w-4`}
          data-kg-table-row-grip
          role="button"
          style={{
            left: boxes.table.left - 20,
            top: boxes.rowRect.top + boxes.rowRect.height / 2 - 12,
          }}
          tabIndex={-1}
          title={t.dragRowHint}
          onMouseDown={start("row")}
        >
          <svg aria-hidden="true" height="12" viewBox="0 0 8 12" width="8">
            <path
              d="M1 1h2v2H1zm4 0h2v2H5zM1 5h2v2H1zm4 0h2v2H5zM1 9h2v2H1zm4 0h2v2H5z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : null}
      {active && boxes?.columnRect ? (
        <div
          aria-label={fill(t.dragColumn, { column: active.column + 1 })}
          className={`${grip} h-4 w-6`}
          data-kg-table-column-grip
          role="button"
          style={{
            left: boxes.columnRect.left + boxes.columnRect.width / 2 - 12,
            top: boxes.table.bottom + 4,
          }}
          tabIndex={-1}
          title={t.dragColumnHint}
          onMouseDown={start("column")}
        >
          <svg aria-hidden="true" height="8" viewBox="0 0 12 8" width="12">
            <path
              d="M1 1h2v2H1zm4 0h2v2H5zm4 0h2v2H9zM1 5h2v2H1zm4 0h2v2H5zm4 0h2v2H9z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : null}
      {drop ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[9998] bg-selection forced-colors:bg-[Highlight]"
          data-kg-table-drop-line
          style={
            drop.horizontal
              ? { height: 3, left: drop.left, top: drop.top - 1, width: drop.size }
              : { height: drop.size, left: drop.left - 1, top: drop.top, width: 3 }
          }
        />
      ) : null}
      <div aria-live="polite" className="sr-only" role="status">
        {status}
      </div>
    </FloatingPortal>
  );
};

export default TableDragPlugin;
