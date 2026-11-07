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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode, type TextNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  isColorAllowed,
  isHexColor,
  normalizeColor,
  resolveColorSetting,
  sameColor,
} from "../src/additions/colors/colors";
import { inkFor } from "../src/additions/textStyle/textStyle";
import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

describe("colour settings", () => {
  it("starts from a palette per slot, with the picker and the editor's own colour on", () => {
    const text = resolveColorSetting("textColor");
    const background = resolveColorSetting("calloutBackground");
    expect(text.picker).toBe(true);
    expect(text.none).toBe(true);
    expect(text.palette).not.toEqual(background.palette);
  });

  it("lets a host replace a palette, drop the picker and drop the editor's own colour", () => {
    const setting = resolveColorSetting("textColor", {
      textColor: { none: false, palette: [{ label: "Brand", value: "#112233" }], picker: false },
    });
    expect(setting.palette).toEqual([{ label: "Brand", value: "#112233" }]);
    expect(isColorAllowed(setting, "#112233")).toBe(true);
    expect(isColorAllowed(setting, "#445566")).toBe(false);
    expect(isColorAllowed(setting, null)).toBe(false);
  });

  it("allows any colour with the picker on, and ignores a palette with no valid colour", () => {
    const setting = resolveColorSetting("highlight", {
      highlight: { palette: [{ label: "Nope", value: "red" }] },
    });
    expect(setting.palette).toEqual(resolveColorSetting("highlight").palette);
    expect(isColorAllowed(setting, "#abcdef")).toBe(true);
    expect(isColorAllowed(setting, "not a colour")).toBe(false);
  });

  it("compares colours without regard to case or the short form", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("abc")).toBe(false);
    expect(normalizeColor("#ABC")).toBe("#aabbcc");
    expect(sameColor("#ABCDEF", "#abcdef")).toBe(true);
    expect(sameColor(null, "#abcdef")).toBe(false);
  });

  it("picks dark ink on a light highlight and light ink on a dark one", () => {
    expect(inkFor("#FFF3B0")).toBe("#15171A");
    expect(inkFor("#101820")).toBe("#FFFFFF");
  });
});

const load = async (composer: Record<string, unknown> = {}) =>
  (await mount({ composer: { initialEditorState: documentOf("Hello world"), ...composer } })).api;

const selectAll = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const node = $getRoot().getFirstDescendant();
      if ($isTextNode(node)) node.select(0, node.getTextContentSize());
    });
  });
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
  await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).not.toBeNull());
};

const open = async (name: string) => {
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-toolbar-button="${name}"] button`) as Element);
  });
};

const style = (api: KoenigEditorAPI) =>
  api.editorInstance
    .getEditorState()
    .read(() => ($getRoot().getFirstDescendant() as TextNode).getStyle());

describe("the colour control in the toolbar", () => {
  it("shows the host's palette, applies a swatch and a picked colour", async () => {
    const api = await load({
      colors: { textColor: { palette: [{ label: "Brand", value: "#112233" }] } },
    });
    await selectAll(api);
    await open("textColor");
    const swatches = [...document.querySelectorAll("[data-kg-color-swatch]")];
    expect(swatches.map((swatch) => swatch.getAttribute("data-kg-color-swatch"))).toEqual([
      "#112233",
    ]);
    await act(async () => {
      fireEvent.click(swatches[0] as Element);
    });
    expect(style(api)).toContain("color: #112233");
    await open("textColor");
    const input = document.querySelector("[data-kg-color-picker] input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "#00ff00" } });
    });
    expect(style(api)).toContain("color: #00ff00");
  });

  it("has no picker and no default choice when the host forces its colours", async () => {
    const api = await load({
      colors: {
        highlight: { none: false, palette: [{ label: "Brand", value: "#FFEEAA" }], picker: false },
      },
    });
    await selectAll(api);
    await open("highlight");
    await waitFor(() => expect(document.querySelector("[data-kg-color-control]")).not.toBeNull());
    expect(document.querySelector("[data-kg-color-picker]")).toBeNull();
    expect(document.querySelector("[data-kg-color-none]")).toBeNull();
    expect(document.querySelectorAll("[data-kg-color-swatch]")).toHaveLength(1);
  });

  it("writes light ink over a dark picked highlight", async () => {
    const api = await load();
    await selectAll(api);
    await open("highlight");
    const input = document.querySelector("[data-kg-color-picker] input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "#101820" } });
    });
    expect(style(api)).toContain("background-color: #101820");
    expect(style(api).toLowerCase()).toContain("color: #ffffff");
  });

  it("draws the list in the toolbar's own layer, so a host's stacking context cannot put it under the toolbar", async () => {
    const api = await load();
    await selectAll(api);
    for (const item of ["textColor", "highlight", "fontSize"]) {
      await open(item);
      await waitFor(() =>
        expect(
          document.querySelector("[data-kg-floating-toolbar] [data-kg-style-menu]"),
        ).not.toBeNull(),
      );
      await open(item);
      await waitFor(() => expect(document.querySelector("[data-kg-style-menu]")).toBeNull());
    }
  });
});
