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
import { $getRoot, $isTextNode } from "lexical";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const documentOf = (value: string) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: value,
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
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

const button = (name: string) =>
  document.querySelector(`[data-kg-toolbar-button="${name}"] button`) as HTMLElement | null;
const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(button(name) as Element);
  });
};
const has = (api: KoenigEditorAPI, format: string) =>
  api.editorInstance.getEditorState().read(() => {
    const node = $getRoot().getFirstDescendant();
    return $isTextNode(node) && node.hasFormat(format as never);
  });
const press = async (api: KoenigEditorAPI, init: KeyboardEventInit) => {
  await act(async () => {
    fireEvent.keyDown(api.editorInstance.getRootElement() as Element, init);
  });
};

const INLINE = ["underline", "strikethrough", "subscript", "superscript", "code"] as const;

describe("inline format buttons in the selection toolbar", () => {
  it("names the five items for the toolbar option", () => {
    for (const item of INLINE) expect(KOENIG_TOOLBAR_ITEMS).toContain(item);
  });

  it("shows a labelled button for each, none of them on yet", async () => {
    const api = await load();
    await selectAll(api);
    for (const item of INLINE) {
      expect(button(item), item).not.toBeNull();
      expect(button(item)?.getAttribute("aria-label")).toBeTruthy();
      expect(button(item)?.getAttribute("data-kg-active")).toBe("false");
    }
  });

  it("toggles each format on the selected text and marks the button", async () => {
    const api = await load();
    await selectAll(api);
    for (const item of INLINE) {
      await click(item);
      expect(has(api, item), `${item} on`).toBe(true);
      await waitFor(() => expect(button(item)?.getAttribute("data-kg-active")).toBe("true"));
      await click(item);
      expect(has(api, item), `${item} off`).toBe(false);
    }
  });

  it("keeps subscript and superscript apart", async () => {
    const api = await load();
    await selectAll(api);
    await click("subscript");
    await click("superscript");
    expect(has(api, "superscript")).toBe(true);
    expect(has(api, "subscript")).toBe(false);
  });

  it("draws them in the editor", async () => {
    const api = await load();
    await selectAll(api);
    const root = api.editorInstance.getRootElement() as HTMLElement;
    for (const item of ["underline", "strikethrough", "subscript", "superscript"])
      await click(item);
    expect(root.querySelector("sup")).not.toBeNull();
    await click("code");
    expect(root.querySelector("code")).not.toBeNull();
  });

  it("is left out when the host's toolbar option leaves it out", async () => {
    const api = await load({ toolbar: ["bold", "italic", "underline"] });
    await selectAll(api);
    expect(button("underline")).not.toBeNull();
    for (const item of ["strikethrough", "subscript", "superscript", "code"]) {
      expect(button(item), item).toBeNull();
    }
  });
});

describe("the shortcuts", () => {
  it("underline with Ctrl or Cmd+U", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { code: "KeyU", ctrlKey: true, key: "u" });
    expect(has(api, "underline")).toBe(true);
  });

  it("strikethrough with Ctrl or Cmd+Shift+X", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { code: "KeyX", ctrlKey: true, key: "x", shiftKey: true });
    expect(has(api, "strikethrough")).toBe(true);
    await press(api, { code: "KeyX", ctrlKey: true, key: "x", shiftKey: true });
    expect(has(api, "strikethrough")).toBe(false);
  });

  it("subscript with Ctrl or Cmd+comma and superscript with Ctrl or Cmd+period", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { code: "Comma", ctrlKey: true, key: "," });
    expect(has(api, "subscript")).toBe(true);
    await press(api, { code: "Period", ctrlKey: true, key: "." });
    expect(has(api, "superscript")).toBe(true);
    expect(has(api, "subscript")).toBe(false);
  });

  it("do nothing for a format the host's toolbar option leaves out", async () => {
    const api = await load({ toolbar: ["bold", "italic"] });
    await selectAll(api);
    await press(api, { code: "KeyX", ctrlKey: true, key: "x", shiftKey: true });
    expect(has(api, "strikethrough")).toBe(false);
  });
});

describe("Alt+F10 into the selection toolbar", () => {
  it("moves focus to the first button, and the arrow keys move between buttons", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { altKey: true, code: "F10", key: "F10" });
    const first = document.querySelector("[data-kg-toolbar-button] button") as HTMLElement;
    expect(document.activeElement).toBe(first);
    const buttons = [
      ...document.querySelectorAll("[data-kg-toolbar-button] button"),
    ] as HTMLElement[];
    await act(async () => {
      fireEvent.keyDown(first, { key: "ArrowRight" });
    });
    expect(document.activeElement).toBe(buttons[1]);
    await act(async () => {
      fireEvent.keyDown(buttons[1] as Element, { key: "End" });
    });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    await act(async () => {
      fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    });
    expect(document.activeElement).toBe(buttons[0]);
    await act(async () => {
      fireEvent.keyDown(buttons[0] as Element, { key: "ArrowLeft" });
    });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it("Escape returns to the text with the selection kept", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { altKey: true, code: "F10", key: "F10" });
    await act(async () => {
      fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    });
    await waitFor(() => expect(document.activeElement).toBe(api.editorInstance.getRootElement()));
    expect(button("underline")).not.toBeNull();
  });

  it("Enter on a button applies it, and focus stays on the toolbar", async () => {
    const api = await load();
    await selectAll(api);
    await press(api, { altKey: true, code: "F10", key: "F10" });
    await act(async () => {
      (button("underline") as HTMLElement).focus();
      fireEvent.click(button("underline") as Element);
    });
    expect(has(api, "underline")).toBe(true);
  });

  it("does nothing without a text selection", async () => {
    const api = await load();
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
    });
    await press(api, { altKey: true, code: "F10", key: "F10" });
    expect(document.activeElement).toBe(api.editorInstance.getRootElement());
  });
});
