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
import { $generateHtmlFromNodes } from "@lexical/html";
import { $isTableNode, type TableCellNode, type TableNode } from "@lexical/table";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $getCellBorders } from "../src/additions/table/tableBorders";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const load = async () =>
  (
    await mount({
      composer: {
        initialEditorState: documentWith([
          row({ text: "a" }, { text: "b" }, { text: "c" }),
          row({ text: "d" }, { text: "e" }, { text: "f" }),
        ]),
      },
    })
  ).api;

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cell = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;
const caret = async (api: KoenigEditorAPI, r: number, c: number) => {
  await act(async () => {
    api.editorInstance.update(() => $cell(r, c).selectStart(), { discrete: true });
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: () => T) =>
  api.editorInstance.getEditorState().read(fn);
const choose = async (label: string, value: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};
const open = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-table-group="borders"]') as Element);
  });
};

describe("the borders popover", () => {
  it("draws a thick dashed red line around the cursor's row", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await open();
    await choose("Apply to", "row");
    await choose("Lines", "outer");
    await choose("Line style", "dashed");
    await choose("Thickness", "thick");
    await choose("Line colour", "#C0392B");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-borders-apply]") as Element);
    });
    expect(read(api, () => $getCellBorders($cell(1, 0)).left?.style)).toBe("dashed");
    expect(read(api, () => $getCellBorders($cell(1, 1)).top?.width)).toBe("thick");
    expect(read(api, () => $getCellBorders($cell(1, 1)).left)).toBeUndefined();
    // drawn in the editor and carried to the saved HTML
    const cell = document.querySelectorAll("tr")[1]?.children[1] as HTMLElement;
    expect(cell.style.borderTop).toContain("dashed");
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    const dom = new DOMParser().parseFromString(html, "text/html");
    expect((dom.querySelectorAll("tr")[1]?.children[1] as HTMLElement).style.borderTop).toContain(
      "dashed",
    );
    // and it is part of the saved document
    expect(api.serialize()).toContain("kgBorders");
  });

  it("removes the borders again", async () => {
    const api = await load();
    await caret(api, 0, 0);
    await open();
    await choose("Apply to", "table");
    await choose("Line style", "solid");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-borders-apply]") as Element);
    });
    expect(read(api, () => $getCellBorders($cell(1, 2)).bottom?.style)).toBe("solid");
    await caret(api, 0, 0);
    await open();
    await choose("Apply to", "table");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-table-borders-reset]") as Element);
    });
    expect(read(api, () => $getCellBorders($cell(1, 2)))).toEqual({});
    expect(
      (document.querySelectorAll("tr")[1]?.children[2] as HTMLElement).style.borderBottom,
    ).toBe("");
  });
});
