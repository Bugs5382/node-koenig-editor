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
import { TableNode } from "@lexical/table";
import { $nodesOfType } from "lexical";
import { useEffect } from "react";

import { $getTableCaption, $getTableFigure } from "./tableActions";
import { $syncCellBorders } from "./tableBorders";
import { $getTableWidthMode } from "./tableResize";

// A table's caption is node state (see tableActions). In the editor it is drawn from attributes on
// the table element, not from a child element: Lexical removes DOM nodes it did not put there, and
// re-adding one would never settle. `data-kg-caption` carries the text for a CSS caption box
// (`table::after`), and `aria-label` gives the table its accessible name. The exported HTML has a
// real `caption` element.
// The table's width mode and sizing, as attributes the stylesheet reads and a width where one is
// needed (a fixed table is as wide as its columns).
const syncSize = (table: TableNode, element: Element) => {
  const mode = $getTableWidthMode(table);
  const widths = table.getColWidths();
  const total = widths?.reduce((sum, width) => sum + width, 0) ?? 0;
  const html = element as HTMLElement;
  if (element.getAttribute("data-kg-table-width") !== mode)
    element.setAttribute("data-kg-table-width", mode);
  if (widths?.length) {
    if (!element.hasAttribute("data-kg-sized")) element.setAttribute("data-kg-sized", "");
  } else if (element.hasAttribute("data-kg-sized")) {
    element.removeAttribute("data-kg-sized");
  }
  const width = mode === "fit" ? "auto" : mode === "fixed" && total > 0 ? `${total}px` : "";
  if (html.style.width !== width) html.style.width = width;
};

export const useTableCaptions = (): void => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TableNode])) return undefined;
    const sync = () => {
      editor.getEditorState().read(() => {
        for (const table of $nodesOfType(TableNode)) {
          const found = editor.getElementByKey(table.getKey());
          const element = found?.tagName === "TABLE" ? found : found?.querySelector("table");
          if (!element) continue;
          syncSize(table, element);
          $syncCellBorders(editor, table);
          const text = $getTableCaption(table);
          if (!text) {
            element.removeAttribute("data-kg-caption");
            element.removeAttribute("data-kg-caption-above");
            if (element.hasAttribute("data-kg-captioned")) {
              element.removeAttribute("aria-label");
              element.removeAttribute("data-kg-captioned");
            }
            continue;
          }
          if (element.getAttribute("data-kg-caption") !== text)
            element.setAttribute("data-kg-caption", text);
          if (element.getAttribute("aria-label") !== text) element.setAttribute("aria-label", text);
          element.setAttribute("data-kg-captioned", "");
          if ($getTableFigure(table)?.above) element.setAttribute("data-kg-caption-above", "");
          else element.removeAttribute("data-kg-caption-above");
        }
      });
    };
    sync();
    return editor.registerUpdateListener(sync);
  }, [editor]);
};

export default useTableCaptions;
