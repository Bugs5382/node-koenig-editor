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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const grid = () =>
  documentWith([
    row(
      { headerState: 1, text: "Alpha" },
      { headerState: 1, text: "Beta" },
      { headerState: 1, text: "Gamma" },
    ),
    row({ text: "One" }, { text: "Two" }, { text: "Three" }),
    row({ text: "Four" }, { text: "Five" }, { text: "Six" }),
  ]);

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cellAt = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;

const load = async () => (await mount({ composer: { initialEditorState: grid() } })).api;

/** Selects the text of a cell, so the selection toolbar shows. */
const selectText = async (api: KoenigEditorAPI, r: number, c: number) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(
      () => {
        const text = $cellAt(r, c).getFirstDescendant();
        if ($isTextNode(text)) text.select(0, text.getTextContentSize());
      },
      { discrete: true },
    );
  });
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
  await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).not.toBeNull());
};

const button = (name: string) =>
  document.querySelector(`[data-kg-toolbar-button="${name}"] button`) as HTMLElement | null;
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(button(name) as Element);
  });
};

const cellFormat = (api: KoenigEditorAPI, r: number, c: number) =>
  api.editorInstance.getEditorState().read(() => ({
    align: $cellAt(r, c).getFormatType(),
    paragraph: ($cellAt(r, c).getFirstChild() as ElementNode).getFormatType(),
    vertical: $cellAt(r, c).getVerticalAlign(),
  }));

describe("alignment from the selection toolbar, inside a table cell", () => {
  it("aligns the cell, not the paragraph inside it, and marks the cell's alignment", async () => {
    const api = await load();
    await selectText(api, 1, 1);
    expect(button("alignLeft")?.getAttribute("data-kg-active")).toBe("true");
    await click("alignCenter");
    expect(cellFormat(api, 1, 1)).toEqual({ align: "center", paragraph: "", vertical: undefined });
    await waitFor(() => expect(button("alignCenter")?.getAttribute("data-kg-active")).toBe("true"));
    expect(cellFormat(api, 1, 0).align).toBe("");
  });

  it("offers the vertical alignments, and marks the cell's", async () => {
    const api = await load();
    await selectText(api, 1, 1);
    for (const name of ["alignTop", "alignMiddle", "alignBottom"])
      expect(button(name), name).not.toBeNull();
    expect(button("alignTop")?.getAttribute("data-kg-active")).toBe("true");
    await click("alignMiddle");
    expect(cellFormat(api, 1, 1).vertical).toBe("middle");
    await waitFor(() => expect(button("alignMiddle")?.getAttribute("data-kg-active")).toBe("true"));
  });

  it("applies to this cell, the row, the column or the table, as chosen", async () => {
    const api = await load();
    await selectText(api, 1, 1);
    expect(button("alignScope")?.getAttribute("aria-label")).toContain("this cell");
    await click("alignScope");
    expect(button("alignScope")?.getAttribute("aria-label")).toContain("the row");
    await click("alignRight");
    const formats = api.editorInstance
      .getEditorState()
      .read(() => [0, 1, 2].map((r) => [0, 1, 2].map((c) => $cellAt(r, c).getFormatType())));
    expect(formats[1]).toEqual(["right", "right", "right"]);
    expect(formats[0]).toEqual(["", "", ""]);
    expect(formats[2]).toEqual(["", "", ""]);
  });

  it("can apply to the whole column, and to the whole table", async () => {
    const api = await load();
    await selectText(api, 1, 1);
    await click("alignScope");
    await click("alignScope");
    expect(button("alignScope")?.getAttribute("aria-label")).toContain("the column");
    await click("alignCenter");
    const column = api.editorInstance
      .getEditorState()
      .read(() => [0, 1, 2].map((r) => $cellAt(r, 1).getFormatType()));
    expect(column).toEqual(["center", "center", "center"]);
    await click("alignScope");
    expect(button("alignScope")?.getAttribute("aria-label")).toContain("the table");
    await click("alignJustify");
    const all = api.editorInstance
      .getEditorState()
      .read(() => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => $cellAt(r, c).getFormatType())));
    expect(new Set(all)).toEqual(new Set(["justify"]));
  });

  it("has no cell controls outside a table", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: JSON.stringify({
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Plain",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: null,
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "root",
            version: 1,
          },
        }),
      },
    });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.select(0, 5);
      });
    });
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => expect(button("alignCenter")).not.toBeNull());
    expect(button("alignScope")).toBeNull();
    expect(button("alignTop")).toBeNull();
  });

  it("makes the shortcuts act on the cell too", async () => {
    const api = await load();
    await selectText(api, 2, 0);
    await act(async () => {
      fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
        code: "KeyE",
        ctrlKey: true,
        key: "E",
        shiftKey: true,
      });
    });
    expect(cellFormat(api, 2, 0)).toEqual({ align: "center", paragraph: "", vertical: undefined });
  });
});
