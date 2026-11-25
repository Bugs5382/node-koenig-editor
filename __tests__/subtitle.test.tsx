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
  $getRoot,
  $getSelection,
  $isRangeSelection,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
} from "lexical";
import { getBlocks } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, paragraph } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const lineNode = (type: "subtitle" | "title", text: string, id?: string, format = 0) => ({
  children: text
    ? [{ detail: 0, format, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format: "",
  indent: 0,
  type,
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

const caretAt = async (api: Api, index: number, offset: "end" | "start") => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const block = $getRoot().getChildAtIndex(index) as ElementNode;
      if (offset === "end") block.selectEnd();
      else block.selectStart();
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

const caretBlock = (api: Api) =>
  api.editorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    return $isRangeSelection(selection)
      ? selection.anchor.getNode().getTopLevelElement()?.getIndexWithinParent()
      : -1;
  });

describe("the subtitle option is off by default", () => {
  it("adds no subtitle when only the title is on", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(paragraph("Body")), title: true },
    });
    expect(types(api)).toEqual(["title", "paragraph"]);
  });

  it("opens a document saved with a subtitle, and keeps it", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(
          lineNode("title", "Story", "aaaa"),
          lineNode("subtitle", "A line under it", "bbbb"),
          paragraph("Body"),
        ),
        title: true,
      },
    });
    expect(types(api)).toEqual(["title", "subtitle", "paragraph"]);
    expect(api.editorInstance.getRootElement()!.querySelector("h2.kg-subtitle")?.textContent).toBe(
      "A line under it",
    );
    expect(getBlocks(api.editorInstance.getEditorState())[1]).toMatchObject({
      id: "bbbb",
      type: "subtitle",
      text: "A line under it",
    });
  });
});

describe("the subtitle block", () => {
  it("is added under the title of a document that has none, with an id", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(paragraph("Body")),
        title: { subtitle: true },
      },
    });
    expect(types(api)).toEqual(["title", "subtitle", "paragraph"]);
    const block = getBlocks(api.editorInstance.getEditorState())[1]!;
    expect(block.type).toBe("subtitle");
    expect(block.id).toMatch(/^[0-9a-f]{4}$/);
    expect(block.after).toBe("title");
  });

  it("is added to an empty editor", async () => {
    const { api } = await mount({ composer: { title: { subtitle: true } } });
    expect(types(api).slice(0, 2)).toEqual(["title", "subtitle"]);
  });

  it("keeps the saved subtitle and its id, and saves the same document again", async () => {
    const source = documentOf(
      lineNode("title", "Story", "aaaa"),
      lineNode("subtitle", "Sub", "bbbb"),
      paragraph("Body"),
    );
    const one = await mount({
      composer: { initialEditorState: source, title: { subtitle: true } },
    });
    const saved = one.api.editorInstance.getEditorState().toJSON();
    expect(saved.root.children[1]).toMatchObject({ type: "subtitle", $: { id: "bbbb" } });
    cleanup();
    const two = await mount({
      composer: { initialEditorState: JSON.stringify(saved), title: { subtitle: true } },
    });
    expect(two.api.editorInstance.getEditorState().toJSON()).toEqual(saved);
  });

  it("an old document with a title and no subtitle opens with an empty subtitle added", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(lineNode("title", "Old", "aaaa"), paragraph("Body")),
        title: { subtitle: true },
      },
    });
    expect(types(api)).toEqual(["title", "subtitle", "paragraph"]);
    expect(getBlocks(api.editorInstance.getEditorState())[0]!.id).toBe("aaaa");
  });

  it("shows its placeholder while empty, from the option or the strings", async () => {
    const heading = (api: Api) =>
      api.editorInstance.getRootElement()!.querySelector("h2.kg-subtitle")!;
    const one = await mount({ composer: { title: { subtitle: true } } });
    expect(heading(one.api).getAttribute("data-kg-placeholder")).toBe("Subtitle");
    expect(heading(one.api).hasAttribute("data-kg-empty")).toBe(true);
    cleanup();
    const two = await mount({ composer: { title: { subtitle: { placeholder: "A deck line" } } } });
    expect(heading(two.api).getAttribute("data-kg-placeholder")).toBe("A deck line");
    cleanup();
    const three = await mount({
      composer: { title: { subtitle: true }, strings: { subtitlePlaceholder: "Untertitel" } },
    });
    expect(heading(three.api).getAttribute("data-kg-placeholder")).toBe("Untertitel");
  });

  it("a second subtitle becomes a paragraph, and a moved one goes back under the title", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(
          lineNode("title", "T"),
          paragraph("Body"),
          lineNode("subtitle", "One"),
          lineNode("subtitle", "Two"),
        ),
        title: { subtitle: true },
      },
    });
    expect(types(api)).toEqual(["title", "subtitle", "paragraph", "paragraph"]);
  });

  it("is plain: bold is dropped", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(lineNode("title", "T"), lineNode("subtitle", "Bold", "", 1)),
        title: { subtitle: true },
      },
    });
    const bold = api.editorInstance.getEditorState().read(() => {
      const text = ($getRoot().getChildAtIndex(1) as ElementNode).getFirstChild() as unknown as {
        getFormat: () => number;
      };
      return text.getFormat();
    });
    expect(bold).toBe(0);
  });
});

