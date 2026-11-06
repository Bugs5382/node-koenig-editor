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
import { $isTableCellNode, $isTableSelection } from "@lexical/table";
import { $getNearestNodeFromDOMNode, $getSelection } from "lexical";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import { TableActionMenu, type TableMenuSection } from "./TableActionMenu";
import {
  $isTableActionEnabled,
  $readTableState,
  $runTableAction,
  $setCellColor,
  $setTableCaption,
  TABLE_COLORS,
  TABLE_GROUPS,
  type TableActionId,
  type TableGroupId,
} from "./tableActions";
import { useTableCaptions } from "./tableCaption";

// The table editor's controls: a toolbar above the table whose buttons open menus (row, column,
// cell, colour, alignment, width, caption), and the same actions in a right-click menu. Both are
// built from the one action list in tableActions.ts, and both appear only while the editor is
// editable, so the reader's view has none of it. A live region says where the cursor is.

interface Snapshot {
  align: string;
  caption: string;
  cellKey: string;
  color: string | null;
  colSpan: number;
  column: number;
  columns: number;
  enabled: Partial<Record<TableActionId, boolean>>;
  headerColumn: boolean;
  headerRow: boolean;
  isRange: boolean;
  row: number;
  rowSpan: number;
  rows: number;
  tableKey: string;
  verticalAlign: string;
}

const ALL_ACTIONS = TABLE_GROUPS.flatMap((group) => group.actions);

const $snapshot = (): Snapshot | null => {
  const state = $readTableState();
  const cell = state?.cells[0];
  if (!state || !cell) return null;
  const enabled: Snapshot["enabled"] = {};
  for (const id of ALL_ACTIONS) enabled[id] = $isTableActionEnabled(id, state);
  return {
    align: state.align,
    caption: state.caption,
    cellKey: cell.getKey(),
    color: state.color === "mixed" ? null : state.color,
    colSpan: cell.getColSpan(),
    column: state.column,
    columns: state.columns,
    enabled,
    headerColumn: state.headerColumn,
    headerRow: state.headerRow,
    isRange: state.isRange,
    row: state.row,
    rowSpan: cell.getRowSpan(),
    rows: state.rows,
    tableKey: state.table.getKey(),
    verticalAlign: state.verticalAlign,
  };
};

type Strings = ReturnType<typeof useKoenigStrings>["table"];

const labelOf = (id: TableActionId, t: Strings): string =>
  ({
    alignCenter: t.alignCenter,
    alignLeft: t.alignLeft,
    alignRight: t.alignRight,
    columnLeft: t.addColumnLeft,
    columnRight: t.addColumnRight,
    deleteColumn: t.deleteColumn,
    deleteRow: t.deleteRow,
    deleteTable: t.deleteTable,
    headerColumn: t.headerColumn,
    headerRow: t.headerRow,
    merge: t.mergeCells,
    moveColumnLeft: t.moveColumnLeft,
    moveColumnRight: t.moveColumnRight,
    moveRowDown: t.moveRowDown,
    moveRowUp: t.moveRowUp,
    rowAbove: t.addRowAbove,
    rowBelow: t.addRowBelow,
    split: t.splitCell,
    valignBottom: t.alignBottom,
    valignMiddle: t.alignMiddle,
    valignTop: t.alignTop,
    widthAuto: t.widthAuto,
    widthMedium: t.widthMedium,
    widthNarrow: t.widthNarrow,
    widthWide: t.widthWide,
  })[id];

