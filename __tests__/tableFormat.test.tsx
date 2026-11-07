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
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

interface SavedCell {
  backgroundColor: string | null;
  colSpan: number;
  headerState: number;
  rowSpan: number;
  text: string;
  verticalAlign?: string;
  width?: number;
}

/** Loads the document, saves it again and reads the table back as plain data. */
const roundTrip = async (document_: string) => {
  const { api } = await mount({ composer: { initialEditorState: document_ } });
  const saved = JSON.parse(api.serialize()) as {
    root: {
      children: { children: { children: Record<string, unknown>[] }[]; colWidths?: number[] }[];
    };
  };
  const table = saved.root.children[0]!;
  return {
    colWidths: table.colWidths,
    rows: table.children.map((r) =>
      r.children.map((c): SavedCell => ({
        backgroundColor: (c.backgroundColor as string | null) ?? null,
        colSpan: c.colSpan as number,
        headerState: c.headerState as number,
        rowSpan: c.rowSpan as number,
        text: JSON.stringify(c.children).match(/"text":"([^"]*)"/)?.[1] ?? "",
        verticalAlign: c.verticalAlign as string | undefined,
        width: c.width as number | undefined,
      })),
    ),
  };
};

describe("the stored table format keeps what the editor can now do", () => {
  const rich = documentWith(
    [
      row({ colSpan: 2, headerState: 1, text: "Head" }, { headerState: 1, text: "Total" }),
      row(
        { rowSpan: 2, text: "Left", verticalAlign: "middle" },
        { backgroundColor: "#E6F4EA", text: "Green" },
        { text: "Right", width: 200 },
      ),
      row({ text: "Under" }, { text: "More" }),
    ],
    [120, 160, 200],
  );

  it("loads and saves merged cells, a cell colour, vertical alignment and widths unchanged", async () => {
    const saved = await roundTrip(rich);
    expect(saved.rows[0]![0]).toMatchObject({ colSpan: 2, headerState: 1, text: "Head" });
    expect(saved.rows[1]![0]).toMatchObject({ rowSpan: 2, text: "Left", verticalAlign: "middle" });
    expect(saved.rows[1]![1]).toMatchObject({ backgroundColor: "#E6F4EA", text: "Green" });
    expect(saved.rows[1]![2]).toMatchObject({ text: "Right", width: 200 });
    expect(saved.colWidths).toEqual([120, 160, 200]);
  });

  it("saves the same document again after a second load", async () => {
    const first = await roundTrip(rich);
    const second = await roundTrip(
      documentWith(
        first.rows.map((r) => row(...r)),
        first.colWidths,
      ),
    );
    expect(second).toEqual(first);
  });

  it("loads a table saved before these features exist, unchanged", async () => {
    const plain = documentWith([
      row({ headerState: 1, text: "A" }, { headerState: 1, text: "B" }),
      row({ text: "1" }, { text: "2" }),
    ]);
    const saved = await roundTrip(plain);
    expect(saved.rows).toEqual([
      [
        { backgroundColor: null, colSpan: 1, headerState: 1, rowSpan: 1, text: "A" },
        { backgroundColor: null, colSpan: 1, headerState: 1, rowSpan: 1, text: "B" },
      ],
      [
        { backgroundColor: null, colSpan: 1, headerState: 0, rowSpan: 1, text: "1" },
        { backgroundColor: null, colSpan: 1, headerState: 0, rowSpan: 1, text: "2" },
      ],
    ]);
  });
});
