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
import { act, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isElementNode, $isTextNode, type ElementNode } from "lexical";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const text = (value: string, extra: Record<string, unknown> = {}) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
  ...extra,
});

const block = (type: string, value: string, extra: Record<string, unknown> = {}) => ({
  children: [text(value)],
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const documentOf = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const selectFirstText = async (api: KoenigEditorAPI, toolbar = true) => {
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
  if (toolbar) {
    await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).not.toBeNull());
  }
};

const button = (name: string) =>
  document.querySelector(`[data-kg-toolbar-button="${name}"] button`) as HTMLElement | null;

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(button(name) as Element);
  });
};

const formats = (api: KoenigEditorAPI): string[] =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => ($isElementNode(child) ? child.getFormatType() : "") as string),
  );

const ITEMS = ["alignLeft", "alignCenter", "alignRight", "alignJustify"];

describe("alignment buttons in the selection toolbar", () => {
  it("names the four items for the toolbar option", () => {
    for (const item of ITEMS) expect(KOENIG_TOOLBAR_ITEMS).toContain(item);
  });

  it("shows a labelled button for each, with the left one marked on plain text", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api);
    for (const item of ITEMS) {
      expect(button(item), item).not.toBeNull();
      expect(button(item)?.getAttribute("aria-label")).toBeTruthy();
    }
    expect(button("alignLeft")?.getAttribute("data-kg-active")).toBe("true");
    expect(button("alignCenter")?.getAttribute("data-kg-active")).toBe("false");
  });

  it("aligns a paragraph, marks the new alignment and saves it in the document", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api);
    await click("alignCenter");
    expect(formats(api)).toEqual(["center"]);
    await waitFor(() => expect(button("alignCenter")?.getAttribute("data-kg-active")).toBe("true"));
    expect(api.serialize()).toContain('"format":"center"');
    await click("alignJustify");
    expect(formats(api)).toEqual(["justify"]);
    await click("alignRight");
    expect(formats(api)).toEqual(["right"]);
  });

  it("aligns headings, quotes and list items too", async () => {
    const doc = documentOf(block("heading", "Title", { tag: "h2" }), block("quote", "Quoted"), {
      children: [block("listitem", "Item", { value: 1 })],
      direction: null,
      format: "",
      indent: 0,
      listType: "bullet",
      start: 1,
      tag: "ul",
      type: "list",
      version: 1,
    });
    const api = (await mount({ composer: { initialEditorState: doc } })).api;
    for (const [index, type] of [
      [0, "heading"],
      [1, "quote"],
    ] as const) {
      await act(async () => {
        api.editorInstance.getRootElement()?.focus();
        api.editorInstance.update(() => {
          const node = (
            $getRoot().getChildAtIndex(index) as ElementNode | null
          )?.getFirstDescendant();
          if ($isTextNode(node)) node.select(0, node.getTextContentSize());
        });
      });
      await act(async () => {
        document.dispatchEvent(new Event("selectionchange"));
      });
      await waitFor(() => expect(button("alignCenter"), type).not.toBeNull());
      await click("alignCenter");
    }
    await act(async () => {
      api.editorInstance.update(() => {
        const node = ($getRoot().getChildAtIndex(2) as ElementNode | null)?.getFirstDescendant();
        if ($isTextNode(node)) node.select(0, node.getTextContentSize());
      });
    });
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => expect(button("alignRight")).not.toBeNull());
    await click("alignRight");
    const saved = JSON.parse(api.serialize()).root.children;
    expect(saved[0].format).toBe("center");
    expect(saved[1].format).toBe("center");
    expect(saved[2].children[0].format).toBe("right");
  });

  it("keeps saved alignment when a document loads", async () => {
    const api = (
      await mount({
        composer: {
          initialEditorState: documentOf(block("paragraph", "Hello", { format: "center" })),
        },
      })
    ).api;
    expect(formats(api)).toEqual(["center"]);
  });
});

describe("the marked alignment is visible in dark mode too", () => {
  it("gives the active button its own dark background, not the toolbar's", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api);
    const active = button("alignLeft") as HTMLElement;
    const inactive = button("alignCenter") as HTMLElement;
    expect(active.getAttribute("data-kg-active")).toBe("true");
    expect(active.className).toContain("dark:bg-grey-800");
    expect(active.className).not.toContain("dark:bg-grey-950");
    expect(inactive.className).toContain("dark:bg-grey-950");
  });
});

