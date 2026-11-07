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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isElementNode, $isTextNode, type ElementNode } from "lexical";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const text = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});
const paragraph = (value: string, extra: Record<string, unknown> = {}) => ({
  children: [text(value)],
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph",
  version: 1,
  ...extra,
});
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const load = async (state: string, composer: Record<string, unknown> = {}) =>
  (await mount({ composer: { initialEditorState: state, ...composer } })).api;

const selectBlocks = async (api: KoenigEditorAPI, from: number, to: number) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const children = $getRoot().getChildren();
      const first = (children[from] as ElementNode | undefined)?.getFirstDescendant();
      const last = (children[to] as ElementNode | undefined)?.getLastDescendant();
      if ($isTextNode(first) && $isTextNode(last)) {
        const selection = first.select(0, 0);
        selection.focus.set(last.getKey(), last.getTextContentSize(), "text");
      }
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
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-style-item="${id}"]`) as Element);
  });
};
const directions = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => ($isElementNode(child) ? child.getDirection() : null)),
  );

describe("the text direction button", () => {
  it("is a named toolbar item", () => {
    expect(KOENIG_TOOLBAR_ITEMS).toContain("textDirection");
  });

  it("sets the direction of the selected blocks, drawn and saved", async () => {
    const api = await load(doc(paragraph("One"), paragraph("Two"), paragraph("Three")));
    await selectBlocks(api, 0, 1);
    await open("textDirection");
    await pick("rtl");
    expect(directions(api)).toEqual(["rtl", "rtl", null]);
    expect([...document.querySelectorAll("p")].map((p) => p.getAttribute("dir"))).toEqual([
      "rtl",
      "rtl",
      "auto",
    ]);
    expect(api.serialize()).toContain('"direction":"rtl"');
    await waitFor(() =>
      expect(button("textDirection")?.getAttribute("data-kg-active")).toBe("true"),
    );
  });

  it("goes back to automatic, and can be left to right", async () => {
    const api = await load(doc(paragraph("שלום", { direction: "rtl" })));
    await selectBlocks(api, 0, 0);
    await open("textDirection");
    await pick("ltr");
    expect(directions(api)).toEqual(["ltr"]);
    await open("textDirection");
    await pick("auto");
    expect(directions(api)).toEqual([null]);
  });

  it("turns a whole list, and a whole table, around", async () => {
    const list = {
      children: [
        {
          children: [text("a")],
          direction: null,
          format: "",
          indent: 0,
          type: "listitem",
          value: 1,
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      listType: "bullet",
      start: 1,
      tag: "ul",
      type: "list",
      version: 1,
    };
    const api = await load(doc(list));
    await selectBlocks(api, 0, 0);
    await open("textDirection");
    await pick("rtl");
    expect(document.querySelector("ul")?.getAttribute("dir")).toBe("rtl");
  });

  it("is left out when the host's toolbar option leaves it out", async () => {
    const api = await load(doc(paragraph("One")), { toolbar: ["bold"] });
    await selectBlocks(api, 0, 0);
    expect(button("textDirection")).toBeNull();
  });
});

describe("mixed and right-to-left text", () => {
  it("lets a paragraph that starts with Hebrew or Arabic follow its own direction", async () => {
    await load(doc(paragraph("שלום world"), paragraph("hello שלום"), paragraph("مرحبا")));
    expect([...document.querySelectorAll("p")].map((p) => p.getAttribute("dir"))).toEqual([
      "auto",
      "auto",
      "auto",
    ]);
  });

  it("keeps an explicit direction in the saved HTML", async () => {
    const api = await load(doc(paragraph("שלום", { direction: "rtl" })));
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    expect(html).toContain('dir="rtl"');
  });

  it("starts the block's alignment at the right in a right-to-left block", async () => {
    const api = await load(doc(paragraph("שלום", { direction: "rtl" })));
    expect(
      api.editorInstance
        .getEditorState()
        .read(() => ($getRoot().getFirstChild() as ElementNode).getFormatType()),
    ).toBe("");
  });
});
