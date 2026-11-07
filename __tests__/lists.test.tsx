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
import { $isListItemNode, $isListNode, type ListItemNode, type ListNode } from "@lexical/list";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode, type ElementNode, type TextNode } from "lexical";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

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
const item = (value: string, n: number, extra: Record<string, unknown> = {}) => ({
  children: [text(value)],
  direction: null,
  format: "",
  indent: 0,
  type: "listitem",
  value: n,
  version: 1,
  ...extra,
});
const list = (listType: string, ...items: unknown[]) => ({
  children: items,
  direction: null,
  format: "",
  indent: 0,
  listType,
  start: 1,
  tag: listType === "number" ? "ol" : "ul",
  type: "list",
  version: 1,
});
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const load = async (state: string, composer: Record<string, unknown> = {}) =>
  (await mount({ composer: { initialEditorState: state, ...composer } })).api;

const caretIn = async (api: KoenigEditorAPI, textOf: string) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const walk = (node: ElementNode): TextNode | null => {
        for (const child of node.getChildren()) {
          if ($isTextNode(child) && child.getTextContent() === textOf) return child;
          if ("getChildren" in child) {
            const found = walk(child as ElementNode);
            if (found) return found;
          }
        }
        return null;
      };
      walk($getRoot())?.select(0, textOf.length);
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
const top = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) =>
        $isListNode(child) ? `list:${(child as ListNode).getListType()}` : child.getType(),
      ),
  );
const indents = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => {
    const result: number[] = [];
    const walk = (node: ElementNode) => {
      for (const child of node.getChildren()) {
        if ($isListItemNode(child) && !$isListNode((child as ListItemNode).getFirstChild())) {
          result.push((child as ListItemNode).getIndent());
        }
        if ("getChildren" in child) walk(child as ElementNode);
      }
    };
    walk($getRoot());
    return result;
  });

const LIST_ITEMS = ["bulletList", "numberList", "checkList", "indent", "outdent"];

describe("list buttons in the selection toolbar", () => {
  it("names the items for the toolbar option", () => {
    for (const name of LIST_ITEMS) expect(KOENIG_TOOLBAR_ITEMS).toContain(name);
  });

  it("shows a labelled button for each", async () => {
    const api = await load(documentOf("Hello"));
    await caretIn(api, "Hello");
    for (const name of LIST_ITEMS) {
      expect(button(name), name).not.toBeNull();
      expect(button(name)?.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("turns a paragraph into each kind of list, marks the button, and back again", async () => {
    const api = await load(documentOf("Hello"));
    await caretIn(api, "Hello");
    for (const [name, type] of [
      ["bulletList", "bullet"],
      ["numberList", "number"],
      ["checkList", "check"],
    ] as const) {
      await click(name);
      expect(top(api)).toEqual([`list:${type}`]);
      await waitFor(() => expect(button(name)?.getAttribute("data-kg-active")).toBe("true"));
      await click(name);
      expect(top(api)).toEqual(["paragraph"]);
      await caretIn(api, "Hello");
    }
  });

  it("is left out when the host's toolbar option leaves it out", async () => {
    const api = await load(documentOf("Hello"), { toolbar: ["bold", "bulletList"] });
    await caretIn(api, "Hello");
    expect(button("bulletList")).not.toBeNull();
    for (const name of ["numberList", "checkList", "indent", "outdent"]) {
      expect(button(name), name).toBeNull();
    }
  });
});

describe("a check list", () => {
  it("draws items that a screen reader reads as checkboxes", async () => {
    await load(doc(list("check", item("One", 1), item("Two", 2, { checked: true }))));
    const list_ = document.querySelector("ul") as HTMLElement;
    expect(list_.classList.contains("kg-checklist")).toBe(true);
    const items = [...document.querySelectorAll("li")] as HTMLElement[];
    expect(items.map((li) => li.getAttribute("role"))).toEqual(["checkbox", "checkbox"]);
    expect(items.map((li) => li.getAttribute("aria-checked"))).toEqual(["false", "true"]);
  });

  it("saves the checked state", async () => {
    const api = await load(doc(list("check", item("One", 1, { checked: true }))));
    expect(api.serialize()).toContain('"checked":true');
  });
});

describe("indent and outdent", () => {
  const nested = () => doc(list("bullet", item("One", 1), item("Two", 2)));

  it("nest and un-nest a list item", async () => {
    const api = await load(nested());
    await caretIn(api, "Two");
    await click("indent");
    expect(indents(api)).toEqual([0, 1]);
    await click("outdent");
    expect(indents(api)).toEqual([0, 0]);
  });

  it("indent a paragraph too", async () => {
    const api = await load(documentOf("Hello"));
    await caretIn(api, "Hello");
    await click("indent");
    expect(
      api.editorInstance
        .getEditorState()
        .read(() => ($getRoot().getFirstChild() as ElementNode).getIndent()),
    ).toBe(1);
  });
});

describe("Tab in a list", () => {
  const press = async (api: KoenigEditorAPI, init: KeyboardEventInit) => {
    await act(async () => {
      fireEvent.keyDown(api.editorInstance.getRootElement() as Element, init);
    });
  };

  it("indents with Tab and outdents with Shift+Tab, as the editor already did", async () => {
    const api = await load(doc(list("bullet", item("One", 1), item("Two", 2))));
    await caretIn(api, "Two");
    await press(api, { code: "Tab", key: "Tab" });
    expect(indents(api)).toEqual([0, 1]);
    await press(api, { code: "Tab", key: "Tab", shiftKey: true });
    expect(indents(api)).toEqual([0, 0]);
  });
});
