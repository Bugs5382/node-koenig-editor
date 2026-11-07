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
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { dropIndex } from "../src/additions/table/tableDrag";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

describe("where a dragged row or column lands", () => {
  const lines = [
    { end: 30, start: 0 },
    { end: 60, start: 30 },
    { end: 90, start: 60 },
  ];
  it("picks the row or column under the pointer", () => {
    expect(dropIndex(lines, 10)).toBe(0);
    expect(dropIndex(lines, 45)).toBe(1);
    expect(dropIndex(lines, 80)).toBe(2);
  });
  it("clamps to the first and last", () => {
    expect(dropIndex(lines, -50)).toBe(0);
    expect(dropIndex(lines, 500)).toBe(2);
  });
});

const load = async () =>
  (
    await mount({
      composer: {
        initialEditorState: documentWith([
          row({ text: "a" }, { text: "b" }, { text: "c" }),
          row({ text: "d" }, { text: "e" }, { text: "f" }),
          row({ text: "g" }, { text: "h" }, { text: "i" }),
        ]),
      },
    })
  ).api;

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const texts = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $table()
      .getChildren()
      .map((r) =>
        (r as ElementNode).getChildren().map((c) => (c as TableCellNode).getTextContent()),
      ),
  );
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
// jsdom has no layout: give the rows and columns the boxes they would have, 30px each
const layOut = () => {
  document.querySelectorAll("tr").forEach((tr, r) => {
    tr.getBoundingClientRect = () => new DOMRect(0, r * 30, 90, 30);
    [...tr.children].forEach((cell, c) => {
      cell.getBoundingClientRect = () => new DOMRect(c * 30, r * 30, 30, 30);
    });
  });
};

describe("dragging a row", () => {
  it("shows a grip for the cursor's row and moves the row where it is dropped", async () => {
    const api = await load();
    await caret(api, 0, 0);
    layOut();
    await act(async () => {
      fireEvent(window, new Event("resize"));
    });
    const grip = document.querySelector("[data-kg-table-row-grip]") as HTMLElement;
    expect(grip).not.toBeNull();
    await act(async () => {
      fireEvent.mouseDown(grip, { button: 0, clientX: 0, clientY: 15 });
    });
    await act(async () => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: 80 });
    });
    expect(document.querySelector("[data-kg-table-drop-line]")).not.toBeNull();
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 0, clientY: 80 });
    });
    expect(texts(api).map((r) => r[0])).toEqual(["d", "g", "a"]);
    expect(document.querySelector("[data-kg-table-drop-line]")).toBeNull();
  });
});

describe("dragging a column", () => {
  it("moves the column where it is dropped", async () => {
    const api = await load();
    await caret(api, 0, 2);
    layOut();
    await act(async () => {
      fireEvent(window, new Event("resize"));
    });
    const grip = document.querySelector("[data-kg-table-column-grip]") as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(grip, { button: 0, clientX: 75, clientY: 0 });
    });
    await act(async () => {
      fireEvent.mouseMove(window, { clientX: 10, clientY: 0 });
    });
    await act(async () => {
      fireEvent.mouseUp(window, { clientX: 10, clientY: 0 });
    });
    expect(texts(api)[0]).toEqual(["c", "a", "b"]);
  });

  it("offers no grips in a read-only editor", async () => {
    const api = await load();
    await caret(api, 0, 0);
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    expect(document.querySelector("[data-kg-table-row-grip]")).toBeNull();
  });
});