describe("the toolbar buttons in forced-colours mode", () => {
  it("use system colours for the icon, the marked button and the toolbar's edge", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api);
    const active = button("alignLeft") as HTMLElement;
    const inactive = button("alignCenter") as HTMLElement;
    expect(active.className).toContain("forced-colors:bg-[Highlight]");
    expect(active.querySelector("svg")?.getAttribute("class")).toContain(
      "forced-colors:text-[HighlightText]",
    );
    expect(inactive.querySelector("svg")?.getAttribute("class")).toContain(
      "forced-colors:text-[ButtonText]",
    );
    expect(active.closest("[data-kg-selection-toolbar]")?.className).toContain(
      "forced-colors:border-[ButtonText]",
    );
  });
});

describe("a read-only editor", () => {
  it("shows no selection toolbar, so nothing can change the document", async () => {
    const api = (
      await mount({
        composer: { editable: false, initialEditorState: documentOf(block("paragraph", "Hello")) },
      })
    ).api;
    await selectFirstText(api, false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(document.querySelector("[data-kg-toolbar-button]")).toBeNull();
    expect(formats(api)).toEqual([""]);
  });

  it("hides the toolbar when the editor becomes read-only while it is open", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api);
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).toBeNull());
  });
});

describe("the shortcuts", () => {
  const press = async (api: KoenigEditorAPI, key: string, extra: Record<string, boolean> = {}) => {
    await act(async () => {
      fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
        code: `Key${key}`,
        ctrlKey: true,
        key,
        shiftKey: true,
        ...extra,
      });
    });
  };

  it("align left, centre, right and justify with Ctrl or Cmd+Shift+L, E, R and J", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api, false);
    await press(api, "E");
    expect(formats(api)).toEqual(["center"]);
    await press(api, "R", { ctrlKey: false, metaKey: true });
    expect(formats(api)).toEqual(["right"]);
    await press(api, "J");
    expect(formats(api)).toEqual(["justify"]);
    await press(api, "L");
    expect(formats(api)).toEqual(["left"]);
  });

  it("do nothing without Shift", async () => {
    const api = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(api, false);
    await press(api, "E", { shiftKey: false });
    expect(formats(api)).toEqual([""]);
  });
});

describe("a host that leaves the buttons out", () => {
  const withoutAlignment = { toolbar: ["bold", "italic"] as const };

  it("shows no alignment buttons and ignores the shortcuts", async () => {
    const api = (
      await mount({
        composer: {
          initialEditorState: documentOf(block("paragraph", "Hello")),
          ...withoutAlignment,
        },
      })
    ).api;
    await selectFirstText(api);
    for (const item of ITEMS) expect(button(item), item).toBeNull();
    await act(async () => {
      fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
        code: "KeyE",
        ctrlKey: true,
        key: "E",
        shiftKey: true,
      });
    });
    expect(formats(api)).toEqual([""]);
  });

  it("still removes alignment from a document that has it, as before", async () => {
    const api = (
      await mount({
        composer: {
          initialEditorState: documentOf(block("paragraph", "Hello", { format: "center" })),
          ...withoutAlignment,
        },
      })
    ).api;
    await waitFor(() => expect(formats(api)).toEqual([""]));
  });
});

describe("right-to-left text", () => {
  it("marks right as the default alignment of a right-to-left block, and left of a left-to-right one", async () => {
    const rtl = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "שלום עולם")) } })
    ).api;
    await selectFirstText(rtl);
    await waitFor(() => expect(button("alignRight")?.getAttribute("data-kg-active")).toBe("true"));
    expect(button("alignLeft")?.getAttribute("data-kg-active")).toBe("false");
    cleanup();
    const ltr = (
      await mount({ composer: { initialEditorState: documentOf(block("paragraph", "Hello")) } })
    ).api;
    await selectFirstText(ltr);
    await waitFor(() => expect(button("alignLeft")?.getAttribute("data-kg-active")).toBe("true"));
  });
});
