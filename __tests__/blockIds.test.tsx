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
  type TextNode,
  $copyNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  KEY_ENTER_COMMAND,
} from "lexical";
import {
  getBlockById,
  getBlocks,
  getPostMeta,
  resolveFeaturedImage,
  setPostMeta,
} from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const para = (text: string, id?: string) => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
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
const divider = (id?: string) => ({
  type: "horizontalrule",
  version: 1,
  ...(id ? { $: { id } } : {}),
});

const documentOf = (children: unknown[], root: Record<string, unknown> = {}) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1, ...root },
  });

type Api = Awaited<ReturnType<typeof mount>>["api"];
const blocks = (api: Api) => getBlocks(api.editorInstance.getEditorState());

describe("block ids", () => {
  it("keeps the ids a document was saved with", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf([para("one", "aaaa"), image("bbbb"), para("two", "cccc")]),
      },
    });
    expect(blocks(api).map((block) => block.id)).toEqual(["aaaa", "bbbb", "cccc"]);
  });

  it("gives a new block an id, four hex characters, unique in the document", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf([para("one", "aaaa")]) },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().append($createParagraphNode().append($createTextNode("new")));
      });
    });
    const ids = blocks(api).map((block) => block.id);
    expect(ids[0]).toBe("aaaa");
    expect(ids[1]).toMatch(/^[0-9a-f]{4}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("splitting a paragraph with Enter keeps the id on the first half and gives the second its own", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf([para("hello", "aaaa")]) },
    });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = ($getRoot().getFirstChild() as ElementNode).getFirstChild() as TextNode;
        text.select(2, 2);
      });
    });
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_ENTER_COMMAND,
        new KeyboardEvent("keydown", { key: "Enter" }),
      );
    });
    const list = blocks(api);
    const first = list.find((block) => block.text === "he");
    const second = list.find((block) => block.text === "llo");
    expect(first?.id).toBe("aaaa");
    expect(second?.id).toMatch(/^[0-9a-f]{4}$/);
    expect(second?.id).not.toBe("aaaa");
  });

  it("a pasted copy of a block gets a new id and the original keeps its own", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf([para("one", "aaaa"), image("bbbb")]) },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        const original = $getRoot().getChildren()[0] as ElementNode;
        // a copy that carries the original's state, put above it, as a paste above would
        const copy = $copyNode(original);
        copy.append($createTextNode("one"));
        original.insertBefore(copy);
      });
    });
    const list = blocks(api).filter((block) => block.type === "paragraph" && block.text !== "");
    expect(list.map((block) => block.text)).toEqual(["one", "one"]);
    // the original is the one that existed before: it is second now and still has its id
    expect(list[1]!.id).toBe("aaaa");
    expect(list[0]!.id).not.toBe("aaaa");
    expect(list[0]!.id).toMatch(/^[0-9a-f]{4}$/);
  });

  it("moving a card keeps its id, and deleting a card leaves its neighbours' ids alone", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf([
          para("one", "aaaa"),
          image("bbbb"),
          divider("cccc"),
          para("two", "dddd"),
        ]),
      },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        const card = $getRoot().getChildren()[1]!;
        $getRoot().getChildren()[3]!.insertAfter(card);
      });
    });
    const named = (api: Api) =>
      blocks(api)
        .filter((block) => block.type !== "paragraph" || block.text !== "")
        .map((block) => block.id);
    expect(named(api)).toEqual(["aaaa", "cccc", "dddd", "bbbb"]);
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().getChildren()[1]!.remove();
      });
    });
    const left = blocks(api);
    expect(named(api)).toEqual(["aaaa", "dddd", "bbbb"]);
    expect(left.find((block) => block.id === "dddd")?.text).toBe("two");
    expect(left.find((block) => block.id === "bbbb")?.type).toBe("image");
  });

  it("marks each block's element with its id, type and the type above", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf([para("one", "aaaa"), image("bbbb")]) },
    });
    const root = api.editorInstance.getRootElement()!;
    const first = root.querySelector('[data-kg-block-id="aaaa"]')!;
    const second = root.querySelector('[data-kg-block-id="bbbb"]')!;
    expect(first.getAttribute("data-kg-block-type")).toBe("paragraph");
    expect(first.hasAttribute("data-kg-after")).toBe(false);
    expect(second.getAttribute("data-kg-block-type")).toBe("image");
    expect(second.getAttribute("data-kg-after")).toBe("paragraph");
  });

  it("does not add ids to a read-only editor, but still marks the ones it has", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf([para("one", "aaaa"), para("two")]),
        editable: false,
      },
      editor: { readOnly: true },
    });
    expect(blocks(api).map((block) => block.id)).toEqual(["aaaa", ""]);
    expect(
      api.editorInstance.getRootElement()!.querySelector('[data-kg-block-id="aaaa"]'),
    ).not.toBeNull();
  });
});

describe("getBlocks and getBlockById", () => {
  const source = documentOf([para("one", "aaaa"), image("bbbb")]);

  it("lists the same shape for a paragraph and a card, from a string, an object or a state", () => {
    const list = getBlocks(source);
    expect(list.map(({ id, type, index, after }) => ({ id, type, index, after }))).toEqual([
      { id: "aaaa", type: "paragraph", index: 0, after: null },
      { id: "bbbb", type: "image", index: 1, after: "paragraph" },
    ]);
    expect(getBlocks(JSON.parse(source))).toEqual(list);
    expect(list[0]!.text).toBe("one");
  });

  it("finds a block by id, and returns null for an unknown or empty id", () => {
    expect(getBlockById(source, "bbbb")?.type).toBe("image");
    expect(getBlockById(source, "zzzz")).toBeNull();
    expect(getBlockById(source, "")).toBeNull();
  });
});

describe("post fields and the featured image", () => {
  const meta = {
    displayTitle: "A custom title",
    displaySubtitle: "A subtitle",
    featuredImageRef: "bbbb",
  };
  const source = documentOf([para("one", "aaaa"), image("bbbb"), divider("cccc")], {
    $: { post: meta },
  });

  it("round-trip with the document", async () => {
    const one = await mount({ composer: { initialEditorState: source } });
    const saved = one.api.editorInstance.getEditorState().toJSON();
    expect(getPostMeta(saved)).toEqual(meta);
    cleanup();
    const two = await mount({ composer: { initialEditorState: JSON.stringify(saved) } });
    expect(two.api.editorInstance.getEditorState().toJSON()).toEqual(saved);
  });

  it("are empty for a document that has none", () => {
    expect(getPostMeta(documentOf([para("one")]))).toEqual({
      displayTitle: "",
      displaySubtitle: "",
      featuredImageRef: "",
    });
  });

  it("change one field and keep the others", async () => {
    const { api } = await mount({ composer: { initialEditorState: source } });
    await act(async () => setPostMeta(api.editorInstance, { displayTitle: "Changed" }));
    expect(getPostMeta(api.editorInstance.getEditorState())).toEqual({
      ...meta,
      displayTitle: "Changed",
    });
  });

  it("the featured image resolves to its image card by id", () => {
    expect(resolveFeaturedImage(source)?.node).toMatchObject({ type: "image", alt: "A" });
    expect(resolveFeaturedImage(source, "bbbb")?.id).toBe("bbbb");
  });

  it("is null when the card is gone, is not an image, or no image is chosen", () => {
    expect(resolveFeaturedImage(source, "cccc")).toBeNull();
    expect(resolveFeaturedImage(source, "zzzz")).toBeNull();
    expect(resolveFeaturedImage(documentOf([para("x", "aaaa")]))).toBeNull();
  });
});
