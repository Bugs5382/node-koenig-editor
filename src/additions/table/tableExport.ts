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
import { TableCellNode, TableNode } from "@lexical/table";
import type {
  DOMExportOutput,
  DOMExportOutputMap,
  Klass,
  LexicalEditor,
  LexicalNode,
} from "lexical";

import { $getTableCaption, TABLE_CELL_INK } from "./tableActions";

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
      const output = (target as TableNode).exportDOM(editor);
      const caption = $getTableCaption(target as TableNode);
      if (caption && output.element instanceof HTMLElement) {
        const element = output.element.ownerDocument.createElement("caption");
        element.textContent = caption;
        output.element.insertBefore(element, output.element.firstChild);
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
        if (cell.getBackgroundColor()) output.element.style.color = TABLE_CELL_INK;
        // the stock export always writes text-align: start; the cell's own alignment wins
        const format = cell.getFormatType();
        if (format) output.element.style.textAlign = format;
      }
      return output;
    },
  ],
]);

export default TABLE_HTML_EXPORT;
