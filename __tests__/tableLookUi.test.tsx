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
import { $isTableNode, type TableNode } from "@lexical/table";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, type ElementNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $getTableLook } from "../src/additions/table/tableLook";
import { mount } from "./__utils__/mount";
import { documentWith, row } from "./__utils__/tables";

afterEach(() => cleanup());

const load = async (composer: Record<string, unknown> = {}) =>
  (
    await mount({
      composer: {
        initialEditorState: documentWith(
          [row({ text: "a" }, { text: "b" }), row({ text: "c" }, { text: "d" })],
          [100, 100],
        ),
        ...composer,
      },
    })
  ).api;

const $table = () => $getRoot().getChildren().find($isTableNode) as TableNode;
const caret = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.update(
      () =>
        (
          ($table().getChildAtIndex(0) as ElementNode).getChildAtIndex(0) as ElementNode
        ).selectStart(),
      { discrete: true },
    );
  });
};
const lookOf = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => $getTableLook($table()));
const open = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-table-group="look"]') as Element);
  });
};
const toggle = async (name: string) => {
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-table-look="${name}"]`) as Element);
  });
};

describe("the Style popover", () => {
  it("turns stripes and brand colours on, and keeps the popover open between changes", async () => {
    const api = await load();
    await caret(api);
    await open();
    expect(document.querySelector("[data-kg-table-look-colour]")).toBeNull();
    await toggle("bandRows");
    await toggle("brandRows");
    expect(lookOf(api).bandRows).toBe(true);
    expect(lookOf(api).brandRows).toBe(true);
    expect(document.querySelector("[data-kg-table-look]")).not.toBeNull();
    expect(document.querySelector('[data-kg-table-look-colour="band"]')).not.toBeNull();
    expect(document.querySelector('[data-kg-table-look-colour="brand"]')).not.toBeNull();
  });

  it("turns the header row and the first-column header on and off", async () => {
    const api = await load();
    await caret(api);
    await open();
    await toggle("headerRow");
    await waitFor(() => expect(document.querySelector("table tr:first-of-type th")).not.toBeNull());
    await toggle("headerColumn");
    await waitFor(() => expect(document.querySelectorAll("table tr th").length).toBeGreaterThan(2));
    await toggle("headerRow");
    await toggle("headerColumn");
    await waitFor(() => expect(document.querySelectorAll("table tr th").length).toBe(0));
  });

  it("sets the band and brand colours from the shared colour control and the host's palette", async () => {
    const api = await load({
      colors: { tableBrand: { palette: [{ label: "House", value: "#112233" }], picker: false } },
    });
    await caret(api);
    await open();
    await toggle("brandColumns");
    await toggle("bandColumns");
    const brand = document.querySelector('[data-kg-table-look-colour="brand"]') as HTMLElement;
    expect(brand.querySelector("[data-kg-color-picker]")).toBeNull();
    const swatch = brand.querySelector('[data-kg-color-swatch="#112233"]') as Element;
    await act(async () => {
      fireEvent.click(swatch);
    });
    expect(lookOf(api).brandColor).toBe("#112233");
    const band = document.querySelector('[data-kg-table-look-colour="band"]') as HTMLElement;
    expect(band.querySelector("[data-kg-color-picker]")).not.toBeNull();
    const input = band.querySelector("[data-kg-color-picker] input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "#00ff00" } });
    });
    expect(lookOf(api).bandColor).toBe("#00ff00");
  });

  it("closes with Escape", async () => {
    const api = await load();
    await caret(api);
    await open();
    await act(async () => {
      fireEvent.keyDown(document.querySelector("[data-kg-table-popover]") as Element, {
        key: "Escape",
      });
    });
    expect(document.querySelector("[data-kg-table-popover]")).toBeNull();
  });
});