const fill = (template: string, values: Record<string, number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

type MenuGroup = TableGroupId | "caption" | "colour";

const TOOLBAR: readonly MenuGroup[] = [
  "row",
  "column",
  "cell",
  "colour",
  "align",
  "width",
  "caption",
  "table",
];

export const TableEditorPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const strings = useKoenigStrings();
  const t = strings.table;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const [open, setOpen] = useState<{ group: MenuGroup; left: number; top: number } | null>(null);
  const [context, setContext] = useState<{ left: number; top: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const last = useRef<string>("");
  useTableCaptions();

  // Follow the cursor: what cell and table it is in, and what can be done there.
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        const next = editorState.read(() => (editor.isEditable() ? $snapshot() : null));
        const key = JSON.stringify(next);
        if (key === last.current) return;
        last.current = key;
        setSnapshot(next);
      }),
    [editor],
  );

  // A person who moves to another cell hears where they are; a merged cell says what it spans.
  useEffect(() => {
    if (!snapshot) {
      setAnnouncement("");
      return;
    }
    const where = fill(t.positionAnnouncement, {
      column: snapshot.column + 1,
      columns: snapshot.columns,
      row: snapshot.row + 1,
      rows: snapshot.rows,
    });
    const span =
      snapshot.rowSpan > 1 || snapshot.colSpan > 1
        ? `, ${fill(t.spanAnnouncement, { colSpan: snapshot.colSpan, rowSpan: snapshot.rowSpan })}`
        : "";
    setAnnouncement(`${where}${span}`);
  }, [
    snapshot?.cellKey,
    snapshot?.row,
    snapshot?.column,
    snapshot?.rowSpan,
    snapshot?.colSpan,
    snapshot?.rows,
    snapshot?.columns,
  ]);

  const place = useCallback(() => {
    if (!snapshot) return;
    const element = editor.getElementByKey(snapshot.tableKey);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    setStyle({ left: Math.max(rect.left, 8), opacity: 1, top: Math.max(rect.top - 44, 8) });
  }, [snapshot?.tableKey]);

  useEffect(() => {
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  const closeAll = useCallback(() => {
    setOpen(null);
    setContext(null);
  }, []);

  const run = useCallback(
    (change: () => void) => {
      editor.update(change, { discrete: true });
      closeAll();
      editor.focus();
    },
    [closeAll, editor],
  );

  // Alt+F10 moves focus into the toolbar from the cell; Escape closes a menu, then returns to the cell.
  useEffect(() => {
    if (!snapshot) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === "F10") {
        event.preventDefault();
        document.querySelector<HTMLElement>("[data-kg-table-toolbar] button")?.focus();
      } else if (event.key === "Escape") {
        const target = event.target as Element | null;
        if (target?.closest?.("[data-kg-table-toolbar], [data-kg-table-popover]")) {
          event.preventDefault();
          closeAll();
          editor.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeAll, editor, snapshot]);

  // A press outside the controls closes an open menu.
  useEffect(() => {
    if (!open && !context) return undefined;
    const onDown = (event: MouseEvent) => {
      if (
        !(event.target as Element).closest(
          "[data-kg-table-toolbar], [data-kg-table-menu], [data-kg-table-popover]",
        )
      ) {
        closeAll();
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [closeAll, context, open]);

  // The right-click menu (and the keyboard's menu key): put the cursor in the cell that was
  // pressed, unless it is already inside the selected range, then show every action.
  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return undefined;
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!editor.isEditable() || !target?.closest("td, th")) return;
      event.preventDefault();
      let at = { left: event.clientX, top: event.clientY };
      editor.update(
        () => {
          const node = $getNearestNodeFromDOMNode(target);
          const cell = node ? $findMatchingParent(node, $isTableCellNode) : null;
          if (!cell) return;
          const selection = $getSelection();
          const inRange = $isTableSelection(selection) && selection.getNodes().includes(cell);
          if (!inRange) cell.selectStart();
          if (at.left === 0 && at.top === 0) {
            const rect = editor.getElementByKey(cell.getKey())?.getBoundingClientRect();
            if (rect) at = { left: rect.left + 8, top: rect.bottom };
          }
        },
        { discrete: true },
      );
      setOpen(null);
      setContext(at);
    };
    root.addEventListener("contextmenu", onContextMenu);
    return () => root.removeEventListener("contextmenu", onContextMenu);
  }, [editor]);

  const sectionsFor = useCallback(
    (groups: readonly MenuGroup[]): TableMenuSection[] => {
      if (!snapshot) return [];
      const sections: TableMenuSection[] = [];
      for (const group of groups) {
        if (group === "colour") {
          sections.push({
            items: [
              ...TABLE_COLORS.map((colour) => ({
                checked: snapshot.color === colour.value,
                id: `colour-${colour.name}`,
                kind: "radio" as const,
                label: t.colours[colour.name as keyof Strings["colours"]],
                onSelect: () => run(() => $setCellColor(colour.value)),
                swatch: colour.value,
              })),
              {
                checked: snapshot.color === null,
                id: "colour-none",
                kind: "radio" as const,
                label: t.noColour,
                onSelect: () => run(() => $setCellColor(null)),
              },
            ],
            label: t.colourMenu,
          });
          continue;
        }
        if (group === "caption") {
          sections.push({
            items: [
              {
                id: "caption",
                label: t.caption,
                onSelect: () => {
                  setContext(null);
                  setOpen((current) => ({
                    group: "caption",
                    left: current?.left ?? 16,
                    top: current?.top ?? 60,
                  }));
                },
              },
            ],
          });
          continue;
        }
        const def = TABLE_GROUPS.find((entry) => entry.id === group);
        if (!def) continue;
        const kindOf = (id: TableActionId) =>
          id === "headerRow" || id === "headerColumn"
            ? ("checkbox" as const)
            : group === "align"
              ? ("radio" as const)
              : ("item" as const);
        const checkedOf = (id: TableActionId) =>
          id === "headerRow"
            ? snapshot.headerRow
            : id === "headerColumn"
              ? snapshot.headerColumn
              : id === "alignLeft"
                ? snapshot.align === "left"
                : id === "alignCenter"
                  ? snapshot.align === "center"
                  : id === "alignRight"
                    ? snapshot.align === "right"
                    : id === "valignTop"
                      ? snapshot.verticalAlign === "top"
                      : id === "valignMiddle"
                        ? snapshot.verticalAlign === "middle"
                        : id === "valignBottom"
                          ? snapshot.verticalAlign === "bottom"
                          : undefined;
        const toItem = (id: TableActionId) => ({
          checked: checkedOf(id),
          disabled: snapshot.enabled[id] === false,
          id,
          kind: kindOf(id),
          label: labelOf(id, t),
          onSelect: () => run(() => $runTableAction(id)),
        });
        if (group === "align") {
          sections.push({ items: def.actions.slice(0, 3).map(toItem), label: t.alignMenu });
          sections.push({ items: def.actions.slice(3).map(toItem) });
        } else {
          sections.push({ items: def.actions.map(toItem) });
        }
      }
      return sections;
    },
    [run, snapshot, t],
  );

  const groupLabel = (group: MenuGroup): string =>
    ({
      align: t.alignMenu,
      caption: t.caption,
      cell: t.cellMenu,
      colour: t.colourMenu,
      column: t.columnMenu,
      row: t.rowMenu,
      table: t.deleteTable,
      width: t.widthMenu,
    })[group];

  const target = useMemo(
    () =>
      (editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement | null) ?? document.body,
    [editor, snapshot !== null],
  );

  if (!snapshot) return null;

  const onToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>("button")];
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const to =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : index + (event.key === "ArrowRight" ? 1 : -1);
    buttons[(to + buttons.length) % buttons.length]?.focus();
  };

  return (
    <FloatingPortal to={target}>
      <div
        aria-label={t.toolbar}
        className="not-kg-prose fixed z-[9999] flex items-center gap-1 rounded-lg bg-white px-1 py-1 font-sans text-sm text-black shadow-md dark:bg-grey-950 dark:text-white"
        data-kg-table-toolbar
        role="toolbar"
        style={style}
        onKeyDown={onToolbarKeyDown}
      >
        {TOOLBAR.map((group, index) => {
          const direct = group === "table";
          return (
            <button
              key={group}
              aria-expanded={direct ? undefined : open?.group === group}
              aria-haspopup={direct ? undefined : group === "caption" ? "dialog" : "menu"}
              aria-label={groupLabel(group)}
              className="flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-[1.2rem] font-medium hover:bg-grey-200/80 focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900"
              data-kg-table-action={direct ? "delete-table" : undefined}
              data-kg-table-group={group}
              tabIndex={index === 0 ? 0 : -1}
              title={groupLabel(group)}
              type="button"
              onClick={(event) => {
                if (direct) {
                  run(() => $runTableAction("deleteTable"));
                  return;
                }
                const rect = event.currentTarget.getBoundingClientRect();
                setContext(null);
                setOpen((current) =>
                  current?.group === group
                    ? null
                    : { group, left: rect.left, top: rect.bottom + 4 },
                );
              }}
              onMouseDown={(event) => event.preventDefault()}
              onFocus={(event) => {
                // roving tab stop: the focused button is the one Tab returns to
                for (const other of event.currentTarget.parentElement?.querySelectorAll("button") ??
                  []) {
                  other.tabIndex = other === event.currentTarget ? 0 : -1;
                }
              }}
            >
              {groupLabel(group)}
            </button>
          );
        })}
      </div>
      {open && open.group !== "caption" && open.group !== "table" ? (
        <div className="fixed z-[10000]" style={{ left: open.left, top: open.top }}>
          <TableActionMenu
            label={groupLabel(open.group)}
            sections={sectionsFor([open.group])}
            onClose={() => {
              closeAll();
              editor.focus();
            }}
          />
        </div>
      ) : null}
      {open?.group === "caption" ? (
        <div className="fixed z-[10000]" style={{ left: open.left, top: open.top }}>
          <CaptionField
            caption={snapshot.caption}
            onClose={() => {
              closeAll();
              editor.focus();
            }}
            onCommit={(text) =>
              run(() => {
                const state = $readTableState();
                if (state) $setTableCaption(state.table, text);
              })
            }
          />
        </div>
      ) : null}
      {context ? (
        <div
          className="fixed z-[10000]"
          style={{
            left: Math.min(context.left, window.innerWidth - 220),
            top: Math.min(context.top, window.innerHeight - 340),
          }}
        >
          <TableActionMenu
            label={t.contextMenu}
            sections={sectionsFor(
              ["row", "column", "cell", "colour", "align", "width", "caption", "table"].filter(
                (g) => g !== "table",
              ) as MenuGroup[],
            ).concat({
              items: [
                {
                  id: "deleteTable",
                  label: t.deleteTable,
                  onSelect: () => run(() => $runTableAction("deleteTable")),
                },
              ],
            })}
            onClose={() => {
              closeAll();
              editor.focus();
            }}
          />
        </div>
      ) : null}
      <div aria-live="polite" className="sr-only" data-kg-table-announcer role="status">
        {announcement}
      </div>
    </FloatingPortal>
  );
};

interface CaptionFieldProps {
  caption: string;
  onClose: () => void;
  onCommit: (text: string) => void;
}

const CaptionField = ({ caption, onClose, onCommit }: CaptionFieldProps) => {
  const t = useKoenigStrings().table;
  const [text, setText] = useState(caption);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div
      aria-label={t.caption}
      className="not-kg-prose flex w-[28rem] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white"
      data-kg-table-popover
      role="dialog"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        } else if (event.key === "Enter") {
          event.preventDefault();
          onCommit(text);
        }
      }}
    >
      <input
        ref={input}
        aria-label={t.captionLabel}
        className="w-full rounded-md border border-grey-300 bg-white px-2 py-1 dark:bg-grey-900"
        placeholder={t.captionPlaceholder}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        {caption ? (
          <button
            className="cursor-pointer rounded-md px-2 py-1 hover:bg-grey-200/80 dark:hover:bg-grey-900"
            data-kg-table-caption-remove
            type="button"
            onClick={() => onCommit("")}
          >
            {t.captionRemove}
          </button>
        ) : null}
        <button
          className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-table-caption-done
          type="button"
          onClick={() => onCommit(text)}
        >
          {t.captionDone}
        </button>
      </div>
    </div>
  );
};

export default TableEditorPlugin;
