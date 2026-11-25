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
import { act, cleanup, fireEvent } from "@testing-library/react";
import {
  $createNodeSelection,
  $getRoot,
  $isParagraphNode,
  $setSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalCommand,
} from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu, paragraph } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const blank = () => ({ ...paragraph(""), children: [] });
const documentWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const saved = (api: Api) =>
  (
    api.editorInstance.getEditorState().toJSON().root.children as unknown as Record<
      string,
      unknown
    >[]
  ).filter((child) => child.type === "horizontalrule");

const insertFromMenu = async (api: Api, label: string) => {
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-card-menu-item="${label}"]`) as Element);
  });
};

const types = (api: Api) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) =>
        $isParagraphNode(child)
          ? child.getTextContent() === ""
            ? "gap"
            : "paragraph"
          : child.getType(),
      ),
  );

describe("the section break card", () => {
  it("is three dots by default, and a document remembers it", async () => {
    const { api } = await mount();
    await insertFromMenu(api, "Section break");
    expect(saved(api)).toHaveLength(1);
    expect(saved(api)[0]).toMatchObject({ type: "horizontalrule", variant: "dots" });
  });

  it("round trips both variants", async () => {
    const doc = documentWith(
      { type: "horizontalrule", version: 1, variant: "dots" },
      { type: "horizontalrule", version: 1, variant: "line" },
    );
    const one = await mount({ composer: { initialEditorState: doc } });
    expect(saved(one.api).map((node) => node.variant)).toEqual(["dots", "line"]);
    const firstPass = one.api.editorInstance.getEditorState().toJSON();
    cleanup();
    const two = await mount({ composer: { initialEditorState: JSON.stringify(firstPass) } });
    expect(two.api.editorInstance.getEditorState().toJSON()).toEqual(firstPass);
  });

  it("an old document with no variant keeps its line", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith({ type: "horizontalrule", version: 1 }) },
    });
    expect(saved(api)[0]).toMatchObject({ variant: "line" });
    expect(document.querySelector('[data-kg-card="horizontalrule"] hr')).not.toBeNull();
    expect(document.querySelector('[data-kg-section-break="dots"]')).toBeNull();
  });

  it("an unknown variant falls back to dots", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith({ type: "horizontalrule", version: 1, variant: "zigzag" }),
      },
    });
    expect(saved(api)[0]).toMatchObject({ variant: "dots" });
  });

  it("draws three dots as a separator, with the dots hidden from a screen reader", async () => {
    await mount({
      composer: {
        initialEditorState: documentWith({ type: "horizontalrule", version: 1, variant: "dots" }),
      },
    });
    const breakEl = document.querySelector('[data-kg-section-break="dots"]') as HTMLElement;
    expect(breakEl).not.toBeNull();
    expect(breakEl.getAttribute("role")).toBe("separator");
    const dots = breakEl.querySelectorAll("span");
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => expect(dot.getAttribute("aria-hidden")).toBe("true"));
  });

  it("the line variant is still a plain line", async () => {
    await mount({
      composer: {
        initialEditorState: documentWith({ type: "horizontalrule", version: 1, variant: "line" }),
      },
    });
    expect(document.querySelector('[data-kg-section-break="line"]')).not.toBeNull();
    expect(
      document.querySelector('[data-kg-section-break="line"] hr, hr[data-kg-section-break]'),
    ).not.toBeNull();
  });

  it("the reader view draws the same card", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith({ type: "horizontalrule", version: 1, variant: "dots" }),
      },
      editor: { readOnly: true } as never,
    });
    expect(api).toBeDefined();
    expect(document.querySelector('[data-kg-section-break="dots"]')).not.toBeNull();
  });

  it("the menus say Section break, and Divider still finds it", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Section break");
    expect(labels).not.toContain("Divider");
  });

  it("the line is its own menu entry", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Divider line");
    cleanup();
    const second = await mount();
    await insertFromMenu(second.api, "Divider line");
    expect(saved(second.api)[0]).toMatchObject({ variant: "line" });
  });

  it("the old wording can be kept by the host", async () => {
    const { api } = await mount({
      composer: { strings: { cards: { divider: { label: "Divider" } } } },
    });
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Divider");
  });

  it("exports an hr that reads as a section break", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith(
          { type: "horizontalrule", version: 1, variant: "dots" },
          { type: "horizontalrule", version: 1, variant: "line" },
        ),
      },
    });
    const html = api.editorInstance.read(() => {
      const nodes = $getRoot()
        .getChildren()
        .filter((n) => n.getType() === "horizontalrule");
      return nodes.map((n) => {
        const out = (
          n as unknown as { exportDOM: (e: unknown) => { element: HTMLElement } }
        ).exportDOM(api.editorInstance);
        return out.element.outerHTML;
      });
    });
    expect(html[0]).toContain("kg-section-break");
    expect(html[1]).toBe("<hr>");
  });
});

describe("the keyboard around a section break is unchanged", () => {
  const select = async (api: Api, index: number) => {
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const selection = $createNodeSelection();
        selection.add($getRoot().getChildAtIndex(index)!.getKey());
        $setSelection(selection);
      });
    });
  };
  const press = async (api: Api, command: LexicalCommand<KeyboardEvent>, key: string) => {
    await act(async () => {
      api.editorInstance.dispatchCommand(command, new KeyboardEvent("keydown", { key }));
    });
  };

  it("Backspace and Delete remove the selected card", async () => {
    for (const [command, key] of [
      [KEY_BACKSPACE_COMMAND, "Backspace"],
      [KEY_DELETE_COMMAND, "Delete"],
    ] as const) {
      const { api } = await mount({
        composer: {
          initialEditorState: documentWith(
            blank(),
            { type: "horizontalrule", version: 1 },
            blank(),
          ),
        },
      });
      const at = types(api).indexOf("horizontalrule");
      await select(api, at);
      await press(api, command as LexicalCommand<KeyboardEvent>, key);
      expect(types(api)).not.toContain("horizontalrule");
      cleanup();
    }
  });

  it("keeps an empty line before and after the card at the ends of a document", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith({ type: "horizontalrule", version: 1 }) },
    });
    expect(types(api)).toEqual(["gap", "horizontalrule", "gap"]);
  });
});
