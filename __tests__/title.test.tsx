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
  type ElementNode,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ENTER_COMMAND,
} from "lexical";
import { getBlocks, getWordCount } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, paragraph } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const titleNode = (text: string, id?: string) => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format: "",
  indent: 0,
  type: "title",
  version: 1,
  ...(id ? { $: { id } } : {}),
});

const documentOf = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const types = (api: Api) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => child.getType()),
  );

const caretAt = async (api: Api, index: number, offset: "end" | "start" | number) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const block = $getRoot().getChildAtIndex(index) as ElementNode;
      if (offset === "end") block.selectEnd();
      else if (offset === "start") block.selectStart();
      else
        (block.getFirstChild() as unknown as { select: (a: number, b: number) => void }).select(
          offset,
          offset,
        );
    });
  });
};

const enter = (api: Api) =>
  act(async () => {
    api.editorInstance.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent("keydown", { key: "Enter" }),
    );
  });

describe("the title option is off by default", () => {
  it("adds no title to a document", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(paragraph("Body")) },
    });
    expect(types(api)).toEqual(["paragraph"]);
  });

  it("opens a document saved with a title, and keeps it", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(titleNode("Saved", "aaaa"), paragraph("Body")) },
    });
    expect(types(api)).toEqual(["title", "paragraph"]);
    expect(api.editorInstance.getRootElement()!.querySelector("h1.kg-title")?.textContent).toBe(
      "Saved",
    );
    expect(getBlocks(api.editorInstance.getEditorState())[0]).toMatchObject({
      id: "aaaa",
      type: "title",
      text: "Saved",
    });
  });
});

