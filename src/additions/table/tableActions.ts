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
  $createTableSelectionFrom,
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $moveTableColumn,
  $moveTableRow,
  $setTableColumnIsHeader,
  $setTableRowIsHeader,
  $unmergeCell,
  TableCellHeaderStates,
  type TableCellNode,
  type TableNode,
  $findTableNode,
} from "@lexical/table";
import { $findMatchingParent } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $setSelection,
  $isRangeSelection,
  $getState,
  $setState,
  createState,
  type ElementFormatType,
} from "lexical";

// What the table editor can do to the table the cursor is in. The cell toolbar and the context
// menu both list these, so the two never disagree about what is possible or what a name means.
// Everything here runs inside an editor update or read, and works on stock @lexical/table nodes
// (merged cells, cell colour, vertical alignment and column widths are fields they already save).

export type TableActionId =
  | "alignCenter"
  | "alignJustify"
  | "alignLeft"
  | "alignRight"
  | "columnLeft"
  | "columnRight"
  | "deleteColumn"
  | "deleteRow"
  | "deleteTable"
  | "headerColumn"
  | "headerRow"
  | "merge"
  | "moveColumnLeft"
  | "moveColumnRight"
  | "moveRowDown"
  | "moveRowUp"
  | "rowAbove"
  | "rowBelow"
  | "selectColumn"
  | "selectRow"
  | "selectTable"
  | "split"
  | "valignBottom"
  | "valignMiddle"
  | "valignTop"
  | "widthAuto"
  | "widthMedium"
  | "widthNarrow"
  | "widthWide";

export type TableGroupId = "align" | "cell" | "column" | "row" | "table" | "width";

/** The groups, in the order a toolbar and a menu list them, with the actions in each. */
export const TABLE_GROUPS: readonly { actions: readonly TableActionId[]; id: TableGroupId }[] = [
  {
    actions: [
      "rowAbove",
      "rowBelow",
      "moveRowUp",
      "moveRowDown",
      "deleteRow",
      "headerRow",
      "selectRow",
    ],
    id: "row",
  },
  {
    actions: [
      "columnLeft",
      "columnRight",
      "moveColumnLeft",
      "moveColumnRight",
      "deleteColumn",
      "headerColumn",
      "selectColumn",
    ],
    id: "column",
  },
  { actions: ["merge", "split", "selectTable"], id: "cell" },
  {
    actions: [
      "alignLeft",
      "alignCenter",
      "alignRight",
      "alignJustify",
      "valignTop",
      "valignMiddle",
      "valignBottom",
    ],
    id: "align",
  },
  { actions: ["widthAuto", "widthNarrow", "widthMedium", "widthWide"], id: "width" },
  { actions: ["deleteTable"], id: "table" },
];

/** Cell background colours: fixed, real colours. They are saved as an inline style on the cell, so
 *  they cannot be the editor's own CSS variables on a reader's page. Each reads at 4.5:1 or better
 *  with the dark ink the editor draws on a coloured cell (`TABLE_CELL_INK`), in light and dark. */
export const TABLE_COLORS: readonly { name: string; value: string }[] = [
  { name: "grey", value: "#E8EBEE" },
  { name: "red", value: "#FADBD8" },
  { name: "orange", value: "#FDE6C8" },
  { name: "yellow", value: "#FFF3B8" },
  { name: "green", value: "#D4EFDF" },
  { name: "blue", value: "#D6E9FA" },
  { name: "purple", value: "#E5DBF7" },
  { name: "pink", value: "#F9D9EA" },
];

export const TABLE_CELL_INK = "#15171A";

// Lexical's own default column width, which a column without a stored width has.
const COLUMN_WIDTH = 75;

const WIDTHS = { widthMedium: 160, widthNarrow: 80, widthWide: 260 } as const;

type Align = "center" | "justify" | "left" | "right";
type VerticalAlign = "bottom" | "middle" | "top";

export interface TableState {
  align: Align | "mixed";
  caption: string;
  cells: TableCellNode[];
  color: string | null | "mixed";
  column: number;
  columns: number;
  headerColumn: boolean;
  headerRow: boolean;
  isRange: boolean;
  merged: boolean;
  row: number;
  rows: number;
  table: TableNode;
  verticalAlign: VerticalAlign | "mixed";
}

const captionState = createState("kgCaption", {
  parse: (value) => (typeof value === "string" ? value : ""),
});

