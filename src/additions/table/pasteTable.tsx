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
  $computeTableMapSkipCellCheck,
  $findTableNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableSelection,
  TableNode,
} from "@lexical/table";
import { $findMatchingParent } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";

/**
 * Text copied from a spreadsheet as rows and cells: lines are rows, tabs split cells, and a cell in
 * double quotes may hold tabs, line breaks and doubled quotes. Returns null for text that is not a
 * grid (no tab and a single line), so an ordinary paste is left alone.
 */
export const parseSpreadsheetText = (source: string): string[][] | null => {
  if (!source.includes("\t") && !/\r?\n./.test(source)) return null;
  const rows: string[][] = [];
  let rowCells: string[] = [];
  let value = "";
  let quoted = false;
  let atStart = true;
  const endCell = () => {
    rowCells.push(value);
    value = "";
    atStart = true;
  };
  const endRow = () => {
    endCell();
    rows.push(rowCells);
    rowCells = [];
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source.charAt(index);
    if (quoted) {
      if (character === '"' && source.charAt(index + 1) === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && atStart) {
      quoted = true;
      atStart = false;
    } else if (character === "\t") {
      endCell();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source.charAt(index + 1) === "\n") index += 1;
      endRow();
    } else {
      value += character;
      atStart = false;
    }
  }
  // the last line, unless the text ended with a line break
  if (value !== "" || rowCells.length > 0) endRow();
  return rows;
};

// Pasting spreadsheet text into a table fills the cells from the cursor's cell, adding rows and
// columns when the data is bigger than what is left. The text is used even when the clipboard also
// carries an HTML table (spreadsheets send both), so a table is never nested inside a cell.
export const TablePastePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TableNode])) return undefined;
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!editor.isEditable() || !("clipboardData" in event)) return false;
        const rows = parseSpreadsheetText(event.clipboardData?.getData("text/plain") ?? "");
        if (!rows || rows.length === 0) return false;
        let done = false;
        editor.update(
          () => {
            const selection = $getSelection();
            const node = $isTableSelection(selection)
              ? selection.getNodes().find($isTableCellNode)
              : $isRangeSelection(selection)
                ? $findMatchingParent(selection.anchor.getNode(), $isTableCellNode)
                : null;
            const start = $isTableCellNode(node) ? node : null;
            const table = start ? $findTableNode(start) : null;
            if (!start || !table) return;
            done = true;
            const row0 = $getTableRowIndexFromTableCellNode(start);
            const column0 = $getTableColumnIndexFromTableCellNode(start);
            const need = {
              columns: column0 + Math.max(...rows.map((cells) => cells.length)),
              rows: row0 + rows.length,
            };
            const map = () => $computeTableMapSkipCellCheck(table, null, null)[0];
            for (let guard = 0; guard < 500 && map().length < need.rows; guard += 1) {
              const last = map().at(-1)?.[0]?.cell;
              if (!last) break;
              $insertTableRowAtNode(last, true);
            }
            for (let guard = 0; guard < 500 && (map()[0]?.length ?? 0) < need.columns; guard += 1) {
              const last = map()[0]?.at(-1)?.cell;
              if (!last) break;
              $insertTableColumnAtNode(last, true, false);
            }
            const grid = map();
            rows.forEach((cells, i) => {
              cells.forEach((value, j) => {
                const cell = grid[row0 + i]?.[column0 + j]?.cell;
                if (!cell) return;
                cell.clear();
                const paragraph = $createParagraphNode();
                if (value) paragraph.append($createTextNode(value));
                cell.append(paragraph);
              });
            });
          },
          { discrete: true },
        );
        if (done) event.preventDefault();
        return done;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);
  return null;
};

export default TablePastePlugin;
