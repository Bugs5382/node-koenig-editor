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
import { $findMatchingParent } from "@lexical/utils";
import { $isTableCellNode, TableCellHeaderStates, TableCellNode } from "@lexical/table";
import { $getNodeByKey, $getSelection, $isRangeSelection } from "lexical";
import { useEffect } from "react";

// Keeps the table's markup and state right for assistive technology and for styling. The editing
// controls themselves (toolbar, menus, caption) live in TableEditorPlugin.

/** Keeps `scope` on the cells' DOM: header cells name what they head, body cells carry none. */
const useCellScope = (): void => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TableCellNode])) return undefined;
    return editor.registerMutationListener(TableCellNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        if (mutation === "destroyed") continue;
        const element = editor.getElementByKey(key);
        if (!element) continue;
        const states = editor.getEditorState().read(() => {
          const node = $getNodeByKey(key);
          return $isTableCellNode(node) ? node.getHeaderStyles() : 0;
        });
        if (states & TableCellHeaderStates.ROW) element.setAttribute("scope", "col");
        else if (states & TableCellHeaderStates.COLUMN) element.setAttribute("scope", "row");
        else element.removeAttribute("scope");
      }
    });
  }, [editor]);
};

const ACTIVE_CELL = "data-kg-active-cell";

/**
 * Marks the cell the cursor is in with `data-kg-active-cell`, one at a time. The whole document is
 * one editable area, so the browser's focus never sits inside a cell and `:focus-within` cannot
 * draw the cell the cursor is in; the mark can.
 */
const useActiveCell = (): void => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    let marked: HTMLElement | null = null;
    const mark = (element: HTMLElement | null) => {
      if (element === marked) return;
      marked?.removeAttribute(ACTIVE_CELL);
      element?.setAttribute(ACTIVE_CELL, "");
      marked = element;
    };
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      const key = editorState.read(() => {
        const selection = $getSelection();
        if (!editor.isEditable() || !$isRangeSelection(selection)) return null;
        return $findMatchingParent(selection.anchor.getNode(), $isTableCellNode)?.getKey() ?? null;
      });
      mark(key ? editor.getElementByKey(key) : null);
    });
    // Read-only (the reader's view) has no cursor to show.
    const unregisterEditable = editor.registerEditableListener((editable) => {
      if (!editable) mark(null);
    });
    return () => {
      unregister();
      unregisterEditable();
      mark(null);
    };
  }, [editor]);
};

export const TableActionsPlugin = () => {
  useCellScope();
  useActiveCell();
  return null;
};

export default TableActionsPlugin;
