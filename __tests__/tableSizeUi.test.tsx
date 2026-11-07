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
import { $isTableNode, type TableNode, type TableRowNode } from "@lexical/table";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $getTableWidthMode } from "../src/additions/table/tableResize";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const load = async () =>
  (
    await mount({
      composer: {
        initialEditorState: documentWith(
          [
            row({ text: "a" }, { text: "b" }, { text: "c" }),
            row({ text: "d" }, { text: "e" }, { text: "f" }),
          ],
          [100, 100, 100],
        ),
      },
    })
  ).api;

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const caret = async (api: KoenigEditorAPI, r: number, c: number) => {
  await act(async () => {
    api.editorInstance.update(
      () =>
        (
          ($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as ElementNode
        ).selectStart(),
      { discrete: true },
    );
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: () => T) =>
  api.editorInstance.getEditorState().read(fn);
const open = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-table-group="size"]') as Element);
  });
};
const type = async (label: string, value: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};
const done = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector("[data-kg-table-size-done]") as Element);
  });
};

describe("the size popover", () => {
  it("sets the width of the cursor's column and the height of its row", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await open();
    await type("Column width (pixels)", "180");
    await type("Row height (pixels)", "64");
    await done();
    expect(read(api, () => $table().getColWidths())).toEqual([100, 180, 100]);
    expect(read(api, () => ($table().getChildAtIndex(1) as TableRowNode).getHeight())).toBe(64);
    expect(
      read(api, () => ($table().getChildAtIndex(0) as TableRowNode).getHeight()),
    ).toBeUndefined();
  });

  it("keeps a column no narrower than the minimum and a row no shorter", async () => {
    const api = await load();
    await caret(api, 0, 0);
    await open();
    await type("Column width (pixels)", "5");
    await type("Row height (pixels)", "2");
    await done();
    expect(read(api, () => $table().getColWidths()?.[0])).toBe(40);
    expect(read(api, () => ($table().getChildAtIndex(0) as TableRowNode).getHeight())).toBe(24);
  });

  it("chooses how wide the table is", async () => {
    const api = await load();
    await caret(api, 0, 0);
    expect(read(api, () => $getTableWidthMode($table()))).toBe("full");
    await open();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Table width"), { target: { value: "fixed" } });
    });
    await done();
    expect(read(api, () => $getTableWidthMode($table()))).toBe("fixed");
    expect(document.querySelector("table")?.getAttribute("data-kg-table-width")).toBe("fixed");
    expect((document.querySelector("table") as HTMLElement).style.width).toBe("300px");
  });

  it("makes the columns equal again", async () => {
    const api = await load();
    await caret(api, 0, 0);
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-equal-columns]") as Element);
    });
    expect(read(api, () => $table().getColWidths())).toBeUndefined();
  });

  it("scrolls sideways inside its own box when it is wider than the column", async () => {
    await load();
    const table = document.querySelector("table") as HTMLElement;
    expect(table.parentElement?.classList.contains("kg-table-scroll")).toBe(true);
  });
});
