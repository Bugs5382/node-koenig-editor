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
  $isTableNode,
  type TableCellNode,
  type TableNode,
} from "@lexical/table";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { $getRoot, $setSelection, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

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

const load = async () => {
  const { api } = await mount({ composer: { initialEditorState: grid() } });
  return api;
};

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cellAt = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;

const caret = async (api: KoenigEditorAPI, r: number, c: number) => {
  await act(async () => {
    api.editorInstance.update(() => $cellAt(r, c).selectStart(), { discrete: true });
  });
};

const range = async (api: KoenigEditorAPI, from: [number, number], to: [number, number]) => {
  await act(async () => {
    api.editorInstance.update(
      () => $setSelection($createTableSelectionFrom($table(), $cellAt(...from), $cellAt(...to))),
      { discrete: true },
    );
  });
};

const group = (name: string) =>
  document.querySelector(`[data-kg-table-group="${name}"]`) as HTMLElement;
const item = (id: string) =>
  document.querySelector(`[data-kg-table-menu-item="${id}"]`) as HTMLElement;
const openGroup = async (name: string) => {
  await act(async () => {
    fireEvent.click(group(name));
  });
};
const pick = async (id: string) => {
  await act(async () => {
    fireEvent.click(item(id));
  });
};
const texts = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $table()
      .getChildren()
      .map((r) =>
        (r as ElementNode)
          .getChildren()
          .map((c) => c.getTextContent())
          .join(" "),
      ),
  );

describe("the table toolbar's menus", () => {
  it("opens a labelled menu whose items have the right roles and states", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("row");
    const menu = screen.getByRole("menu", { name: "Row" });
    expect(menu).toBeTruthy();
    expect(group("row").getAttribute("aria-expanded")).toBe("true");
    const header = item("headerRow");
    expect(header.getAttribute("role")).toBe("menuitemcheckbox");
    expect(header.getAttribute("aria-checked")).toBe("true");
    expect(item("rowAbove").getAttribute("role")).toBe("menuitem");
    // the first available item has focus
    expect(document.activeElement).toBe(item("rowAbove"));
  });

  it("moves through the items with the arrow keys and closes with Escape", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("row");
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(item("rowBelow"));
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(item("headerRow"));
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("marks what cannot be done as disabled", async () => {
    const api = await load();
    await caret(api, 0, 0);
    await openGroup("row");
    expect(item("moveRowUp").getAttribute("aria-disabled")).toBe("true");
    expect(item("moveRowDown").getAttribute("aria-disabled")).toBeNull();
  });

  it("runs an action from a menu and closes it", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("row");
    await pick("moveRowDown");
    expect(texts(api)[2]).toBe("1 2 3");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("merges a selected range from the Cell menu, and offers split afterwards", async () => {
    const api = await load();
    await range(api, [1, 0], [1, 1]);
    await openGroup("cell");
    expect(item("merge").getAttribute("aria-disabled")).toBeNull();
    expect(item("split").getAttribute("aria-disabled")).toBe("true");
    await pick("merge");
    expect(api.serialize()).toContain('"colSpan":2');
    await openGroup("cell");
    expect(item("split").getAttribute("aria-disabled")).toBeNull();
  });

  it("colours a cell from the fixed palette and shows which colour it has", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("colour");
    expect(item("colour-none").getAttribute("aria-checked")).toBe("true");
    await pick("colour-green");
    expect(api.serialize()).toContain('"backgroundColor":"#D4EFDF"');
    await openGroup("colour");
    await waitFor(() => expect(item("colour-green").getAttribute("aria-checked")).toBe("true"));
  });

  it("shows the alignment the cell has", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("align");
    expect(item("alignLeft").getAttribute("aria-checked")).toBe("true");
    await pick("alignRight");
    await openGroup("align");
    await waitFor(() => expect(item("alignRight").getAttribute("aria-checked")).toBe("true"));
  });
});

describe("the right-click menu", () => {
  it("opens on a cell, lists the actions, and puts the cursor in that cell", async () => {
    const api = await load();
    const cell = document.querySelectorAll("tbody td, td, th")[5] as HTMLElement;
    await act(async () => {
      fireEvent.contextMenu(cell, { clientX: 60, clientY: 80 });
    });
    const menu = await screen.findByRole("menu", { name: "Table actions" });
    expect(menu).toBeTruthy();
    for (const id of [
      "rowAbove",
      "columnRight",
      "merge",
      "colour-red",
      "alignCenter",
      "widthWide",
      "caption",
      "deleteTable",
    ]) {
      expect(item(id), id).toBeTruthy();
    }
    await pick("rowBelow");
    expect(texts(api)).toHaveLength(4);
  });

  it("is not offered in the reader's view (a read-only editor)", async () => {
    const api = await load();
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    const cell = document.querySelector("td") as HTMLElement;
    await act(async () => {
      fireEvent.contextMenu(cell);
    });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("toolbar", { name: /table/i })).toBeNull();
  });
});

describe("the caption", () => {
  it("is set from the toolbar and drawn as a caption element in the table", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("caption");
    const input = screen.getByLabelText("Caption text") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "Quarterly totals" } });
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-caption-done]") as Element);
    });
    const caption = document.querySelector("table > caption[data-kg-table-caption]");
    expect(caption?.textContent).toBe("Quarterly totals");
    expect(api.serialize()).toContain("Quarterly totals");
    await caret(api, 1, 1);
    await openGroup("caption");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-caption-remove]") as Element);
    });
    expect(document.querySelector("table > caption")).toBeNull();
  });
});

describe("what a screen reader hears", () => {
  const said = () => document.querySelector("[data-kg-table-announcer]")?.textContent;

  it("says the row and column of the cell the cursor moves to", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await waitFor(() => expect(said()).toBe("Row 2 of 3, column 2 of 3"));
    await caret(api, 2, 0);
    await waitFor(() => expect(said()).toBe("Row 3 of 3, column 1 of 3"));
  });

  it("says what a merged cell spans", async () => {
    const api = await load();
    await range(api, [1, 0], [2, 1]);
    await openGroup("cell");
    await pick("merge");
    await waitFor(() => expect(said()).toContain("spans 2 rows and 2 columns"));
  });

  it("marks the header row and column cells for assistive technology", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await openGroup("column");
    await pick("headerColumn");
    await waitFor(() =>
      expect(document.querySelectorAll("[scope='row']").length).toBeGreaterThan(0),
    );
    expect(document.querySelectorAll("[scope='col']").length).toBeGreaterThan(0);
  });
});
