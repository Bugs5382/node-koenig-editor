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
import { act, cleanup } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  $applyBorders,
  $getCellBorders,
  borderCss,
  type BorderEdge,
} from "../src/additions/table/tableBorders";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const grid = () =>
  documentWith([
    row({ text: "1" }, { text: "2" }, { text: "3" }),
    row({ text: "4" }, { text: "5" }, { text: "6" }),
    row({ text: "7" }, { text: "8" }, { text: "9" }),
  ]);

const load = async () => (await mount({ composer: { initialEditorState: grid() } })).api;
const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cell = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;
const update = async (api: KoenigEditorAPI, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(fn, { discrete: true });
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: () => T) =>
  api.editorInstance.getEditorState().read(fn);

const dashed: BorderEdge = { color: "#C0392B", style: "dashed", width: "thick" };

describe("table borders", () => {
  it("sets all four sides of one cell, and the neighbours' matching sides", async () => {
    const api = await load();
    await update(api, () => $applyBorders($table(), [$cell(1, 1)], "all", dashed));
    expect(read(api, () => Object.keys($getCellBorders($cell(1, 1))).sort())).toEqual([
      "bottom",
      "left",
      "right",
      "top",
    ]);
    // the cell to the right gets the matching left side, so the shared line looks the same
    expect(read(api, () => $getCellBorders($cell(1, 2)).left)).toEqual(dashed);
    expect(read(api, () => $getCellBorders($cell(0, 1)).bottom)).toEqual(dashed);
    expect(read(api, () => $getCellBorders($cell(0, 0)))).toEqual({});
  });

  it("outer edges of a range draw its box and leave the lines inside alone", async () => {
    const api = await load();
    await update(api, () =>
      $applyBorders(
        $table(),
        [$cell(0, 0), $cell(0, 1), $cell(1, 0), $cell(1, 1)],
        "outer",
        dashed,
      ),
    );
    expect(read(api, () => $getCellBorders($cell(0, 0)))).toEqual({ left: dashed, top: dashed });
    expect(read(api, () => $getCellBorders($cell(1, 1)))).toEqual({
      bottom: dashed,
      right: dashed,
    });
    // the cells just outside the range share the box's far lines
    expect(read(api, () => $getCellBorders($cell(2, 0)).top)).toEqual(dashed);
    expect(read(api, () => $getCellBorders($cell(0, 2)).left)).toEqual(dashed);
  });

  it("inner edges of a range draw the lines between its cells only", async () => {
    const api = await load();
    await update(api, () =>
      $applyBorders(
        $table(),
        [$cell(0, 0), $cell(0, 1), $cell(1, 0), $cell(1, 1)],
        "inner",
        dashed,
      ),
    );
    expect(read(api, () => $getCellBorders($cell(0, 0)))).toEqual({
      bottom: dashed,
      right: dashed,
    });
    expect(read(api, () => $getCellBorders($cell(1, 1)))).toEqual({ left: dashed, top: dashed });
    expect(read(api, () => $getCellBorders($cell(2, 2)))).toEqual({});
  });

  it("removes borders back to the default when given none", async () => {
    const api = await load();
    await update(api, () => $applyBorders($table(), [$cell(1, 1)], "all", dashed));
    await update(api, () => $applyBorders($table(), [$cell(1, 1)], "all", null));
    expect(read(api, () => $getCellBorders($cell(1, 1)))).toEqual({});
    expect(read(api, () => $getCellBorders($cell(1, 2)))).toEqual({});
  });

  it("describes an edge as CSS", () => {
    expect(borderCss(dashed)).toBe("4px dashed #C0392B");
    expect(borderCss({ color: null, style: "solid", width: "thin" })).toBe(
      "1px solid var(--kg-table-border-color, #7C8B9A)",
    );
    expect(borderCss({ color: null, style: "none", width: "medium" })).toBe("none");
  });
});
