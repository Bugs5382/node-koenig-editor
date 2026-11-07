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
import { $isTableNode, type TableNode } from "@lexical/table";
import { act, cleanup } from "@testing-library/react";
import { $getRoot } from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import { $setTableCaption } from "../src/additions/table/tableActions";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

// What a reader's page gets: the saved HTML must carry what the editor and the reader's view show.
const richDocument = () =>
  documentWith(
    [
      row({ colSpan: 2, headerState: 1, text: "Head" }, { headerState: 1, text: "Total" }),
      row(
        { rowSpan: 2, text: "Left", verticalAlign: "middle" },
        { backgroundColor: "#D4EFDF", text: "Green" },
        { text: "Right", width: 200 },
      ),
      row({ text: "Under" }, { text: "More" }),
    ],
    [120, 160, 200],
  );

const htmlOf = async (caption?: string) => {
  const { api } = await mount({ composer: { initialEditorState: richDocument() } });
  if (caption) {
    await act(async () => {
      api.editorInstance.update(
        () => $setTableCaption($getRoot().getChildren().find($isTableNode) as TableNode, caption),
        { discrete: true },
      );
    });
  }
  return api.editorInstance
    .getEditorState()
    .read(() => $generateHtmlFromNodes(api.editorInstance, null));
};

describe("the saved HTML of a table", () => {
  it("is a real table with merged cells, shading and vertical alignment", async () => {
    const html = await htmlOf();
    const dom = new DOMParser().parseFromString(html, "text/html");
    const table = dom.querySelector("table");
    expect(table).not.toBeNull();
    expect(table!.querySelector("th[colspan='2']")).not.toBeNull();
    expect(table!.querySelector("td[rowspan='2']")).not.toBeNull();
    const shaded = [...dom.querySelectorAll("td")].find(
      (cell) => cell.textContent === "Green",
    ) as HTMLElement;
    expect(shaded.style.backgroundColor).toBe("rgb(212, 239, 223)");
    const left = [...dom.querySelectorAll("td")].find(
      (cell) => cell.textContent === "Left",
    ) as HTMLElement;
    expect(left.style.verticalAlign).toBe("middle");
  });

  it("keeps the shaded cell's dark ink, so the text reads on a page with a dark theme", async () => {
    const html = await htmlOf();
    const dom = new DOMParser().parseFromString(html, "text/html");
    const shaded = [...dom.querySelectorAll("td")].find(
      (cell) => cell.textContent === "Green",
    ) as HTMLElement;
    expect(shaded.style.color).toBe("rgb(21, 23, 26)");
    const plain = [...dom.querySelectorAll("td")].find(
      (cell) => cell.textContent === "Right",
    ) as HTMLElement;
    expect(plain.style.color).toBe("");
  });

  it("has a real caption element when the table has a caption, and none otherwise", async () => {
    const withCaption = new DOMParser().parseFromString(
      await htmlOf("Quarterly totals"),
      "text/html",
    );
    expect(withCaption.querySelector("table > caption")?.textContent).toBe("Quarterly totals");
    const without = new DOMParser().parseFromString(await htmlOf(), "text/html");
    expect(without.querySelector("table > caption")).toBeNull();
  });

  it("carries a cell's alignment as text-align", async () => {
    const doc = JSON.parse(richDocument());
    doc.root.children[0].children[1].children[1].format = "center";
    const { api } = await mount({ composer: { initialEditorState: JSON.stringify(doc) } });
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    const dom = new DOMParser().parseFromString(html, "text/html");
    const cell = [...dom.querySelectorAll("td")].find(
      (c) => c.textContent === "Green",
    ) as HTMLElement;
    expect(cell.style.textAlign).toBe("center");
  });

  it("keeps header cells as th with a scope", async () => {
    const dom = new DOMParser().parseFromString(await htmlOf(), "text/html");
    expect(dom.querySelectorAll("th").length).toBe(2);
  });
});
