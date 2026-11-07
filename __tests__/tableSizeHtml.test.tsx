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
import { $isTableNode, type TableNode, type TableRowNode } from "@lexical/table";
import { act, cleanup } from "@testing-library/react";
import { $getRoot } from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import {
  $setRowHeight,
  $setTableWidthMode,
  type TableWidthMode,
} from "../src/additions/table/tableResize";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

// A resized table must look the same for the reader as in the editor: widths saved as percentages
// of the table, row heights as minimum heights, and the width mode as a data attribute and style.
const htmlOf = async (mode: TableWidthMode, widths = [100, 300]) => {
  const { api } = await mount({
    composer: {
      initialEditorState: documentWith(
        [row({ text: "a" }, { text: "b" }), row({ text: "c" }, { text: "d" })],
        widths,
      ),
    },
  });
  await act(async () => {
    api.editorInstance.update(
      () => {
        const table = $getRoot().getChildren().find($isTableNode) as TableNode;
        $setTableWidthMode(table, mode);
        $setRowHeight(table.getChildAtIndex(1) as TableRowNode, 60);
      },
      { discrete: true },
    );
  });
  const html = api.editorInstance
    .getEditorState()
    .read(() => $generateHtmlFromNodes(api.editorInstance, null));
  return new DOMParser().parseFromString(html, "text/html");
};

describe("the saved HTML of a resized table", () => {
  it("writes column widths as percentages of the whole", async () => {
    const dom = await htmlOf("fixed");
    const cols = [...dom.querySelectorAll("col")].map((col) => (col as HTMLElement).style.width);
    expect(cols).toEqual(["25%", "75%"]);
  });

  it("writes a row height as a minimum height", async () => {
    const dom = await htmlOf("full");
    const tall = dom.querySelectorAll("tr")[1] as HTMLElement;
    expect(tall.style.height).toBe("");
    expect(tall.style.minHeight || tall.getAttribute("data-kg-row-height")).toBeTruthy();
  });

  it("marks the width mode", async () => {
    for (const mode of ["full", "fit", "fixed"] as const) {
      const dom = await htmlOf(mode);
      expect(dom.querySelector("table")?.getAttribute("data-kg-table-width")).toBe(mode);
    }
  });

  it("makes a fixed table as wide as its columns and a full table the whole width", async () => {
    const fixed = (await htmlOf("fixed")).querySelector("table") as HTMLElement;
    expect(fixed.style.width).toBe("400px");
    expect(fixed.style.maxWidth).toBe("100%");
    const full = (await htmlOf("full")).querySelector("table") as HTMLElement;
    expect(full.style.width).toBe("100%");
    const fit = (await htmlOf("fit")).querySelector("table") as HTMLElement;
    expect(fit.style.width).toBe("auto");
  });
});
