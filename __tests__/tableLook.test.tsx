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
import { act, cleanup, waitFor } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  $getTableLook,
  $setTableLook,
  type TableLook,
  cellLook,
  DEFAULT_BAND_COLOR,
} from "../src/additions/table/tableLook";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const load = async () =>
  (
    await mount({
      composer: {
        initialEditorState: documentWith(
          [
            row(
              { text: "a", headerState: 1 },
              { text: "b", headerState: 1 },
              { text: "c", headerState: 1 },
            ),
            row({ text: "d" }, { text: "e" }, { text: "f" }),
            row({ text: "g" }, { text: "h" }, { text: "i" }),
          ],
          [100, 100, 100],
        ),
      },
    })
  ).api;

const look = async (api: KoenigEditorAPI, change: Partial<TableLook>) => {
  await act(async () => {
    api.editorInstance.update(
      () => $setTableLook($getRoot().getChildren().find($isTableNode) as TableNode, change),
      { discrete: true },
    );
  });
};
const html = (api: KoenigEditorAPI) =>
  new DOMParser().parseFromString(
    api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null)),
    "text/html",
  );
const cellsOf = (dom: Document) =>
  [...dom.querySelectorAll("tr")].map((tr) => [...tr.children] as HTMLElement[]);

describe("a table's look", () => {
  it("is off by default", async () => {
    const api = await load();
    const state = api.editorInstance
      .getEditorState()
      .read(() => $getTableLook($getRoot().getChildren().find($isTableNode) as TableNode));
    expect(state.bandRows).toBe(false);
    expect(state.brandRows).toBe(false);
    expect(
      cellsOf(html(api))
        .slice(1)
        .flat()
        .every((cell) => !cell.style.backgroundColor),
    ).toBe(true);
  });

  it("works out the colour of a cell from its place", () => {
    const on: TableLook = {
      bandColor: null,
      bandColumns: false,
      bandRows: true,
      brandColor: "#112233",
      brandColumns: true,
      brandRows: true,
    };
    expect(cellLook(on, 0, 2)?.background).toBe("#112233");
    expect(cellLook(on, 2, 0)?.background).toBe("#112233");
    expect(cellLook(on, 1, 1)?.background).toBe(DEFAULT_BAND_COLOR);
    expect(cellLook(on, 2, 1)).toBeNull();
    expect(cellLook(on, 0, 0)?.ink).toBe("#FFFFFF");
    expect(cellLook(on, 1, 1)?.ink).toBe("#15171A");
  });

  it("writes banded rows into the saved HTML as inline colours with readable ink", async () => {
    const api = await load();
    await look(api, { bandColor: "#FFF3B0", bandRows: true });
    const cells = cellsOf(html(api));
    expect(cells[1]?.every((cell) => cell.style.backgroundColor === "rgb(255, 243, 176)")).toBe(
      true,
    );
    expect(cells[1]?.[0]?.style.color).toBe("rgb(21, 23, 26)");
    expect(cells[2]?.[0]?.style.backgroundColor).toBe("");
  });

  it("writes banded columns and brand colours, and a header cell stays a th", async () => {
    const api = await load();
    await look(api, { bandColumns: true, brandColor: "#112233", brandRows: true });
    const cells = cellsOf(html(api));
    expect(cells[0]?.every((cell) => cell.style.backgroundColor === "rgb(17, 34, 51)")).toBe(true);
    expect(cells[0]?.[0]?.tagName).toBe("TH");
    expect(cells[0]?.[0]?.style.color).toBe("rgb(255, 255, 255)");
    expect(cells[2]?.[1]?.style.backgroundColor).not.toBe("");
    expect(cells[2]?.[0]?.style.backgroundColor).toBe("");
  });

  it("leaves a cell the author shaded alone", async () => {
    const api = await load();
    await act(async () => {
      api.editorInstance.update(
        () => {
          const table = $getRoot().getChildren().find($isTableNode) as TableNode;
          const cell = (table.getChildAtIndex(1) as ElementNode).getChildAtIndex(
            1,
          ) as TableCellNode;
          cell.setBackgroundColor("#ABCDEF");
          $setTableLook(table, { bandRows: true });
        },
        { discrete: true },
      );
    });
    expect(cellsOf(html(api))[1]?.[1]?.style.backgroundColor).toBe("rgb(171, 205, 239)");
  });

  it("marks the table element for the stylesheet and sets the colours as properties", async () => {
    const api = await load();
    await look(api, { bandColor: "#FFF3B0", bandRows: true, brandColumns: true });
    await waitFor(() => {
      const table = document.querySelector("table") as HTMLElement;
      expect(table.hasAttribute("data-kg-band-rows")).toBe(true);
      expect(table.hasAttribute("data-kg-band-columns")).toBe(false);
      expect(table.hasAttribute("data-kg-brand-columns")).toBe(true);
      expect(table.style.getPropertyValue("--kg-table-band")).toBe("#FFF3B0");
      expect(table.style.getPropertyValue("--kg-table-band-ink")).toBe("#15171A");
    });
    await look(api, { bandRows: false, brandColumns: false });
    await waitFor(() => {
      const table = document.querySelector("table") as HTMLElement;
      expect(table.hasAttribute("data-kg-band-rows")).toBe(false);
      expect(table.style.getPropertyValue("--kg-table-band")).toBe("");
    });
  });

  it("is saved with the document", async () => {
    const api = await load();
    await look(api, { bandRows: true, brandColor: "#112233" });
    const json = JSON.stringify(api.editorInstance.getEditorState().toJSON());
    expect(json).toContain("kgTableLook");
    expect(json).toContain("#112233");
  });
});