/** The table's caption, "" when it has none. Stored on the table as node state, so it saves with
 *  the document and moves with the table. */
export const $getTableCaption = (table: TableNode): string => $getState(table, captionState);

export const $setTableCaption = (table: TableNode, caption: string): void => {
  $setState(table, captionState, caption.trim());
};

const same = <T>(values: T[]): T | "mixed" =>
  values.every((value) => value === values[0]) ? (values[0] as T) : "mixed";

// Horizontal alignment is the cell's own format, which Lexical draws and exports as text-align.
// (The paragraphs inside a cell are not used: the editor strips paragraph alignment.)
const $alignOf = (cell: TableCellNode): Align => {
  const format = cell.getFormatType();
  return format === "center" || format === "right" || format === "justify" ? format : "left";
};

/** The table the cursor is in, with the cell or cells it covers, or null outside a table. */
export const $readTableState = (): TableState | null => {
  const selection = $getSelection();
  let cells: TableCellNode[] = [];
  if ($isTableSelection(selection)) {
    cells = selection.getNodes().filter($isTableCellNode);
  } else if ($isRangeSelection(selection)) {
    const cell = $findMatchingParent(selection.anchor.getNode(), $isTableCellNode);
    if (cell) cells = [cell];
  }
  const first = cells[0];
  if (!first) return null;
  const table = $findTableNode(first);
  if (!table) return null;
  const map = $computeTableMapSkipCellCheck(table, null, null)[0];
  const rows = table.getChildrenSize();
  const headerStates = map.map((line) => line[0]?.cell.getHeaderStyles() ?? 0);
  return {
    align: same(cells.map($alignOf)),
    caption: $getTableCaption(table),
    cells,
    color: same(cells.map((cell) => cell.getBackgroundColor())),
    column: $getTableColumnIndexFromTableCellNode(first),
    columns: map[0]?.length ?? 0,
    headerColumn:
      headerStates.length > 0 &&
      headerStates.every((s) => (s & TableCellHeaderStates.COLUMN) !== 0),
    headerRow: ((map[0]?.[0]?.cell.getHeaderStyles() ?? 0) & TableCellHeaderStates.ROW) !== 0,
    isRange: $isTableSelection(selection) && cells.length > 1,
    merged: cells.some((cell) => cell.getColSpan() > 1 || cell.getRowSpan() > 1),
    row: $getTableRowIndexFromTableCellNode(first),
    rows,
    table,
    verticalAlign: same(cells.map((cell) => (cell.getVerticalAlign() ?? "top") as VerticalAlign)),
  };
};

/** Whether an action makes sense for the cell or range the cursor is in right now. */
export const $isTableActionEnabled = (
  id: TableActionId,
  state: TableState | null = $readTableState(),
): boolean => {
  if (!state) return false;
  switch (id) {
    case "merge":
      return state.isRange;
    case "split":
      return state.merged;
    case "moveRowUp":
      return state.row > 0;
    case "moveRowDown":
      return state.row < state.rows - 1;
    case "moveColumnLeft":
      return state.column > 0;
    case "moveColumnRight":
      return state.column < state.columns - 1;
    case "deleteRow":
      return state.rows > 1;
    case "deleteColumn":
      return state.columns > 1;
    default:
      return true;
  }
};

const $columnsOf = (cells: TableCellNode[]): number[] => [
  ...new Set(cells.map((cell) => $getTableColumnIndexFromTableCellNode(cell))),
];

const $setAlign = (cells: TableCellNode[], align: Align) => {
  const format: ElementFormatType = align === "left" ? "" : align;
  for (const cell of cells) cell.setFormat(format);
};

const $setWidth = (state: TableState, width: number | null) => {
  const widths = [
    ...(state.table.getColWidths() ?? Array.from({ length: state.columns }, () => COLUMN_WIDTH)),
  ];
  while (widths.length < state.columns) widths.push(COLUMN_WIDTH);
  for (const column of $columnsOf(state.cells)) widths[column] = width ?? COLUMN_WIDTH;
  state.table.setColWidths(widths.every((w) => w === COLUMN_WIDTH) ? undefined : widths);
};

/** Sets the background colour of the cell or range, or clears it with null. */
export const $setCellColor = (color: string | null): void => {
  const state = $readTableState();
  if (!state) return;
  for (const cell of state.cells) cell.setBackgroundColor(color);
};

