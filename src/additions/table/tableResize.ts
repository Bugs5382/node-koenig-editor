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
import type { TableNode, TableRowNode } from "@lexical/table";
import { $getState, $setState, createState } from "lexical";

// Resizing a table. Column widths and row heights are fields the stock table nodes already save
// (`colWidths` on the table, `height` on a row, used as a minimum height), so a resized table
// keeps its size in the document and in the reader's view. Only the table's overall width mode
// is new, stored on the table as node state.

/** What a column measures when nothing is stored or laid out (the editor draws it at 75 pixels). */
export const DEFAULT_COLUMN_WIDTH = 75;
/** The narrowest a column can be dragged, in pixels. */
export const MIN_COLUMN_WIDTH = 40;
/** The shortest a row can be dragged, in pixels. */
export const MIN_ROW_HEIGHT = 24;

/** The widths with one column's right border moved by `delta` pixels, never below the minimum.
 *  The other columns keep their widths, so the table grows or shrinks by that amount. */
export const resizedWidths = (widths: readonly number[], column: number, delta: number): number[] =>
  widths.map((width, index) =>
    index === column ? Math.max(Math.round(width + delta), MIN_COLUMN_WIDTH) : width,
  );

/** Stores the table's column widths (one per column). Inside an editor update. */
export const $setColumnWidths = (table: TableNode, widths: readonly number[]): void => {
  table.setColWidths(widths.map((width) => Math.max(Math.round(width), MIN_COLUMN_WIDTH)));
};

/** Forgets the stored widths, so the columns share the width equally again. */
export const $equalColumns = (table: TableNode): void => {
  table.setColWidths(undefined);
};

/** Sets a row's height (a minimum: a taller content still grows the row), or clears it with null. */
export const $setRowHeight = (row: TableRowNode, height: number | null): void => {
  row.setHeight(height === null ? undefined : Math.max(Math.round(height), MIN_ROW_HEIGHT));
};

/** How wide the table is: `full` fills the text column, `fit` is as wide as its content needs,
 *  `fixed` is the sum of its column widths. */
export type TableWidthMode = "fit" | "fixed" | "full";

const widthState = createState("kgTableWidth", {
  parse: (value): TableWidthMode => (value === "fit" || value === "fixed" ? value : "full"),
});

export const $getTableWidthMode = (table: TableNode): TableWidthMode =>
  $getState(table, widthState);

export const $setTableWidthMode = (table: TableNode, mode: TableWidthMode): void => {
  $setState(table, widthState, mode);
};

/** The table's column widths as drawn, one per column; the stored width where nothing is laid out. */
export const measureWidths = (
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
