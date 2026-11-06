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

import { $getTableCaption } from "./tableActions";

// A table's caption is node state (see tableActions), drawn as a real `caption` element inside
// the table, so the editor, the reader's view and a screen reader all get the same thing. The
// element is kept outside Lexical's own children: it sits before the table's column group, which
// the table node already skips when it lays out its rows.
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
          const text = $getTableCaption(table);
          let caption = element.querySelector(":scope > caption[data-kg-table-caption]");
          if (!text) {
            caption?.remove();
            continue;
          }
          if (!caption) {
            caption = document.createElement("caption");
            caption.setAttribute("data-kg-table-caption", "");
            caption.setAttribute("contenteditable", "false");
            element.insertBefore(caption, element.firstChild);
          }
          if (caption.textContent !== text) caption.textContent = text;
        }
      });
    };
    sync();
    return editor.registerUpdateListener(sync);
  }, [editor]);
};

export default useTableCaptions;
