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
import { $getRoot, $isTextNode, type ElementNode } from "lexical";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $getSpacing, LINE_SPACINGS, PARAGRAPH_SPACINGS } from "../src/additions/spacing/spacing";
import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

const load = async (composer: Record<string, unknown> = {}) =>
  (await mount({ composer: { initialEditorState: documentOf("Hello world"), ...composer } })).api;

const select = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const node = $getRoot().getFirstDescendant();
      if ($isTextNode(node)) node.select(0, 5);
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
const block = (api: KoenigEditorAPI) =>
  api.editorInstance
    .getEditorState()
    .read(() => $getSpacing($getRoot().getFirstChild() as ElementNode));
const paragraph = () => document.querySelector("p") as HTMLElement;

describe("the spacing choices", () => {
  it("line spacing runs from single to double and paragraph spacing from none to large", () => {
    expect(LINE_SPACINGS.map((entry) => entry.value)).toEqual([1, 1.15, 1.5, 2]);
    expect(PARAGRAPH_SPACINGS.map((entry) => entry.id)).toEqual([
      "none",
      "small",
      "medium",
      "large",
    ]);
  });
});

describe("the spacing buttons", () => {
  it("names the items for the toolbar option", () => {
    expect(KOENIG_TOOLBAR_ITEMS).toContain("lineSpacing");
    expect(KOENIG_TOOLBAR_ITEMS).toContain("paragraphSpacing");
  });

  it("sets the line spacing of the selected block, drawn in the editor", async () => {
    const api = await load();
    await select(api);
    await open("lineSpacing");
    await pick("1.5");
    expect(block(api)?.line).toBe(1.5);
    expect(paragraph().style.lineHeight).toBe("1.5");
    await waitFor(() => expect(button("lineSpacing")?.getAttribute("data-kg-active")).toBe("true"));
    // back to the default
    await open("lineSpacing");
    await pick("default");
    expect(block(api)).toBeNull();
    expect(paragraph().style.lineHeight).toBe("");
  });

  it("sets the space after the paragraph", async () => {
    const api = await load();
    await select(api);
    await open("paragraphSpacing");
    await pick("large");
    expect(block(api)?.after).toBe("large");
    expect(paragraph().style.marginBottom || paragraph().style.marginBlockEnd).toBe("1.5em");
  });

  it("is saved in the document and comes back", async () => {
    const api = await load();
    await select(api);
    await open("lineSpacing");
    await pick("2");
    const saved = api.serialize();
    expect(saved).toContain("kgSpacing");
    cleanup();
    const again = (await mount({ composer: { initialEditorState: saved } })).api;
    expect(block(again)?.line).toBe(2);
  });

  it("is carried to the saved HTML as inline CSS", async () => {
    const api = await load();
    await select(api);
    await open("lineSpacing");
    await pick("1.5");
    await open("paragraphSpacing");
    await pick("medium");
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    const dom = new DOMParser().parseFromString(html, "text/html");
    const p = dom.querySelector("p") as HTMLElement;
    expect(p.style.lineHeight).toBe("1.5");
    expect(p.style.marginBottom || p.style.marginBlockEnd).toBe("1em");
  });

  it("is left out when the host's toolbar option leaves it out", async () => {
    const api = await load({ toolbar: ["bold", "lineSpacing"] });
    await select(api);
    expect(button("lineSpacing")).not.toBeNull();
    expect(button("paragraphSpacing")).toBeNull();
  });
});
