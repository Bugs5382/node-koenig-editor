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
import { act, cleanup } from "@testing-library/react";
import {
  $createNodeSelection,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
} from "lexical";
import { getBlocks } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, paragraph } from "./__utils__/mount";
import { row } from "./__utils__/tables";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const blank = () => ({ ...paragraph(""), children: [] });
const callout = (id?: string) => ({
  type: "callout",
  version: 1,
  backgroundColor: "blue",
  calloutEmoji: "",
  calloutText: "Note",
  ...(id ? { $: { id } } : {}),
});
const divider = (id?: string) => ({
  type: "horizontalrule",
  version: 1,
  ...(id ? { $: { id } } : {}),
});
const image = (id?: string) => ({
  type: "image",
  version: 1,
  src: "https://example.com/a.png",
  alt: "A",
  ...(id ? { $: { id } } : {}),
});
const code = () => ({
  children: [
    { detail: 0, format: 0, mode: "normal", style: "", text: "a", type: "text", version: 1 },
  ],
  direction: null,
  format: "",
  indent: 0,
  language: "js",
  type: "code",
  version: 1,
});
const table = () => ({
  children: [row({ text: "a" }, { text: "b" })],
  direction: null,
  format: "",
  indent: 0,
  type: "table",
  version: 1,
});

const documentOf = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

/** "gap" is an empty paragraph, "paragraph" a filled one, anything else its node type. */
const shape = (api: Api) =>
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

const caret = (api: Api) =>
  api.editorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isNodeSelection(selection)) return `card:${selection.getNodes()[0]?.getType()}`;
    if ($isRangeSelection(selection)) {
      return `text:${selection.anchor.getNode().getTopLevelElement()?.getIndexWithinParent()}:${selection.anchor.offset}`;
    }
    return "none";
  });

const place = async (api: Api, index: number, where: "card" | "start" | "end") => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const node = $getRoot().getChildAtIndex(index)!;
      if (where === "card") {
        const selection = $createNodeSelection();
        selection.add(node.getKey());
        $setSelection(selection);
      } else if (where === "start") {
        (node as unknown as { selectStart: () => void }).selectStart();
      } else {
        (node as unknown as { selectEnd: () => void }).selectEnd();
      }
    });
  });
};

const press = async (api: Api, command: LexicalCommand<KeyboardEvent>, key: string) => {
  await act(async () => {
    api.editorInstance.dispatchCommand(command, new KeyboardEvent("keydown", { key }));
  });
};

describe("cardGaps: 'every' keeps an empty paragraph after every card", () => {
  it("puts one between two cards, after the last, and before a first card", async () => {
    const { api } = await mount({
      composer: {
        cardGaps: "every",
        initialEditorState: documentOf(callout(), divider(), image()),
      },
    });
    expect(shape(api)).toEqual(["gap", "callout", "gap", "horizontalrule", "gap", "image", "gap"]);
  });

  it("leaves a gap that is already there, and adds none between a card and text", async () => {
    const { api } = await mount({
      composer: {
        cardGaps: "every",
        initialEditorState: documentOf(
          paragraph("a"),
          callout(),
          paragraph("b"),
          divider(),
          blank(),
        ),
      },
    });
    expect(shape(api)).toEqual(["paragraph", "callout", "paragraph", "horizontalrule", "gap"]);
  });

  it("counts the code block and the table: the cursor cannot leave them by the arrow keys", async () => {
    const { api } = await mount({
      composer: { cardGaps: "every", initialEditorState: documentOf(table(), code()) },
    });
    expect(shape(api)).toEqual(["gap", "table", "gap", "code", "gap"]);
  });

  it("puts back a gap that is removed", async () => {
    const { api } = await mount({
      composer: { cardGaps: "every", initialEditorState: documentOf(callout(), divider()) },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().getChildAtIndex(2)?.remove();
      });
    });
    expect(shape(api)).toEqual(["gap", "callout", "gap", "horizontalrule", "gap"]);
  });

  it("the title does not need a gap before a card", async () => {
    const { api } = await mount({
      composer: {
        cardGaps: "every",
        title: true,
        initialEditorState: documentOf(callout()),
      },
    });
    expect(shape(api)[0]).toBe("title");
  });

  it("is off by default: two cards stay together and a deleted gap stays deleted", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(blank(), callout(), divider(), blank()) },
    });
    expect(shape(api)).toEqual(["gap", "callout", "horizontalrule", "gap"]);
  });
});

describe("the keyboard across a card boundary", () => {
  const base = () => documentOf(paragraph("above"), image("bbbb"), paragraph("below"));
  const idsAndText = (api: Api) =>
    getBlocks(api.editorInstance.getEditorState()).map((block) => `${block.type}:${block.text}`);

  it("Delete at the end of the paragraph above a card does not touch the paragraph or the cards beyond", async () => {
    const { api } = await mount({ composer: { initialEditorState: base() } });
    await place(api, 0, "end");
    await press(api, KEY_DELETE_COMMAND as LexicalCommand<KeyboardEvent>, "Delete");
    const list = idsAndText(api);
    expect(list).toContain("paragraph:above");
    expect(list).toContain("paragraph:below");
    expect(list.filter((item) => item === "image:").length).toBeLessThanOrEqual(1);
  });

  it("Backspace at the start of the paragraph below a card keeps both paragraphs' text", async () => {
    const { api } = await mount({ composer: { initialEditorState: base() } });
    await place(api, 2, "start");
    await press(api, KEY_BACKSPACE_COMMAND as LexicalCommand<KeyboardEvent>, "Backspace");
    const list = idsAndText(api);
    expect(list).toContain("paragraph:above");
    expect(list).toContain("paragraph:below");
  });

  it("Backspace on a selected card removes only that card, and its neighbours keep their ids", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(paragraph("above"), image("bbbb"), paragraph("below")),
      },
    });
    const before = getBlocks(api.editorInstance.getEditorState());
    const idAbove = before[0]!.id;
    const idBelow = before.find((block) => block.text === "below")!.id;
    await place(api, 1, "card");
    await press(api, KEY_BACKSPACE_COMMAND as LexicalCommand<KeyboardEvent>, "Backspace");
    const after = getBlocks(api.editorInstance.getEditorState());
    expect(after.some((block) => block.type === "image")).toBe(false);
    expect(after.find((block) => block.text === "above")?.id).toBe(idAbove);
    expect(after.find((block) => block.text === "below")?.id).toBe(idBelow);
  });

  it("Delete on a selected card removes only that card", async () => {
    const { api } = await mount({ composer: { initialEditorState: base() } });
    await place(api, 1, "card");
    await press(api, KEY_DELETE_COMMAND as LexicalCommand<KeyboardEvent>, "Delete");
    const list = idsAndText(api);
    expect(list).not.toContain("image:");
    expect(list).toContain("paragraph:above");
    expect(list).toContain("paragraph:below");
  });

  it("Enter in the paragraph above a card adds a line there and leaves the card where it was", async () => {
    const { api } = await mount({ composer: { initialEditorState: base() } });
    await place(api, 0, "end");
    await press(api, KEY_ENTER_COMMAND as LexicalCommand<KeyboardEvent>, "Enter");
    expect(shape(api)).toEqual(["paragraph", "gap", "image", "paragraph"]);
  });

  it("a card at the very start can be reached from the line above it", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf(image()) } });
    await place(api, 1, "card");
    await press(api, KEY_ARROW_UP_COMMAND as LexicalCommand<KeyboardEvent>, "ArrowUp");
    expect(caret(api)).toMatch(/^text:0/);
  });
});
