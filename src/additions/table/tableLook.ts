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
import type { TableCellNode, TableNode } from "@lexical/table";
import { $getState, $setState, createState } from "lexical";

import { isColorValue } from "../colors/colors";
import { inkFor } from "../textStyle/textStyle";

// A table's look: stripes on every second row and/or column (the band colour), and a brand colour
// on the header row and/or the first column. Node state on the table, so it saves with the
// document. The editor draws it from attributes (see tableCaption); the saved HTML carries it as
// inline colours on the cells, because a reader's page does not have the editor's stylesheet.

export interface TableLook {
  bandColor: string | null;
  bandColumns: boolean;
  bandRows: boolean;
  brandColor: string | null;
  brandColumns: boolean;
  brandRows: boolean;
}

export const DEFAULT_BAND_COLOR = "#E3E8EC";
export const DEFAULT_BRAND_COLOR = "#3B82F6";

const NO_LOOK: TableLook = {
  bandColor: null,
  bandColumns: false,
  bandRows: false,
  brandColor: null,
  brandColumns: false,
  brandRows: false,
};

const parseLook = (value: unknown): TableLook => {
  if (!value || typeof value !== "object") return NO_LOOK;
  const raw = value as Record<string, unknown>;
  const color = (key: string) => (isColorValue(raw[key]) ? (raw[key] as string) : null);
  return {
    bandColor: color("bandColor"),
    bandColumns: raw.bandColumns === true,
    bandRows: raw.bandRows === true,
    brandColor: color("brandColor"),
    brandColumns: raw.brandColumns === true,
    brandRows: raw.brandRows === true,
  };
};

const lookState = createState("kgTableLook", {
  isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  parse: parseLook,
});

export const $getTableLook = (table: TableNode): TableLook => $getState(table, lookState);

/** Changes some of the table's look. Inside an editor update. */
export const $setTableLook = (table: TableNode, change: Partial<TableLook>): void => {
  $setState(table, lookState, { ...$getTableLook(table), ...change });
};

/** True when the table has any stripe or brand colour on. */
export const hasLook = (look: TableLook): boolean =>
  look.bandRows || look.bandColumns || look.brandRows || look.brandColumns;

export interface CellLook {
  background: string;
  ink: string;
}

/** The colour of the cell at (row, column), counted from 0, or null when the look leaves it alone.
 *  The brand colour wins over a stripe. */
export const cellLook = (look: TableLook, row: number, column: number): CellLook | null => {
  if ((look.brandRows && row === 0) || (look.brandColumns && column === 0)) {
    const background = look.brandColor ?? DEFAULT_BRAND_COLOR;
    return { background, ink: inkFor(background) };
  }
  if ((look.bandRows && row % 2 === 1) || (look.bandColumns && column % 2 === 1)) {
    const background = look.bandColor ?? DEFAULT_BAND_COLOR;
    return { background, ink: inkFor(background) };
  }
  return null;
};

/** The colour a cell gets from its table's look, from its place in the table. */
export const $cellLookOf = (cell: TableCellNode): CellLook | null => {
  const row = cell.getParent();
  const table = row?.getParent();
  if (!row || !table) return null;
  const look = $getTableLook(table as TableNode);
  return hasLook(look)
    ? cellLook(look, row.getIndexWithinParent(), cell.getIndexWithinParent())
    : null;
};
