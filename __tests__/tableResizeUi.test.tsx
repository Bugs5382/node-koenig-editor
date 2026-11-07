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
import { $isTableNode, type TableCellNode, type TableNode } from "@lexical/table";
import { act, cleanup, fireEvent } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { $runTableAction } from "../src/additions/table/tableActions";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const grid = () =>
  documentWith([
    row(
      { headerState: 1, text: "A" },
      { headerState: 1, text: "B" },
      { headerState: 1, text: "C" },
    ),
    row({ text: "1" }, { text: "2" }, { text: "3" }),
  ]);

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cell = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;

const load = async () => (await mount({ composer: { initialEditorState: grid() } })).api;

const select = async (
  api: KoenigEditorAPI,
  r: number,
  c: number,
  action: "selectColumn" | "selectRow",
) => {
  await act(async () => {
    api.editorInstance.update(
      () => {
        $cell(r, c).selectStart();
        $runTableAction(action);
      },
      { discrete: true },
    );
  });
};

const key = async (api: KoenigEditorAPI, name: string, extra: Record<string, boolean> = {}) => {
  await act(async () => {
    fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
      altKey: true,
      key: name,
      ...extra,
    });
  });
};

const widths = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => $table().getColWidths());
const height = (api: KoenigEditorAPI, r: number) =>
  api.editorInstance
    .getEditorState()
    .read(() =>
      ($table().getChildAtIndex(r) as unknown as { getHeight(): number | undefined }).getHeight(),
    );

// jsdom has no hit testing; the plus-button plugin asks for the element under the pointer
beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

describe("resizing from the keyboard, with a column or row selected", () => {
  it("Alt+Right and Alt+Left widen and narrow the selected column by 10 pixels", async () => {
    const api = await load();
    await select(api, 1, 1, "selectColumn");
    await key(api, "ArrowRight");
    // the border moves between this column and the next, so the table keeps its width
    expect(widths(api)).toEqual([75, 85, 65]);
    await key(api, "ArrowLeft");
    await key(api, "ArrowLeft");
    expect(widths(api)).toEqual([75, 65, 85]);
  });

  it("Shift makes the step 40, and the width never goes under the minimum", async () => {
    const api = await load();
    await select(api, 1, 0, "selectColumn");
    await key(api, "ArrowRight", { shiftKey: true });
    // 40 more, but the next column stops at its minimum
    expect(widths(api)).toEqual([110, 40, 75]);
    for (let i = 0; i < 8; i += 1) await key(api, "ArrowLeft", { shiftKey: true });
    expect(widths(api)![0]).toBe(40);
  });

  it("Alt+Down and Alt+Up make the selected row taller and shorter", async () => {
    const api = await load();
    await select(api, 1, 0, "selectRow");
    await key(api, "ArrowDown");
    const taller = height(api, 1)!;
    expect(taller).toBeGreaterThan(24);
    await key(api, "ArrowUp");
    expect(height(api, 1)).toBeLessThan(taller);
  });

  it("does nothing when the cursor is just in a cell, so Alt+Arrow keeps moving by word", async () => {
    const api = await load();
    await act(async () => {
      api.editorInstance.update(() => $cell(1, 1).selectStart(), { discrete: true });
    });
    await key(api, "ArrowRight");
    expect(widths(api)).toBeUndefined();
  });

  it("says the new size to a screen reader", async () => {
    const api = await load();
    await select(api, 1, 1, "selectColumn");
    await key(api, "ArrowRight");
    expect(document.querySelector("[data-kg-table-resize-status]")?.textContent).toMatch(
      /Column 2.*pixels/,
    );
  });
});

describe("resizing by dragging a border", () => {
  const withLayout = (api: KoenigEditorAPI) => {
    const cells = [...document.querySelectorAll("tr:first-child th")] as HTMLElement[];
    cells.forEach((cell, index) => {
      vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({
        bottom: 40,
        height: 40,
        left: index * 100,
        right: index * 100 + 100,
        top: 0,
        width: 100,
        x: index * 100,
        y: 0,
        toJSON: () => ({}),
      });
    });
    return { api, cells };
  };

  it("drags a column's right border and saves the new widths", async () => {
    const api = await load();
    const { cells } = withLayout(api);
    await act(async () => {
      fireEvent.mouseMove(cells[0]!, { clientX: 97, clientY: 20 });
    });
    expect((api.editorInstance.getRootElement() as HTMLElement).style.cursor).toBe("col-resize");
    await act(async () => {
      fireEvent.mouseDown(cells[0]!, { button: 0, clientX: 97, clientY: 20 });
    });
    await act(async () => {
      fireEvent.mouseMove(window, { clientX: 137, clientY: 20 });
    });
    expect(document.querySelector("[data-kg-table-resize-tip]")?.textContent).toContain("140");
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 137, clientY: 20 });
    });
    expect(widths(api)).toEqual([140, 60, 100]);
    expect(document.querySelector("[data-kg-table-resize-tip]")).toBeNull();
  });

  it("does not start a drag away from a border, or when the editor is read-only", async () => {
    const api = await load();
    const { cells } = withLayout(api);
    await act(async () => {
      fireEvent.mouseMove(cells[0]!, { clientX: 50, clientY: 20 });
    });
    expect((api.editorInstance.getRootElement() as HTMLElement).style.cursor).not.toBe(
      "col-resize",
    );
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    await act(async () => {
      fireEvent.mouseMove(cells[0]!, { clientX: 97, clientY: 20 });
    });
    expect((api.editorInstance.getRootElement() as HTMLElement).style.cursor).not.toBe(
      "col-resize",
    );
  });
});
