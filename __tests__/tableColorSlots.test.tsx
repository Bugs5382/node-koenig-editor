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
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const load = async (colors?: Record<string, unknown>) =>
  (
    await mount({
      composer: {
        colors: colors as never,
        initialEditorState: documentWith([
          row({ text: "a" }, { text: "b" }),
          row({ text: "c" }, { text: "d" }),
        ]),
      },
    })
  ).api;

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cell = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;
const caret = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.update(() => $cell(1, 1).selectStart(), { discrete: true });
  });
};
const openGroup = async (name: string) => {
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-table-group="${name}"]`) as Element);
  });
};
const ids = () =>
  [...document.querySelectorAll("[data-kg-table-menu-item]")].map((entry) =>
    entry.getAttribute("data-kg-table-menu-item"),
  );

const HOST = {
  tableBorder: { none: false, palette: [{ label: "Line", value: "#2d4c99" }], picker: false },
  tableCell: {
    none: false,
    palette: [
      { label: "Info", value: "#e5eaf6" },
      { label: "Danger", value: "#f8e3e0" },
    ],
    picker: false,
  },
};

describe("the table's cell colours follow the host's tableCell slot (#104)", () => {
  it("keeps the editor's own eight colours and No colour when the host sets nothing", async () => {
    const api = await load();
    await caret(api);
    await openGroup("colour");
    expect(ids().filter((id) => id?.startsWith("colour-"))).toHaveLength(9);
  });

  it("offers only the host's swatches, with no No colour when the host takes it away", async () => {
    const api = await load(HOST);
    await caret(api);
    await openGroup("colour");
    expect(ids().filter((id) => id?.startsWith("colour-"))).toEqual([
      "colour-Info",
      "colour-Danger",
    ]);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-table-menu-item="colour-Danger"]') as Element);
    });
    expect(api.serialize()).toContain('"backgroundColor":"#f8e3e0"');
  });
});

describe("the table's border colour follows the host's tableBorder slot (#104)", () => {
  it("lists the editor's own colours when the host sets nothing", async () => {
    const api = await load();
    await caret(api);
    await openGroup("borders");
    const options = [...(screen.getByLabelText("Line colour") as HTMLSelectElement).options];
    expect(options.length).toBeGreaterThan(3);
  });

  it("lists only the host's colours, with no default entry when none is taken away", async () => {
    const api = await load(HOST);
    await caret(api);
    await openGroup("borders");
    const options = [...(screen.getByLabelText("Line colour") as HTMLSelectElement).options];
    expect(options.map((option) => option.value)).toEqual(["#2d4c99"]);
  });
});
