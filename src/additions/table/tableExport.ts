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
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type {
  DOMExportOutput,
  DOMExportOutputMap,
  Klass,
  LexicalEditor,
  LexicalNode,
} from "lexical";

import { $getTableCaption, $getTableFigure, TABLE_CELL_INK } from "./tableActions";
import { $cellLookOf } from "./tableLook";
import { $getCellBorders, BORDER_SIDES, borderCss } from "./tableBorders";
import { $getTableWidthMode } from "./tableResize";

// What a reader's page gets in the saved HTML. Stock table export already carries merged cells
// (colspan, rowspan), the shading (an inline background colour), vertical alignment and the cell's
// text alignment (as start only, so it is set from the cell's format here). Three things need adding: the caption as a real `caption` element, and dark ink on
// a shaded cell, because the reader's page may have a light text colour that would not read on it,
// and the cell's own text alignment.
export const TABLE_HTML_EXPORT: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [
    TableNode,
    (editor, target) => {
      const table = target as TableNode;
      const output = table.exportDOM(editor);
      if (!(output.element instanceof HTMLElement)) return output;
      const caption = $getTableCaption(table);
      if (caption) {
        const element = output.element.ownerDocument.createElement("caption");
        element.textContent = caption;
        if (!$getTableFigure(table)?.above) element.style.captionSide = "bottom";
        output.element.insertBefore(element, output.element.firstChild);
      }
      // column widths as shares of the whole, so the table reads the same in any column width
      const widths = table.getColWidths();
      const total = widths?.reduce((sum, width) => sum + width, 0) ?? 0;
      const cols = output.element.querySelectorAll("col");
      if (widths && total > 0) {
        cols.forEach((col, index) => {
          const width = widths[index];
          if (width) col.style.width = `${Math.round((width / total) * 10000) / 100}%`;
        });
      }
      const mode = $getTableWidthMode(table);
      output.element.setAttribute("data-kg-table-width", mode);
      output.element.style.width =
        mode === "fit" ? "auto" : mode === "fixed" && total > 0 ? `${total}px` : "100%";
      output.element.style.maxWidth = "100%";
      return output;
    },
  ],
  [
    TableRowNode,
    (editor, target) => {
      const output = (target as TableRowNode).exportDOM(editor);
      // a row height is a minimum: taller content still grows the row
      if (output.element instanceof HTMLElement && output.element.style.height) {
        output.element.style.minHeight = output.element.style.height;
        output.element.style.removeProperty("height");
      }
      return output;
    },
  ],
  [
    TableCellNode,
    (editor, target) => {
      const cell = target as TableCellNode;
      const output = cell.exportDOM(editor);
      if (output.element instanceof HTMLElement) {
        const borders = $getCellBorders(cell);
        for (const side of BORDER_SIDES) {
          const edge = borders[side];
          if (edge) output.element.style.setProperty(`border-${side}`, borderCss(edge));
        }
        if (cell.getBackgroundColor()) output.element.style.color = TABLE_CELL_INK;
        else {
          // the table's stripes and brand colour, written on the cell: a reader's page has no
          // stylesheet of ours, and the ink is chosen to read on the colour
          const look = $cellLookOf(cell);
          if (look) {
            output.element.style.backgroundColor = look.background;
            output.element.style.color = look.ink;
          }
        }
        // the stock export always writes text-align: start; the cell's own alignment wins
        const format = cell.getFormatType();
        if (format) output.element.style.textAlign = format;
      }
      return output;
    },
  ],
]);

export default TABLE_HTML_EXPORT;