describe("Enter with the subtitle on", () => {
  it("Enter at the end of the title goes to the subtitle", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(
          lineNode("title", "Story"),
          lineNode("subtitle", "Sub"),
          paragraph("Body"),
        ),
        title: { subtitle: true },
      },
    });
    await caretAt(api, 0, "end");
    await enter(api);
    expect(types(api)).toEqual(["title", "subtitle", "paragraph"]);
    expect(caretBlock(api)).toBe(1);
  });

  it("Enter at the end of the subtitle goes to the body, without adding a line", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(
          lineNode("title", "Story"),
          lineNode("subtitle", "Sub"),
          paragraph("Body"),
        ),
        title: { subtitle: true },
      },
    });
    await caretAt(api, 1, "end");
    await enter(api);
    expect(types(api)).toEqual(["title", "subtitle", "paragraph"]);
    expect(caretBlock(api)).toBe(2);
  });

  it("Enter at the end of the subtitle with a card after it makes a paragraph for the body", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(lineNode("title", "Story"), lineNode("subtitle", "Sub"), {
          type: "horizontalrule",
          version: 1,
        }),
        title: { subtitle: true },
      },
    });
    await caretAt(api, 1, "end");
    await enter(api);
    expect(types(api).slice(0, 4)).toEqual(["title", "subtitle", "paragraph", "horizontalrule"]);
    expect(caretBlock(api)).toBe(2);
  });

  it("Backspace at the start of the subtitle does not merge it into the title", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(lineNode("title", "Story"), lineNode("subtitle", "Sub")),
        title: { subtitle: true },
      },
    });
    await caretAt(api, 1, "start");
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_BACKSPACE_COMMAND,
        new KeyboardEvent("keydown", { key: "Backspace" }),
      );
    });
    expect(types(api).slice(0, 2)).toEqual(["title", "subtitle"]);
    const text = getBlocks(api.editorInstance.getEditorState()).map((b) => b.text);
    expect(text.slice(0, 2)).toEqual(["Story", "Sub"]);
  });

  it("Delete at the end of the title does not pull the subtitle up", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf(lineNode("title", "Story"), lineNode("subtitle", "Sub")),
        title: { subtitle: true },
      },
    });
    await caretAt(api, 0, "end");
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_DELETE_COMMAND,
        new KeyboardEvent("keydown", { key: "Delete" }),
      );
    });
    const text = getBlocks(api.editorInstance.getEditorState()).map((b) => b.text);
    expect(text.slice(0, 2)).toEqual(["Story", "Sub"]);
  });
});
