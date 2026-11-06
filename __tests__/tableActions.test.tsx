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
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  type TableCellNode,
  type TableNode,
} from "@lexical/table";
import { act, cleanup } from "@testing-library/react";
import { $createParagraphNode, $getRoot, $setSelection, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  $getTableCaption,
  $isTableActionEnabled,
  $readTableState,
  $runTableAction,
  $setCellColor,
  $setTableCaption,
  TABLE_COLORS,
  type TableActionId,
} from "../src/additions/table/tableActions";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const grid = () =>
  documentWith([
    row(
      { headerState: 1, text: "A" },
      { headerState: 1, text: "B" },
      { headerState: 1, text: "C" },
    ),
    row({ text: "1" }, { text: "2" }, { text: "3" }),
    row({ text: "4" }, { text: "5" }, { text: "6" }),
  ]);

const load = async (document_ = grid()) => {
  const { api } = await mount({ composer: { initialEditorState: document_ } });
  return api;
};

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cellAt = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;

/** Runs a function inside an editor update and waits for it to commit. */
const update = async (api: KoenigEditorAPI, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(fn, { discrete: true });
  });
};

const caret = (api: KoenigEditorAPI, r: number, c: number) =>
  update(api, () => $cellAt(r, c).selectStart());

const range = (api: KoenigEditorAPI, from: [number, number], to: [number, number]) =>
  update(api, () => {
    $setSelection($createTableSelectionFrom($table(), $cellAt(...from), $cellAt(...to)));
  });

const run = (api: KoenigEditorAPI, id: TableActionId) => update(api, () => $runTableAction(id));

const enabled = (api: KoenigEditorAPI, id: TableActionId) =>
  api.editorInstance.getEditorState().read(() => $isTableActionEnabled(id));

/** The table as text, one row per line, `[2x1]` marking a merged cell's colSpan x rowSpan. */
const text = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $table()
      .getChildren()
      .filter($isTableRowNode)
      .map((r) =>
        r
          .getChildren()
          .filter($isTableCellNode)
          .map((c) => {
            const span =
              c.getColSpan() > 1 || c.getRowSpan() > 1
                ? `[${c.getColSpan()}x${c.getRowSpan()}]`
                : "";
            return c.getTextContent() + span;
          })
          .join(" "),
      ),
  );

describe("rows and columns", () => {
  it("adds a row above and below the cell the cursor is in", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "rowAbove");
    expect(text(api)).toEqual(["A B C", " ", "1 2 3", "4 5 6"].map((l) => (l === " " ? "  " : l)));
    await caret(api, 3, 0);
    await run(api, "rowBelow");
    expect(text(api)).toHaveLength(5);
    expect(text(api)[3]).toBe("4 5 6");
    expect(text(api)[4]).toBe("  ");
  });

  it("adds a column left and right of the cell the cursor is in", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "columnLeft");
    expect(text(api)[1]).toBe("1  2 3");
    await caret(api, 1, 3);
    await run(api, "columnRight");
    expect(text(api)[1]).toBe("1  2 3 ");
  });

  it("deletes the row, the column or the whole table", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "deleteRow");
    expect(text(api)).toEqual(["A B C", "4 5 6"]);
    await caret(api, 1, 1);
    await run(api, "deleteColumn");
    expect(text(api)).toEqual(["A C", "4 6"]);
    await run(api, "deleteTable");
    expect(
      api.editorInstance.getEditorState().read(() => $getRoot().getChildren().some($isTableNode)),
    ).toBe(false);
  });

  it("moves rows and columns, and says when it cannot", async () => {
    const api = await load();
    await caret(api, 1, 0);
    expect(enabled(api, "moveRowDown")).toBe(true);
    expect(enabled(api, "moveRowUp")).toBe(true);
    await run(api, "moveRowDown");
    expect(text(api)).toEqual(["A B C", "4 5 6", "1 2 3"]);
    await caret(api, 2, 0);
    expect(enabled(api, "moveRowDown")).toBe(false);
    await caret(api, 1, 0);
    await run(api, "moveColumnRight");
    expect(text(api)[1]).toBe("5 4 6");
    await caret(api, 1, 2);
    expect(enabled(api, "moveColumnRight")).toBe(false);
  });

  it("switches the header row and the header column", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "headerColumn");
    const states = () =>
      api.editorInstance
        .getEditorState()
        .read(() => [
          $cellAt(0, 0).getHeaderStyles(),
          $cellAt(1, 0).getHeaderStyles(),
          $cellAt(1, 1).getHeaderStyles(),
        ]);
    expect(states()[1]! & 2).toBe(2);
    expect(states()[2]).toBe(0);
    await run(api, "headerRow");
    expect(states()[0]! & 1).toBe(0);
    await run(api, "headerRow");
    expect(states()[0]! & 1).toBe(1);
    expect(api.editorInstance.getEditorState().read(() => $readTableState()?.headerColumn)).toBe(
      true,
    );
  });

  it("reports nothing when the cursor is not in a table", async () => {
    const api = await load();
    await update(api, () => {
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectStart();
    });
    expect(api.editorInstance.getEditorState().read(() => $readTableState())).toBeNull();
    expect(enabled(api, "rowAbove")).toBe(false);
  });
});

