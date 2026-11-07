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
import { act, cleanup } from "@testing-library/react";
import { $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  $equalColumns,
  $getTableWidthMode,
  $setColumnWidths,
  $setRowHeight,
  $setTableWidthMode,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  resizedWidths,
} from "../src/additions/table/tableResize";
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
  ]);

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $row = (index: number) => $table().getChildAtIndex(index) as TableRowNode;

const load = async () => (await mount({ composer: { initialEditorState: grid() } })).api;
const update = async (api: KoenigEditorAPI, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(fn, { discrete: true });
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: () => T): T =>
  api.editorInstance.getEditorState().read(fn);

describe("resizing columns", () => {
  it("moves one column's border and leaves the table's other columns as they were", () => {
    expect(resizedWidths([100, 200, 300], 1, 40)).toEqual([100, 240, 300]);
    expect(resizedWidths([100, 200, 300], 0, -30)).toEqual([70, 200, 300]);
  });

  it("never goes below the minimum width", () => {
    expect(resizedWidths([100, 200], 0, -500)).toEqual([MIN_COLUMN_WIDTH, 200]);
  });

  it("is saved as the table's column widths and survives a reload", async () => {
    const api = await load();
    await update(api, () => $setColumnWidths($table(), [120, 180, 90]));
    expect(read(api, () => $table().getColWidths())).toEqual([120, 180, 90]);
    expect(JSON.parse(api.serialize()).root.children[0].colWidths).toEqual([120, 180, 90]);
  });

  it("resets to equal columns by forgetting the widths", async () => {
    const api = await load();
    await update(api, () => $setColumnWidths($table(), [120, 180, 90]));
    await update(api, () => $equalColumns($table()));
    expect(read(api, () => $table().getColWidths())).toBeUndefined();
  });
});

describe("resizing rows", () => {
  it("sets a row's height as a minimum and keeps it in the document", async () => {
    const api = await load();
    await update(api, () => $setRowHeight($row(1), 80));
    expect(read(api, () => $row(1).getHeight())).toBe(80);
    expect(JSON.parse(api.serialize()).root.children[0].children[1].height).toBe(80);
  });

  it("never goes below the minimum height, and clears with null", async () => {
    const api = await load();
    await update(api, () => $setRowHeight($row(1), 3));
    expect(read(api, () => $row(1).getHeight())).toBe(MIN_ROW_HEIGHT);
    await update(api, () => $setRowHeight($row(1), null));
    expect(read(api, () => $row(1).getHeight())).toBeUndefined();
  });
});

describe("the table's width", () => {
  it("is full width by default, and can be fit to its text or fixed, saved on the table", async () => {
    const api = await load();
    expect(read(api, () => $getTableWidthMode($table()))).toBe("full");
    await update(api, () => $setTableWidthMode($table(), "fit"));
    expect(read(api, () => $getTableWidthMode($table()))).toBe("fit");
    const reloaded = (await mount({ composer: { initialEditorState: api.serialize() } })).api;
    expect(read(reloaded, () => $getTableWidthMode($table()))).toBe("fit");
    await update(reloaded, () => $setTableWidthMode($table(), "full"));
    // full is the default, so nothing extra is stored for it
    expect(reloaded.serialize()).not.toContain("kgTableWidth");
  });
});
