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
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

const FONTS = [
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "Menlo, monospace" },
];

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

const button = (name: string) =>
  document.querySelector(`[data-kg-toolbar-button="${name}"] button`) as HTMLElement | null;
const open = async (name: string) => {
  await act(async () => {
    fireEvent.click(button(name) as Element);
  });
};
const pick = async (id: string) => {
  // colours come from the shared colour control: a swatch by its hex, the editor's own colour by "default" or "none"
  const target =
    id === "default" || id === "none"
      ? document.querySelector("[data-kg-color-none]") ||
        document.querySelector(`[data-kg-style-item="${id}"]`)
      : id.startsWith("#")
        ? document.querySelector(`[data-kg-color-swatch="${id}"]`)
        : document.querySelector(`[data-kg-style-item="${id}"]`);
  await act(async () => {
    fireEvent.click(target as Element);
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: (node: TextNode) => T): T =>
  api.editorInstance.getEditorState().read(() => fn($getRoot().getFirstDescendant() as TextNode));
const style = (api: KoenigEditorAPI) => read(api, (node) => node.getStyle());
const format = (api: KoenigEditorAPI) => read(api, (node) => node.getFormat());

const ITEMS = ["fontSize", "textColor", "highlight", "clearFormatting"];

describe("the text styling buttons", () => {
  it("names the items for the toolbar option", () => {
    for (const item of [...ITEMS, "fontFamily"]) expect(KOENIG_TOOLBAR_ITEMS).toContain(item);
  });

  it("shows a labelled button for each, and the font one only when the host gives fonts", async () => {
    const api = await load();
    await selectAll(api);
    for (const item of ITEMS) {
      expect(button(item), item).not.toBeNull();
      expect(button(item)?.getAttribute("aria-label")).toBeTruthy();
    }
    expect(button("fontFamily")).toBeNull();
    cleanup();
    const withFonts = await load({ fonts: FONTS });
    await selectAll(withFonts);
    expect(button("fontFamily")).not.toBeNull();
  });

  it("is left out when the host's toolbar option leaves it out", async () => {
    const api = await load({ fonts: FONTS, toolbar: ["bold", "textColor"] });
    await selectAll(api);
    expect(button("textColor")).not.toBeNull();
    for (const item of ["fontSize", "highlight", "clearFormatting", "fontFamily"]) {
      expect(button(item), item).toBeNull();
    }
  });
});

describe("the menus", () => {
  it("sets a text colour and marks the button", async () => {
    const api = await load();
    await selectAll(api);
    await open("textColor");
    await waitFor(() =>
      expect(document.querySelector("[data-kg-color-control]")?.getAttribute("aria-label")).toBe(
        "Text colour",
      ),
    );
    await pick("#D64545");
    expect(style(api)).toContain("color: #D64545");
    await waitFor(() => expect(button("textColor")?.getAttribute("data-kg-active")).toBe("true"));
    // the menu closes and focus is back in the text
    expect(document.querySelector("[data-kg-color-control]")).toBeNull();
    await open("textColor");
    await pick("default");
    expect(style(api)).not.toContain("color");
  });

  it("sets a relative size", async () => {
    const api = await load();
    await selectAll(api);
    await open("fontSize");
    await pick("large");
    expect(style(api)).toContain("font-size: 1.25em");
    await open("fontSize");
    await pick("normal");
    expect(style(api)).not.toContain("font-size");
  });

  it("highlights with dark ink and takes it off", async () => {
    const api = await load();
    await selectAll(api);
    await open("highlight");
    await pick("#FFF3B0");
    expect(style(api)).toContain("background-color: #FFF3B0");
    await open("highlight");
    await pick("none");
    expect(style(api)).not.toContain("background-color");
  });

  it("sets a font from the host's list", async () => {
    const api = await load({ fonts: FONTS });
    await selectAll(api);
    await open("fontFamily");
    expect(document.querySelector('[data-kg-style-item="font-0"]')?.textContent).toContain("Serif");
    await pick("font-1");
    expect(style(api)).toContain("font-family: Menlo, monospace");
    await open("fontFamily");
    await pick("default");
    expect(style(api)).not.toContain("font-family");
  });

  it("closes with Escape and gives focus back to the text", async () => {
    const api = await load();
    await selectAll(api);
    await open("textColor");
    await act(async () => {
      fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    });
    expect(document.querySelector("[data-kg-color-control]")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(api.editorInstance.getRootElement()));
  });

  it("moves between items with the arrow keys", async () => {
    const api = await load();
    await selectAll(api);
    await open("fontSize");
    const items = [...document.querySelectorAll("[data-kg-style-item]")] as HTMLElement[];
    expect(document.activeElement).toBe(
      items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0],
    );
    const first = document.activeElement as HTMLElement;
    await act(async () => {
      fireEvent.keyDown(first, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(items[(items.indexOf(first) + 1) % items.length]);
  });
});

describe("clear formatting", () => {
  it("takes formats and styles off the selected text", async () => {
    const api = await load();
    await selectAll(api);
    await open("textColor");
    await pick("#D64545");
    await act(async () => {
      fireEvent.click(button("bold") as Element);
    });
    expect(format(api)).toBe(1);
    await act(async () => {
      fireEvent.click(button("clearFormatting") as Element);
    });
    expect(format(api)).toBe(0);
    expect(style(api)).toBe("");
  });

  it("works from Ctrl or Cmd+backslash", async () => {
    const api = await load();
    await selectAll(api);
    await open("textColor");
    await pick("#D64545");
    await act(async () => {
      fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
        code: "Backslash",
        ctrlKey: true,
        key: "\\",
      });
    });
    expect(style(api)).toBe("");
  });
});
