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
import { $isTableCellNode, $isTableSelection, type TableRowNode } from "@lexical/table";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $setSelection,
  type BaseSelection,
} from "lexical";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FigureEntry } from "../figure/FigureEntry";
import type { Figure } from "../figure/figure";
import { useKoenigStrings } from "../options";
import { AnchoredMenu } from "../placement/AnchoredMenu";
import { FloatingPortal } from "../placement/FloatingPortal";
import { TableActionMenu, type TableMenuSection } from "./TableActionMenu";
import {
  $isTableActionEnabled,
  $readTableState,
  $runTableAction,
  $setCellColor,
  $cellsInScope,
  $getTableFigure,
  $setTableFigure,
  TABLE_CELL_INK,
  TABLE_COLORS,
  TABLE_GROUPS,
  TABLE_SCOPES,
  type TableActionId,
  type TableGroupId,
  type TableScope,
} from "./tableActions";
import {
  $applyBorders,
  BORDER_STYLES,
  BORDER_WIDTHS,
  type BorderStyle,
  type BorderWhere,
  type BorderWidth,
} from "./tableBorders";
import { useTableCaptions } from "./tableCaption";
import {
  $equalColumns,
  $getTableWidthMode,
  $setColumnWidths,
  $setRowHeight,
  $setTableWidthMode,
  DEFAULT_COLUMN_WIDTH,
  measureWidths,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  type TableWidthMode,
} from "./tableResize";

// The table editor's controls: a toolbar above the table whose buttons open menus (row, column,
// cell, colour, alignment, width, caption), and the same actions in a right-click menu. Both are
// built from the one action list in tableActions.ts, and both appear only while the editor is
// editable, so the reader's view has none of it. A live region says where the cursor is.

interface Snapshot {
  align: string;
  figure: Figure | null;
  cellKey: string;
  color: string | null;
  colSpan: number;
  columnWidth: number | null;
  column: number;
  columns: number;
  enabled: Partial<Record<TableActionId, boolean>>;
  headerColumn: boolean;
  headerRow: boolean;
  isRange: boolean;
  row: number;
  rowHeight: number | null;
  rowSpan: number;
  rows: number;
  tableKey: string;
  verticalAlign: string;
  widthMode: TableWidthMode;
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
    figure: $getTableFigure(state.table),
    cellKey: cell.getKey(),
    color: state.color === "mixed" ? null : state.color,
    colSpan: cell.getColSpan(),
    columnWidth: state.table.getColWidths()?.[state.column] ?? null,
    column: state.column,
    columns: state.columns,
    enabled,
    headerColumn: state.headerColumn,
    headerRow: state.headerRow,
    isRange: state.isRange,
    row: state.row,
    rowHeight: (state.table.getChildAtIndex(state.row) as TableRowNode | null)?.getHeight() ?? null,
    rowSpan: cell.getRowSpan(),
    rows: state.rows,
    tableKey: state.table.getKey(),
    verticalAlign: state.verticalAlign,
    widthMode: $getTableWidthMode(state.table),
  };
};

type Strings = ReturnType<typeof useKoenigStrings>["table"];

