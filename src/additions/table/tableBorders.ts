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
import {
  $computeTableMapSkipCellCheck,
  $isTableCellNode,
  $isTableRowNode,
  type TableCellNode,
  type TableNode,
} from "@lexical/table";
import { $getState, $setState, createState, type LexicalEditor } from "lexical";

// Table borders. Each cell remembers its four sides (a line style, a thickness and a colour); a
// side nobody has set keeps the table's default line. The border tools work on a set of cells
// (the selection, a row, a column or the whole table) and apply to the outer edges of that set,
// the lines inside it, or both. A line shared by two cells is written on both, so the cell on the
// other side never draws a different line over it.

export type BorderStyle = "dashed" | "dotted" | "none" | "solid";
export type BorderWidth = "medium" | "thick" | "thin";
export type BorderSide = "bottom" | "left" | "right" | "top";
export type BorderWhere = "all" | "inner" | "outer";

export interface BorderEdge {
  /** A hex colour, or null for the table's default line colour. */
  color: string | null;
  style: BorderStyle;
  width: BorderWidth;
}

export type CellBorders = Partial<Record<BorderSide, BorderEdge>>;

export const BORDER_STYLES: readonly BorderStyle[] = ["none", "solid", "dashed", "dotted"];
export const BORDER_WIDTHS: readonly BorderWidth[] = ["thin", "medium", "thick"];
export const BORDER_WIDTH_PX: Record<BorderWidth, number> = { medium: 2, thick: 4, thin: 1 };
export const BORDER_SIDES: readonly BorderSide[] = ["top", "right", "bottom", "left"];

const isStyle = (value: unknown): value is BorderStyle =>
  typeof value === "string" && (BORDER_STYLES as readonly string[]).includes(value);
const isWidth = (value: unknown): value is BorderWidth =>
  typeof value === "string" && (BORDER_WIDTHS as readonly string[]).includes(value);

const parseBorders = (value: unknown): CellBorders => {
  const result: CellBorders = {};
  if (!value || typeof value !== "object") return result;
  for (const side of BORDER_SIDES) {
    const raw = (value as Record<string, unknown>)[side] as Record<string, unknown> | undefined;
    if (raw && isStyle(raw.style) && isWidth(raw.width)) {
      const color =
        typeof raw.color === "string" && /^#[\da-f]{3,8}$/i.test(raw.color) ? raw.color : null;
      result[side] = { color, style: raw.style, width: raw.width };
    }
  }
  return result;
};

const bordersState = createState("kgBorders", {
  isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  parse: parseBorders,
});

export const $getCellBorders = (cell: TableCellNode): CellBorders => $getState(cell, bordersState);

const $setCellBorders = (cell: TableCellNode, borders: CellBorders): void => {
  $setState(cell, bordersState, borders);
};

/** The CSS for one side. A cell whose side was never set draws the table's default line. */
export const borderCss = (edge: BorderEdge): string =>
  edge.style === "none"
    ? "none"
    : `${BORDER_WIDTH_PX[edge.width]}px ${edge.style} ${edge.color ?? "var(--kg-table-border-color, #7C8B9A)"}`;

const DELTAS: Record<BorderSide, [number, number]> = {
  bottom: [1, 0],
  left: [0, -1],
  right: [0, 1],
  top: [-1, 0],
};
const OPPOSITE: Record<BorderSide, BorderSide> = {
  bottom: "top",
  left: "right",
  right: "left",
  top: "bottom",
};

/**
 * Sets (or, with null, clears) the border of the given cells' edges. `where` picks the outer edges
 * of the set, the lines between its cells, or both. Inside an editor update.
 */
export const $applyBorders = (
  table: TableNode,
  cells: readonly TableCellNode[],
  where: BorderWhere,
  edge: BorderEdge | null,
): void => {
  const map = $computeTableMapSkipCellCheck(table, null, null)[0];
  const chosen = new Set(cells.map((cell) => cell.getKey()));
  const pending = new Map<string, { cell: TableCellNode; borders: CellBorders }>();
  const bordersOf = (cell: TableCellNode) => {
    let entry = pending.get(cell.getKey());
    if (!entry) {
      entry = { borders: { ...$getCellBorders(cell) }, cell };
      pending.set(cell.getKey(), entry);
    }
    return entry.borders;
  };
  const write = (cell: TableCellNode, side: BorderSide) => {
    const borders = bordersOf(cell);
    if (edge) borders[side] = edge;
    else delete borders[side];
  };
  for (const [r, line] of map.entries()) {
    for (const [c, entry] of line.entries()) {
      if (!entry || !chosen.has(entry.cell.getKey())) continue;
      for (const side of BORDER_SIDES) {
        const [dr, dc] = DELTAS[side];
        const next = map[r + dr]?.[c + dc];
        if (next && next.cell.getKey() === entry.cell.getKey()) continue; // inside a merged cell
        const neighbourChosen = next ? chosen.has(next.cell.getKey()) : false;
        const wanted = where === "all" || (where === "inner" ? neighbourChosen : !neighbourChosen);
        if (!wanted) continue;
        write(entry.cell, side);
        if (next) write(next.cell, OPPOSITE[side]);
      }
    }
  }
  for (const { borders, cell } of pending.values()) $setCellBorders(cell, borders);
};

const CSS_PROPERTY: Record<BorderSide, string> = {
  bottom: "border-bottom",
  left: "border-left",
  right: "border-right",
  top: "border-top",
};

/** Writes a cell's sides onto its element (inline, so they win over the table's default lines).
 *  Sides nobody set are left to the stylesheet. Inside an editor read or update. */
export const $syncCellBorders = (editor: LexicalEditor, table: TableNode): void => {
  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) continue;
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) continue;
      const element = editor.getElementByKey(cell.getKey());
      if (!element) continue;
      const borders = $getCellBorders(cell);
      let any = false;
      for (const side of BORDER_SIDES) {
        const edge = borders[side];
        if (edge) {
          any = true;
          const css = borderCss(edge);
          if (element.style.getPropertyValue(CSS_PROPERTY[side]) !== css)
            element.style.setProperty(CSS_PROPERTY[side], css);
        } else if (element.hasAttribute("data-kg-bordered")) {
          element.style.removeProperty(CSS_PROPERTY[side]);
        }
      }
      if (any) element.setAttribute("data-kg-bordered", "");
      else element.removeAttribute("data-kg-bordered");
    }
  }
};
