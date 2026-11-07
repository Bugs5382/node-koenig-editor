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
import { $getRoot, type ElementNode, PASTE_COMMAND } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { parseSpreadsheetText } from "../src/additions/table/pasteTable";
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
    row({ text: "4" }, { text: "5" }, { text: "6" }),
  ]);

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const $cellAt = (r: number, c: number) =>
  (($table().getChildAtIndex(r) as ElementNode).getChildAtIndex(c) as TableCellNode) ?? null;

const load = async () => (await mount({ composer: { initialEditorState: grid() } })).api;

const caret = async (api: KoenigEditorAPI, r: number, c: number) => {
  await act(async () => {
    api.editorInstance.update(() => $cellAt(r, c).selectStart(), { discrete: true });
  });
};

const paste = async (api: KoenigEditorAPI, data: Record<string, string>) => {
  let handled = false;
  await act(async () => {
    const event = {
      clipboardData: {
        getData: (type: string) => data[type] ?? "",
        types: Object.keys(data),
      },
      preventDefault: () => {},
    };
    handled = api.editorInstance.dispatchCommand(PASTE_COMMAND, event as unknown as ClipboardEvent);
  });
  return handled;
};

const text = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $table()
      .getChildren()
      .map((r) =>
        (r as ElementNode)
          .getChildren()
          .map((c) => c.getTextContent())
          .join("|"),
      ),
  );

describe("parsing text copied from a spreadsheet", () => {
  it("splits rows on line breaks and cells on tabs, and drops the final empty line", () => {
    expect(parseSpreadsheetText("a\tb\r\nc\td\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a quoted cell's tabs, line breaks and doubled quotes", () => {
    expect(parseSpreadsheetText('"x\ty"\t"line1\nline2"\t"say ""hi"""')).toEqual([
      ["x\ty", "line1\nline2", 'say "hi"'],
    ]);
  });

  it("says it is not a table when there is no tab and a single line", () => {
    expect(parseSpreadsheetText("just some words")).toBeNull();
  });
});

describe("pasting spreadsheet text into a table", () => {
  it("fills the cells from the cursor and leaves the rest alone", async () => {
    const api = await load();
    await caret(api, 1, 1);
    expect(await paste(api, { "text/plain": "a\tb\nc\td" })).toBe(true);
    expect(text(api)).toEqual(["A|B|C", "1|a|b", "4|c|d"]);
  });

  it("adds the rows and columns the pasted data needs", async () => {
    const api = await load();
    await caret(api, 2, 2);
    await paste(api, { "text/plain": "a\tb\tc\nd\te\tf" });
    const lines = text(api);
    expect(lines).toHaveLength(4);
    expect(lines[2]).toBe("4|5|a|b|c");
    expect(lines[3]).toBe("||d|e|f");
    expect(lines[0]!.split("|")).toHaveLength(5);
  });

  it("uses the text and ignores a table in the HTML, so no table is nested in a cell", async () => {
    const api = await load();
    await caret(api, 1, 0);
    await paste(api, {
      "text/html": "<table><tr><td>x</td><td>y</td></tr></table>",
      "text/plain": "x\ty",
    });
    expect(text(api)[1]).toBe("x|y|3");
    expect(
      api.editorInstance
        .getEditorState()
        .read(() => $getRoot().getChildren().filter($isTableNode).length),
    ).toBe(1);
    expect(api.serialize().match(/"type":"table"/g)).toHaveLength(1);
  });

  it("leaves a paste of plain words to the normal paste", async () => {
    const api = await load();
    await caret(api, 1, 1);
    await paste(api, { "text/plain": "just words" });
    expect(text(api)).toEqual(["A|B|C", "1|2|3", "4|5|6"].map((line) => line));
  });
});
