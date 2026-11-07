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
import { $generateHtmlFromNodes } from "@lexical/html";
import { $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const empty = {
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
};
const doc = (items: { content: string; heading: string }[]) =>
  JSON.stringify({
    root: {
      children: [empty, { items, type: "toggle-group", version: 1 }, empty],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const THREE = [
  { content: "<p>Answer one</p>", heading: "Question one" },
  { content: "<p>Answer two</p>", heading: "Question two" },
  { content: "<p>Answer three</p>", heading: "Question three" },
];

interface Group {
  addItem(): void;
  removeItem(index: number): void;
}

const group = (api: KoenigEditorAPI) =>
  (
    JSON.parse(String(api.serialize())) as { root: { children: Record<string, unknown>[] } }
  ).root.children.find((child) => child.type === "toggle-group") as {
    items: { content: string; heading: string }[];
  };

describe("toggle group data", () => {
  it("keeps every item through a load and a save, with no limit on the count", async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      content: `<p>Body ${index}</p>`,
      heading: `Head ${index}`,
    }));
    const { api } = await mount({ composer: { initialEditorState: doc(many) } });
    const saved = group(api).items;
    expect(saved).toHaveLength(12);
    expect(saved[7]?.heading).toContain("Head 7");
    expect(saved[7]?.content).toContain("Body 7");
  });

  it("adds and removes items, and keeps one", async () => {
    const { api } = await mount({ composer: { initialEditorState: doc(THREE) } });
    const key = () =>
      api.editorInstance.getEditorState().read(() =>
        $getRoot()
          .getChildren()
          .find((node) => node.getType() === "toggle-group")!
          .getKey(),
      );
    const run = async (fn: (node: Group) => void) => {
      await act(async () => {
        api.editorInstance.update(() =>
          fn(api.editorInstance.getEditorState()._nodeMap.get(key()) as unknown as Group),
        );
      });
    };
    await run((node) => node.addItem());
    expect(group(api).items).toHaveLength(4);
    await run((node) => node.removeItem(0));
    expect(group(api).items.map((item) => item.heading)).toEqual([
      expect.stringContaining("Question two"),
      expect.stringContaining("Question three"),
      "",
    ]);
    await run((node) => node.removeItem(0));
    await run((node) => node.removeItem(0));
    await run((node) => node.removeItem(0));
    expect(group(api).items).toHaveLength(1);
  });
});

describe("toggle group HTML", () => {
  const html = (api: KoenigEditorAPI) =>
    api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));

  it("saves one wrapper holding a toggle per item", async () => {
    const { api } = await mount({ composer: { initialEditorState: doc(THREE) } });
    const dom = new DOMParser().parseFromString(html(api), "text/html");
    const wrapper = dom.querySelector(".kg-toggle-group-card") as HTMLElement;
    expect(wrapper).not.toBeNull();
    const items = wrapper.querySelectorAll(":scope > .kg-toggle-card");
    expect(items).toHaveLength(3);
    expect(items[1]?.querySelector(".kg-toggle-heading-text")?.textContent).toBe("Question two");
    expect(items[2]?.querySelector(".kg-toggle-content")?.textContent).toBe("Answer three");
  });

  it("reads its own HTML back as one group, not as separate toggles", async () => {
    const { api } = await mount({ composer: { initialEditorState: doc(THREE) } });
    const saved = html(api);
    const { api: again } = await mount({ composer: { initialEditorState: doc([]) } });
    const { $generateNodesFromDOM } = await import("@lexical/html");
    let imported: { type: string; items?: unknown[] }[] = [];
    again.editorInstance.update(
      () => {
        const dom = new DOMParser().parseFromString(saved, "text/html");
        imported = $generateNodesFromDOM(again.editorInstance, dom).map((node) =>
          node.exportJSON(),
        ) as never;
      },
      { discrete: true },
    );
    expect(imported.filter((node) => node.type === "toggle-group")).toHaveLength(1);
    expect(imported.filter((node) => node.type === "toggle")).toHaveLength(0);
    expect(imported.find((node) => node.type === "toggle-group")?.items).toHaveLength(3);
  });
});

describe("toggle group card", () => {
  it("is listed in the menus and is inserted from there", async () => {
    const { api } = await mount({ composer: { initialEditorState: doc([]) } });
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Toggle group");
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card-menu-item="Toggle group"]') as Element);
    });
    await waitFor(() => expect(document.querySelector("[data-kg-toggle-group]")).not.toBeNull());
  });

  it("stacks the items with no gap and opens each one on its own for a reader", async () => {
    await mount({ composer: { editable: false, initialEditorState: doc(THREE) } });
    const stack = document.querySelector("[data-kg-toggle-group]") as HTMLElement;
    expect(stack.className).not.toMatch(/\b(gap|space-y|my|mb)-/);
    const items = [...stack.querySelectorAll("[data-kg-toggle-group-item]")];
    expect(items).toHaveLength(3);
    const panel = (index: number) =>
      items[index]!.querySelector("[data-kg-toggle-panel]") as HTMLElement;
    expect(panel(0).hidden).toBe(true);
    await act(async () => {
      fireEvent.click(items[1]!.querySelector("[data-kg-toggle-button]") as Element);
    });
    expect(panel(1).hidden).toBe(false);
    expect(panel(0).hidden).toBe(true);
    expect(panel(2).hidden).toBe(true);
    expect(items[1]!.querySelector("[data-kg-toggle-button]")?.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("is left out when the host does not list it", async () => {
    const { api } = await mount({ composer: { cards: ["divider"], initialEditorState: doc([]) } });
    expect(api.editorInstance._nodes.has("toggle-group")).toBe(false);
    expect(await openSlashMenu(api)).not.toContain("Toggle group");
  });
});