describe("the title block", () => {
  it("is added as the first block of a document that has none, with an id", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(paragraph("Body")), title: true },
    });
    expect(types(api)).toEqual(["title", "paragraph"]);
    const first = getBlocks(api.editorInstance.getEditorState())[0]!;
    expect(first.type).toBe("title");
    expect(first.id).toMatch(/^[0-9a-f]{4}$/);
  });

  it("is added to an empty editor", async () => {
    const { api } = await mount({ composer: { title: true } });
    expect(types(api)[0]).toBe("title");
  });

  it("keeps the saved title and its id, and saves the same document again", async () => {
    const source = documentOf(titleNode("My story", "aaaa"), paragraph("Body"));
    const one = await mount({ composer: { initialEditorState: source, title: true } });
    const saved = one.api.editorInstance.getEditorState().toJSON();
    expect(saved.root.children[0]).toMatchObject({ type: "title", $: { id: "aaaa" } });
    cleanup();
    const two = await mount({
      composer: { initialEditorState: JSON.stringify(saved), title: true },
    });
    expect(two.api.editorInstance.getEditorState().toJSON()).toEqual(saved);
  });

  it("shows its placeholder while empty, from the option or the strings", async () => {
    const one = await mount({ composer: { title: true } });
    const heading = () => one.api.editorInstance.getRootElement()!.querySelector("h1.kg-title")!;
    expect(heading().getAttribute("data-kg-placeholder")).toBe("Title");
    expect(heading().hasAttribute("data-kg-empty")).toBe(true);
    cleanup();
    const two = await mount({ composer: { title: { placeholder: "Add a headline" } } });
    expect(
      two.api.editorInstance
        .getRootElement()!
        .querySelector("h1.kg-title")!
        .getAttribute("data-kg-placeholder"),
    ).toBe("Add a headline");
    cleanup();
    const three = await mount({
      composer: { title: true, strings: { titlePlaceholder: "Titel" } },
    });
    expect(
      three.api.editorInstance
        .getRootElement()!
        .querySelector("h1.kg-title")!
        .getAttribute("data-kg-placeholder"),
    ).toBe("Titel");
  });

  it("a second title becomes a paragraph, and a moved title goes back to the top", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(paragraph("A"), titleNode("T1"), titleNode("T2")),
        title: true,
      },
    });
    expect(types(api).filter((type) => type === "title")).toHaveLength(1);
    expect(types(api)[0]).toBe("title");
    await act(async () => {
      api.editorInstance.update(() => {
        const children = $getRoot().getChildren();
        children[children.length - 1]!.insertAfter(children[0]!);
      });
    });
    expect(types(api)[0]).toBe("title");
  });

  it("Enter at the end of the title goes to the first line of the body without adding one", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(titleNode("Story"), paragraph("Body")),
        title: true,
      },
    });
    await caretAt(api, 0, "end");
    await enter(api);
    expect(types(api)).toEqual(["title", "paragraph"]);
    const where = api.editorInstance.getEditorState().read(() => {
      const selection = $getSelection();
      return $isRangeSelection(selection)
        ? selection.anchor.getNode().getTopLevelElement()?.getIndexWithinParent()
        : -1;
    });
    expect(where).toBe(1);
  });

  it("Enter at the end of a title with a card after it makes a paragraph for the body", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(titleNode("Story"), { type: "horizontalrule", version: 1 }),
        title: true,
      },
    });
    await caretAt(api, 0, "end");
    await enter(api);
    expect(types(api).slice(0, 3)).toEqual(["title", "paragraph", "horizontalrule"]);
  });

  it("Enter in the middle splits the title: the rest becomes the body's first line", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(titleNode("Hello world")), title: true },
    });
    await caretAt(api, 0, 5);
    await enter(api);
    const blocks = getBlocks(api.editorInstance.getEditorState());
    expect(blocks.slice(0, 2).map(({ type, text }) => [type, text])).toEqual([
      ["title", "Hello"],
      ["paragraph", " world"],
    ]);
  });

  it("Backspace at the start of the title changes nothing, and the title stays", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(titleNode("Story"), paragraph("Body")),
        title: true,
      },
    });
    await caretAt(api, 0, "start");
    await act(async () => {
      api.editorInstance.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.deleteCharacter(true);
      });
    });
    const blocks = getBlocks(api.editorInstance.getEditorState());
    expect(blocks.map(({ type, text }) => [type, text])).toEqual([
      ["title", "Story"],
      ["paragraph", "Body"],
    ]);
  });

  it("removing all of its text leaves an empty title, not no title", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(titleNode("Story"), paragraph("Body")),
        title: true,
      },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        ($getRoot().getFirstChild() as ElementNode).clear();
      });
    });
    expect(types(api)).toEqual(["title", "paragraph"]);
  });

  it("is plain: bold is dropped and a line break is removed", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(titleNode("Story")), title: true },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        const title = $getRoot().getFirstChild() as ElementNode;
        const text = title.getFirstChild() as unknown as { setFormat: (n: number) => void };
        text.setFormat(1);
        title.append($createLineBreakNode(), $createTextNode("more"));
      });
    });
    const json = api.editorInstance.getEditorState().toJSON().root.children[0] as unknown as {
      children: { type: string; format?: number; text?: string }[];
    };
    expect(json.children.map((child) => child.type)).toEqual(["text"]);
    expect(json.children[0]).toMatchObject({ format: 0, text: "Storymore" });
  });

  it("the card menu does not open when / is typed in the title", async () => {
    const { api } = await mount({ composer: { title: true } });
    await caretAt(api, 0, "start");
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keypress", { key: "/" }));
      api.editorInstance.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, "/");
    });
    expect(getBlocks(api.editorInstance.getEditorState())[0]).toMatchObject({
      type: "title",
      text: "/",
    });
    expect(document.querySelectorAll("[data-kg-card-menu-item]")).toHaveLength(0);
  });

  it("a paste of several paragraphs into the title leaves one title and puts the rest in the body", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(titleNode("Story")), title: true },
    });
    await caretAt(api, 0, "end");
    await act(async () => {
      api.editorInstance.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        const a = $createParagraphNode().append($createTextNode(" one"));
        const b = $createParagraphNode().append($createTextNode("two"));
        selection.insertNodes([a, b]);
      });
    });
    expect(types(api).filter((type) => type === "title")).toHaveLength(1);
    expect(types(api)[0]).toBe("title");
    const blocks = getBlocks(api.editorInstance.getEditorState());
    expect(blocks.map((block) => block.text).join("|")).toContain("two");
  });

  it("counts toward the word count and saves in the document", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(titleNode("Two words"), paragraph("Body")),
        title: true,
      },
    });
    expect(getWordCount(api.editorInstance.getEditorState())).toBe(3);
  });
});
