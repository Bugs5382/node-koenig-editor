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
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findTableNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableRowNode,
  $setTableRowIsHeader,
  TableCellHeaderStates,
  TableCellNode,
  type TableNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  type NodeKey,
} from "lexical";
import { type CSSProperties, useCallback, useEffect, useState } from "react";

import { FloatingPortal } from "../placement/FloatingPortal";
import { useKoenigStrings } from "../options";

// Editing controls for the table card: add and remove rows and columns, the header row, and
// removing the table. They show above the table while the cursor is in it, as a toolbar the
// keyboard can reach. Tables stay simple: no merged cells, no cell colours.

const isHeaderRow = (table: TableNode): boolean => {
  const first = table.getFirstChild();
  if (!$isTableRowNode(first)) return false;
  const cell = first.getFirstChild();
  return $isTableCellNode(cell) && (cell.getHeaderStyles() & TableCellHeaderStates.ROW) !== 0;
};

/** The table the cursor is in, or null. */
const $tableAtCursor = (): TableNode | null => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  return $findTableNode(selection.anchor.getNode());
};

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

interface Anchor {
  header: boolean;
  key: NodeKey;
}

export const TableActionsPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const strings = useKoenigStrings();
  const labels = strings.table;
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  useCellScope();

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          const table = editor.isEditable() ? $tableAtCursor() : null;
          const next = table ? { header: isHeaderRow(table), key: table.getKey() } : null;
          setAnchor((current) => {
            if (!next || !current) return next;
            return current.key === next.key && current.header === next.header ? current : next;
          });
        });
      }),
    [editor],
  );

  // Alt+F10 moves focus into the controls from the cell; Escape sends it back to the cell.
  useEffect(() => {
    if (!anchor) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === "F10") {
        event.preventDefault();
        document.querySelector<HTMLElement>("[data-kg-table-toolbar] button")?.focus();
      } else if (
        event.key === "Escape" &&
        (event.target as Element | null)?.closest?.("[data-kg-table-toolbar]")
      ) {
        event.preventDefault();
        editor.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [anchor, editor]);

  const place = useCallback(() => {
    if (!anchor) return;
    const element = editor.getElementByKey(anchor.key);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setStyle({ left: Math.max(rect.left, 8), opacity: 1, top: Math.max(rect.top - 44, 8) });
  }, [anchor, editor]);

  useEffect(() => {
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  if (!anchor) return null;

  const run = (change: () => void) => () => {
    editor.update(change, { discrete: true });
  };

  const buttons: [string, string, () => void][] = [
    ["add-row-above", labels.addRowAbove, () => $insertTableRowAtSelection(false)],
    ["add-row-below", labels.addRowBelow, () => $insertTableRowAtSelection(true)],
    ["add-column-left", labels.addColumnLeft, () => $insertTableColumnAtSelection(false)],
    ["add-column-right", labels.addColumnRight, () => $insertTableColumnAtSelection(true)],
    ["delete-row", labels.deleteRow, () => $deleteTableRowAtSelection()],
    ["delete-column", labels.deleteColumn, () => $deleteTableColumnAtSelection()],
    [
      "toggle-header-row",
      labels.headerRow,
      () => {
        const table = $tableAtCursor();
        if (table) $setTableRowIsHeader(table, 0, !isHeaderRow(table));
      },
    ],
    [
      "delete-table",
      labels.deleteTable,
      () => {
        const table = $tableAtCursor();
        if (!table) return;
        const paragraph = $createParagraphNode();
        table.replace(paragraph);
        paragraph.select();
      },
    ],
  ];

  return (
    <FloatingPortal
      to={(editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement) ?? document.body}
    >
      <div
        aria-label={labels.toolbar}
        className="not-kg-prose fixed z-[9999] flex items-center gap-1 rounded-lg bg-white px-1 py-1 font-sans text-sm text-black shadow-md dark:bg-grey-950 dark:text-white"
        data-kg-table-toolbar
        role="toolbar"
        style={style}
      >
        {buttons.map(([name, label, change]) => (
          <button
            key={name}
            aria-label={label}
            aria-pressed={name === "toggle-header-row" ? anchor.header : undefined}
            className="flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-[1.2rem] font-medium hover:bg-grey-200/80 dark:hover:bg-grey-900"
            data-kg-table-action={name}
            title={label}
            type="button"
            onClick={run(change)}
            onMouseDown={(event) => event.preventDefault()}
          >
            {label}
          </button>
        ))}
      </div>
    </FloatingPortal>
  );
};

export default TableActionsPlugin;