const labelOf = (id: TableActionId, t: Strings): string =>
  ({
    alignCenter: t.alignCenter,
    alignJustify: t.alignJustify,
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
    selectColumn: t.selectColumn,
    selectRow: t.selectRow,
    selectTable: t.selectTable,
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

type MenuGroup = TableGroupId | "borders" | "caption" | "colour" | "size";

const TOOLBAR: readonly MenuGroup[] = [
  "row",
  "column",
  "cell",
  "colour",
  "align",
  "width",
  "size",
  "borders",
  "caption",
  "table",
];

// A menu or popover that hangs from a point (the button it opened from, or where the pointer was):
// the editor's floating-layer placement keeps it inside the window and flips it above when there is
// no room below.
const PointMenu = ({
  at,
  children,
}: {
  at: { left: number; top: number };
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useMemo(
    () =>
      ({
        getBoundingClientRect: () => ({
          bottom: at.top,
          height: 0,
          left: at.left,
          right: at.left,
          top: at.top,
          width: 0,
          x: at.left,
          y: at.top,
          toJSON: () => ({}),
        }),
      }) as unknown as Element,
    [at.left, at.top],
  );
  return (
    <AnchoredMenu anchor={anchor} containerRef={ref} measure="whole">
      {children}
    </AnchoredMenu>
  );
};

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
  const barRef = useRef<HTMLDivElement>(null);
  // While a menu is open focus is in the menu, which can change the editor's selection (a range
  // of cells would collapse). The toolbar then keeps what it saw when the menu opened, and an
  // action puts that selection back before it runs.
  const frozen = useRef(false);
  const savedSelection = useRef<BaseSelection | null>(null);
  useTableCaptions();

  // Follow the cursor: what cell and table it is in, and what can be done there.
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        if (frozen.current) return;
        savedSelection.current = editorState.read(() => $getSelection()?.clone() ?? null);
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
    // inside the window, whatever the toolbar's width (it wraps on a narrow window)
    const width = barRef.current?.offsetWidth ?? 0;
    const left = Math.min(Math.max(rect.left, 8), Math.max(window.innerWidth - width - 8, 8));
    setStyle({ left, opacity: 1, top: Math.max(rect.top - 44, 8) });
  }, [snapshot?.tableKey]);

  useEffect(() => {
    place();
    // once more after the toolbar has been drawn, when its width is known
    const frame = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [place]);

  const focusEditor = useCallback(() => {
    editor.focus();
    // a menu that closes took the focus with it when React removed it, after the call above: put
    // the focus back once it is gone, so the next key (an arrow, Alt with an arrow) reaches the table
    requestAnimationFrame(() => {
      const root = editor.getRootElement();
      if (root && !root.contains(document.activeElement)) root.focus({ preventScroll: true });
    });
  }, [editor]);

  const closeAll = useCallback(() => {
    frozen.current = false;
    setOpen(null);
    setContext(null);
  }, []);

  const run = useCallback(
    (change: () => void) => {
      const saved = savedSelection.current;
      frozen.current = false;
      editor.update(
        () => {
          if (saved) $setSelection(saved.clone());
          change();
        },
        { discrete: true },
      );
      closeAll();
      focusEditor();
    },
    [closeAll, editor, focusEditor],
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
          focusEditor();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeAll, editor, focusEditor, snapshot]);

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
      frozen.current = true;
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
        if (group === "borders") {
          sections.push({
            items: [
              {
                id: "borders",
                label: t.bordersMenu,
                onSelect: () => {
                  frozen.current = true;
                  setContext(null);
                  setOpen((current) => ({
                    group: "borders",
                    left: current?.left ?? 16,
                    top: current?.top ?? 60,
                  }));
                },
              },
            ],
          });
          continue;
        }
        if (group === "size") {
          sections.push({
            items: [
              {
                id: "size",
                label: t.sizeMenu,
                onSelect: () => {
                  frozen.current = true;
                  setContext(null);
                  setOpen((current) => ({
                    group: "size",
                    left: current?.left ?? 16,
                    top: current?.top ?? 60,
                  }));
                },
              },
            ],
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
                  frozen.current = true;
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
                    : id === "alignJustify"
                      ? snapshot.align === "justify"
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
          sections.push({ items: def.actions.slice(0, 4).map(toItem), label: t.alignMenu });
          sections.push({ items: def.actions.slice(4).map(toItem) });
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
      borders: t.bordersMenu,
      caption: t.caption,
      cell: t.cellMenu,
      colour: t.colourMenu,
      column: t.columnMenu,
      row: t.rowMenu,
      size: t.sizeMenu,
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
        className="not-kg-prose fixed z-[9999] flex max-w-[96vw] flex-wrap items-center gap-1 rounded-lg bg-white px-1 py-1 font-sans text-sm text-black shadow-md dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
        ref={barRef}
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
              aria-haspopup={
                direct
                  ? undefined
                  : group === "caption" || group === "size" || group === "borders"
                    ? "dialog"
                    : "menu"
              }
              aria-label={groupLabel(group)}
              className="flex h-8 cursor-pointer items-center justify-center rounded-md px-2 text-[1.2rem] font-medium hover:bg-grey-200/80 focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900 forced-colors:focus-visible:outline forced-colors:focus-visible:outline-2"
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
                // under the whole toolbar, which has wrapped to several rows on a narrow window
                const bottom = barRef.current?.getBoundingClientRect().bottom ?? rect.bottom;
                frozen.current = open?.group !== group;
                setContext(null);
                setOpen((current) =>
                  current?.group === group ? null : { group, left: rect.left, top: bottom + 4 },
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
      {open &&
      open.group !== "borders" &&
      open.group !== "caption" &&
      open.group !== "size" &&
      open.group !== "table" ? (
        <PointMenu at={open}>
          <TableActionMenu
            label={groupLabel(open.group)}
            sections={sectionsFor([open.group])}
            onClose={() => {
              closeAll();
              focusEditor();
            }}
          />
        </PointMenu>
      ) : null}
      {open?.group === "borders" ? (
        <PointMenu at={open}>
          <BorderFields
            onApply={(values) =>
              run(() => {
                const state = $readTableState();
                if (!state) return;
                $applyBorders(
                  state.table,
                  $cellsInScope(state, values.scope),
                  values.where,
                  values.reset
                    ? null
                    : { color: values.color, style: values.style, width: values.width },
                );
              })
            }
            onClose={() => {
              closeAll();
              focusEditor();
            }}
          />
        </PointMenu>
      ) : null}
      {open?.group === "size" ? (
        <PointMenu at={open}>
          <SizeField
            snapshot={snapshot}
            onClose={() => {
              closeAll();
              focusEditor();
            }}
            onCommit={(values) =>
              run(() => {
                const state = $readTableState();
                if (!state) return;
                const { table } = state;
                if (values.mode !== $getTableWidthMode(table))
                  $setTableWidthMode(table, values.mode);
                if (values.columnWidth !== null && values.columnWidth !== snapshot.columnWidth) {
                  const element = editor.getElementByKey(table.getKey()) as HTMLElement | null;
                  const count = Math.max(table.getColWidths()?.length ?? 0, state.columns);
                  const widths = measureWidths(element, table.getColWidths(), count);
                  widths[state.column] = values.columnWidth;
                  $setColumnWidths(table, widths);
                }
                if (values.rowHeight !== null && values.rowHeight !== snapshot.rowHeight) {
                  const rowNode = table.getChildAtIndex(state.row) as TableRowNode | null;
                  if (rowNode) $setRowHeight(rowNode, values.rowHeight);
                }
              })
            }
            onEqual={() =>
              run(() => {
                const state = $readTableState();
                if (state) $equalColumns(state.table);
              })
            }
          />
        </PointMenu>
      ) : null}
      {open?.group === "caption" ? (
        <PointMenu at={open}>
          <FigureEntry
            figure={snapshot.figure}
            initialAbove
            initialLabel="Table"
            onClose={() => {
              closeAll();
              focusEditor();
            }}
            onCommit={(figure) =>
              run(() => {
                const state = $readTableState();
                if (state) $setTableFigure(state.table, figure);
              })
            }
          />
        </PointMenu>
      ) : null}
      {context ? (
        <PointMenu at={context}>
          <TableActionMenu
            label={t.contextMenu}
            sections={sectionsFor(
              [
                "row",
                "column",
                "cell",
                "colour",
                "align",
                "width",
                "size",
                "borders",
                "caption",
                "table",
              ].filter((g) => g !== "table") as MenuGroup[],
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
              focusEditor();
            }}
          />
        </PointMenu>
      ) : null}
      <div aria-live="polite" className="sr-only" data-kg-table-announcer role="status">
        {announcement}
      </div>
    </FloatingPortal>
  );
};

interface BorderValues {
  color: string | null;
  reset: boolean;
  scope: TableScope;
  style: BorderStyle;
  where: BorderWhere;
  width: BorderWidth;
}

const BorderFields = ({
  onApply,
  onClose,
}: {
  onApply: (values: BorderValues) => void;
  onClose: () => void;
}) => {
  const t = useKoenigStrings().table;
  const [scope, setScope] = useState<TableScope>("cell");
  const [where, setWhere] = useState<BorderWhere>("all");
  const [style, setStyle] = useState<BorderStyle>("solid");
  const [width, setWidth] = useState<BorderWidth>("thin");
  const [color, setColor] = useState("");
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => first.current?.focus(), []);
  const field = "w-full rounded-md border border-grey-300 bg-white px-2 py-1 dark:bg-grey-900";
  const scopeNames: Record<TableScope, string> = {
    cell: t.bordersScopeCell,
    column: t.bordersScopeColumn,
    row: t.bordersScopeRow,
    table: t.bordersScopeTable,
  };
  const styleNames: Record<BorderStyle, string> = {
    dashed: t.bordersStyleDashed,
    dotted: t.bordersStyleDotted,
    none: t.bordersStyleNone,
    solid: t.bordersStyleSolid,
  };
  const widthNames: Record<BorderWidth, string> = {
    medium: t.bordersMedium,
    thick: t.bordersThick,
    thin: t.bordersThin,
  };
  const values = (reset: boolean): BorderValues => ({
    color: color || null,
    reset,
    scope,
    style,
    where,
    width,
  });
  return (
    <div
      aria-label={t.bordersMenu}
      className="not-kg-prose flex w-[28rem] max-w-[92vw] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
      data-kg-table-popover
      role="dialog"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <label className="flex flex-col gap-1">
        {t.bordersApplyTo}
        <select
          ref={first}
          className={field}
          value={scope}
          onChange={(event) => setScope(event.target.value as TableScope)}
        >
          {TABLE_SCOPES.map((entry) => (
            <option key={entry} value={entry}>
              {scopeNames[entry]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t.bordersLines}
        <select
          className={field}
          value={where}
          onChange={(event) => setWhere(event.target.value as BorderWhere)}
        >
          <option value="all">{t.bordersLinesAll}</option>
          <option value="outer">{t.bordersLinesOuter}</option>
          <option value="inner">{t.bordersLinesInner}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t.bordersStyle}
        <select
          className={field}
          value={style}
          onChange={(event) => setStyle(event.target.value as BorderStyle)}
        >
          {BORDER_STYLES.map((entry) => (
            <option key={entry} value={entry}>
              {styleNames[entry]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t.bordersThickness}
        <select
          className={field}
          value={width}
          onChange={(event) => setWidth(event.target.value as BorderWidth)}
        >
          {BORDER_WIDTHS.map((entry) => (
            <option key={entry} value={entry}>
              {widthNames[entry]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t.bordersColour}
        <select className={field} value={color} onChange={(event) => setColor(event.target.value)}>
          <option value="">{t.bordersColourDefault}</option>
          <option value={TABLE_CELL_INK}>{t.bordersColourInk}</option>
          <option value="#6B7280">{t.bordersColourGrey}</option>
          {TABLE_COLORS.map((entry) => (
            <option key={entry.name} value={entry.value}>
              {t.colours[entry.name as keyof Strings["colours"]]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button
          className="cursor-pointer rounded-md px-2 py-1 hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-table-borders-reset
          type="button"
          onClick={() => onApply(values(true))}
        >
          {t.bordersReset}
        </button>
        <button
          className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-table-borders-apply
          type="button"
          onClick={() => onApply(values(false))}
        >
          {t.bordersApply}
        </button>
      </div>
    </div>
  );
};

interface SizeValues {
  columnWidth: number | null;
  mode: TableWidthMode;
  rowHeight: number | null;
}

interface SizeFieldProps {
  onClose: () => void;
  onCommit: (values: SizeValues) => void;
  onEqual: () => void;
  snapshot: Snapshot;
}

const toNumber = (text: string, minimum: number): number | null => {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? Math.max(Math.round(value), minimum) : null;
};

const SizeField = ({ onClose, onCommit, onEqual, snapshot }: SizeFieldProps) => {
  const t = useKoenigStrings().table;
  const [width, setWidth] = useState(
    snapshot.columnWidth === null ? "" : String(snapshot.columnWidth),
  );
  const [height, setHeight] = useState(
    snapshot.rowHeight === null ? "" : String(snapshot.rowHeight),
  );
  const [mode, setMode] = useState<TableWidthMode>(snapshot.widthMode);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const commit = () =>
    onCommit({
      columnWidth: toNumber(width, MIN_COLUMN_WIDTH),
      mode,
      rowHeight: toNumber(height, MIN_ROW_HEIGHT),
    });
  const field = "w-full rounded-md border border-grey-300 bg-white px-2 py-1 dark:bg-grey-900";
  return (
    <div
      aria-label={t.sizeMenu}
      className="not-kg-prose flex w-[28rem] max-w-[92vw] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
      data-kg-table-popover
      role="dialog"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          commit();
        }
      }}
    >
      <label className="flex flex-col gap-1">
        {t.columnWidthLabel}
        <input
          ref={input}
          className={field}
          inputMode="numeric"
          min={MIN_COLUMN_WIDTH}
          placeholder={String(DEFAULT_COLUMN_WIDTH)}
          type="number"
          value={width}
          onChange={(event) => setWidth(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        {t.rowHeightLabel}
        <input
          className={field}
          inputMode="numeric"
          min={MIN_ROW_HEIGHT}
          type="number"
          value={height}
          onChange={(event) => setHeight(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        {t.tableWidthLabel}
        <select
          className={field}
          value={mode}
          onChange={(event) => setMode(event.target.value as TableWidthMode)}
        >
          <option value="full">{t.tableWidthFull}</option>
          <option value="fit">{t.tableWidthFit}</option>
          <option value="fixed">{t.tableWidthFixed}</option>
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button
          className="cursor-pointer rounded-md px-2 py-1 hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-table-equal-columns
          type="button"
          onClick={onEqual}
        >
          {t.equalColumns}
        </button>
        <button
          className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-table-size-done
          type="button"
          onClick={commit}
        >
          {t.sizeDone}
        </button>
      </div>
    </div>
  );
};

export default TableEditorPlugin;