describe("merging and splitting cells", () => {
  it("merges a selected range into one cell and splits it again", async () => {
    const api = await load();
    await range(api, [1, 0], [2, 1]);
    expect(enabled(api, "merge")).toBe(true);
    await run(api, "merge");
    expect(text(api)[1]).toContain("[2x2]");
    expect(text(api)).toHaveLength(3);
    // the cursor is left in the merged cell
    expect(enabled(api, "split")).toBe(true);
    await run(api, "split");
    expect(text(api).join("|")).not.toContain("[");
  });

  it("cannot merge or split a single plain cell", async () => {
    const api = await load();
    await caret(api, 1, 1);
    expect(enabled(api, "merge")).toBe(false);
    expect(enabled(api, "split")).toBe(false);
  });

  it("keeps the merged cell through save and load", async () => {
    const api = await load();
    await range(api, [1, 0], [1, 1]);
    await run(api, "merge");
    const saved = api.serialize();
    expect(JSON.parse(saved).root.children[0].children[1].children[0].colSpan).toBe(2);
    const again = await load(saved);
    expect(text(again)[1]).toContain("[2x1]");
  });
});

describe("formatting cells", () => {
  it("sets and clears a background colour on a range, from the fixed palette", async () => {
    const api = await load();
    await range(api, [1, 0], [2, 1]);
    const green = TABLE_COLORS.find((c) => c.name === "green")!;
    await update(api, () => $setCellColor(green.value));
    const colours = () =>
      api.editorInstance
        .getEditorState()
        .read(() => [
          $cellAt(1, 0).getBackgroundColor(),
          $cellAt(2, 1).getBackgroundColor(),
          $cellAt(1, 2).getBackgroundColor(),
        ]);
    expect(colours()).toEqual([green.value, green.value, null]);
    await update(api, () => $setCellColor(null));
    expect(colours()).toEqual([null, null, null]);
  });

  it("aligns text across and down", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "alignCenter");
    await caret(api, 1, 1);
    await run(api, "valignMiddle");
    await caret(api, 1, 1);
    const read = () =>
      api.editorInstance.getEditorState().read(() => {
        const state = $readTableState();
        return [state?.align, state?.verticalAlign, $cellAt(1, 1).getVerticalAlign()];
      });
    expect(read()).toEqual(["center", "middle", "middle"]);
    expect(
      JSON.stringify(JSON.parse(api.serialize()).root.children[0].children[1].children[1]),
    ).toContain('"format":"center"');
    await caret(api, 1, 1);
    await run(api, "alignLeft");
    await caret(api, 1, 1);
    expect(read()[0]).toBe("left");
  });

  it("sets a column width from the presets and back to automatic", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await run(api, "widthWide");
    const widths = () => api.editorInstance.getEditorState().read(() => $table().getColWidths());
    expect(widths()?.[1]).toBeGreaterThan(200);
    await caret(api, 1, 1);
    await run(api, "widthNarrow");
    expect(widths()?.[1]).toBeLessThan(120);
    await caret(api, 1, 1);
    await run(api, "widthAuto");
    expect(widths()?.[1] ?? 0).toBe(widths()?.[0] ?? 0);
  });

  it("has fixed colours whose dark ink reads at 4.5:1", () => {
    const ink = "#15171A";
    const channel = (v: number) =>
      (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const lum = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return (
        0.2126 * channel((n >> 16) & 255) +
        0.7152 * channel((n >> 8) & 255) +
        0.0722 * channel(n & 255)
      );
    };
    expect(TABLE_COLORS.length).toBeGreaterThanOrEqual(6);
    for (const colour of TABLE_COLORS) {
      const [hi, lo] = [lum(colour.value), lum(ink)].sort((a, b) => b - a) as [number, number];
      expect((hi + 0.05) / (lo + 0.05), colour.name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("the caption", () => {
  it("is stored on the table, saved, loaded and moves with the table", async () => {
    const api = await load();
    await update(api, () => $setTableCaption($table(), "Quarterly totals"));
    expect(api.editorInstance.getEditorState().read(() => $getTableCaption($table()))).toBe(
      "Quarterly totals",
    );
    const saved = api.serialize();
    const again = await load(saved);
    expect(again.editorInstance.getEditorState().read(() => $getTableCaption($table()))).toBe(
      "Quarterly totals",
    );
    await update(again, () => $setTableCaption($table(), ""));
    expect(again.editorInstance.getEditorState().read(() => $getTableCaption($table()))).toBe("");
  });
});