/** Runs an action on the cell or range the cursor is in. Does nothing when it is not possible. */
export const $runTableAction = (id: TableActionId): void => {
  const state = $readTableState();
  if (!state || !$isTableActionEnabled(id, state)) return;
  switch (id) {
    case "rowAbove":
      $insertTableRowAtSelection(false);
      return;
    case "rowBelow":
      $insertTableRowAtSelection(true);
      return;
    case "columnLeft":
      $insertTableColumnAtSelection(false);
      return;
    case "columnRight":
      $insertTableColumnAtSelection(true);
      return;
    case "deleteRow":
      $deleteTableRowAtSelection();
      return;
    case "deleteColumn":
      $deleteTableColumnAtSelection();
      return;
    case "deleteTable": {
      // the document is never left without a place to type
      const paragraph = $createParagraphNode();
      state.table.replace(paragraph);
      paragraph.select();
      return;
    }
    case "moveRowUp":
      $moveTableRow(state.table, state.row, state.row - 1);
      return;
    case "moveRowDown":
      $moveTableRow(state.table, state.row, state.row + 1);
      return;
    case "moveColumnLeft":
      $moveTableColumn(state.table, state.column, state.column - 1);
      return;
    case "moveColumnRight":
      $moveTableColumn(state.table, state.column, state.column + 1);
      return;
    case "headerRow":
      $setTableRowIsHeader(state.table, 0, !state.headerRow);
      return;
    case "headerColumn":
      $setTableColumnIsHeader(state.table, 0, !state.headerColumn);
      return;
    case "selectRow":
    case "selectColumn":
    case "selectTable": {
      const map = $computeTableMapSkipCellCheck(state.table, null, null)[0];
      const lastRow = map.length - 1;
      const lastColumn = (map[0]?.length ?? 1) - 1;
      const [from, to] =
        id === "selectRow"
          ? [map[state.row]?.[0], map[state.row]?.[lastColumn]]
          : id === "selectColumn"
            ? [map[0]?.[state.column], map[lastRow]?.[state.column]]
            : [map[0]?.[0], map[lastRow]?.[lastColumn]];
      if (from && to) $setSelection($createTableSelectionFrom(state.table, from.cell, to.cell));
      return;
    }
    case "merge": {
      const merged = $mergeCells(state.cells);
      merged?.selectStart();
      return;
    }
    case "split":
      $unmergeCell();
      return;
    case "alignLeft":
      $setAlign(state.cells, "left");
      return;
    case "alignCenter":
      $setAlign(state.cells, "center");
      return;
    case "alignRight":
      $setAlign(state.cells, "right");
      return;
    case "alignJustify":
      $setAlign(state.cells, "justify");
      return;
    case "valignTop":
    case "valignMiddle":
    case "valignBottom": {
      const value = id === "valignTop" ? null : id === "valignMiddle" ? "middle" : "bottom";
      for (const cell of state.cells) cell.setVerticalAlign(value);
      return;
    }
    case "widthAuto":
      $setWidth(state, null);
      return;
    case "widthNarrow":
    case "widthMedium":
    case "widthWide":
      $setWidth(state, WIDTHS[id]);
      return;
  }
};

/** Which cells an alignment from the selection toolbar applies to, for text selected in one cell. */
export type TableScope = "cell" | "column" | "row" | "table";

export const TABLE_SCOPES: readonly TableScope[] = ["cell", "row", "column", "table"];

const $cellsInScope = (state: TableState, scope: TableScope): TableCellNode[] => {
  if (scope === "cell") return state.cells;
  const map = $computeTableMapSkipCellCheck(state.table, null, null)[0];
  const picked =
    scope === "row"
      ? (map[state.row] ?? [])
      : scope === "column"
        ? map.map((line) => line[state.column])
        : map.flat();
  const cells = new Set<TableCellNode>();
  for (const entry of picked) if (entry) cells.add(entry.cell);
  return [...cells];
};

/** Aligns the cells in a scope: across (`across`) or down (`down`). Inside an editor update. */
export const $alignInScope = (
  kind: "across" | "down",
  value: Align | VerticalAlign,
  scope: TableScope,
): void => {
  const state = $readTableState();
  if (!state) return;
  const cells = $cellsInScope(state, scope);
  if (kind === "across") $setAlign(cells, value as Align);
  else for (const cell of cells) cell.setVerticalAlign(value === "top" ? null : value);
};
