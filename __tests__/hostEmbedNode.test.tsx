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
import { cleanup } from "@testing-library/react";
import { DecoratorNode, type SerializedLexicalNode } from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// A host's own node of type "embed", shaped like a document kept from an older app.
type HostEmbedJSON = SerializedLexicalNode & {
  embedId: string;
  props: Record<string, unknown>;
  fallback: string;
};

class HostEmbedNode extends DecoratorNode<null> {
  __embedId: string;
  __props: Record<string, unknown>;
  __fallback: string;

  static override getType() {
    return "embed";
  }
  static override clone(node: HostEmbedNode) {
    return new HostEmbedNode(node.__embedId, node.__props, node.__fallback, node.__key);
  }
  static override importJSON(json: HostEmbedJSON) {
    return new HostEmbedNode(json.embedId, json.props, json.fallback);
  }
  constructor(embedId = "", props = {}, fallback = "", key?: string) {
    super(key);
    this.__embedId = embedId;
    this.__props = props;
    this.__fallback = fallback;
  }
  override exportJSON(): HostEmbedJSON {
    return {
      type: "embed",
      version: 1,
      embedId: this.__embedId,
      props: this.__props,
      fallback: this.__fallback,
    };
  }
  override createDOM() {
    return document.createElement("div");
  }
  override updateDOM() {
    return false;
  }
  override isInline() {
    return false;
  }
  override decorate() {
    return null;
  }
}

const stored = {
  type: "embed",
  version: 1,
  embedId: "legacy-42",
  props: { a: 1, nested: { b: [1, 2] } },
  fallback: "A talk",
};
const documentWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
const emptyParagraph = {
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
};
const embeds = (api: Awaited<ReturnType<typeof mount>>["api"]) =>
  (api.editorInstance.getEditorState().toJSON().root.children as Record<string, unknown>[]).filter(
    (child) => child.type === "embed",
  );

describe("a host node of type embed", () => {
  it("keeps its stored JSON unchanged", async () => {
    const { api } = await mount({
      composer: {
        customNodes: [HostEmbedNode],
        initialEditorState: documentWith(stored),
      },
    });
    expect(embeds(api)).toEqual([stored]);
  });

  it("wins even when cards lists embed, hides the menu entry and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { api } = await mount({
      composer: {
        cards: ["image", "embed"],
        customNodes: [HostEmbedNode],
        initialEditorState: documentWith(stored, emptyParagraph),
      },
    });
    expect(embeds(api)).toEqual([stored]);
    expect(await openSlashMenu(api)).not.toContain("Embed");
    expect(warn.mock.calls.flat().join(" ")).toMatch(/embed/);
  });

  it("is not reported as an unregistered embed plugin", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await mount({ composer: { cards: ["image", "embed"], customNodes: [HostEmbedNode] } });
    expect(error.mock.calls.flat().join(" ")).not.toContain("EmbedNode not registered");
  });

  it("does not warn when the card is not asked for", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount({ composer: { customNodes: [HostEmbedNode] } });
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/embed/i);
  });
});

describe("without a host embed node", () => {
  it("the package embed card still works and does not warn", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { api } = await mount({
      composer: {
        cards: ["image", "embed"],
        initialEditorState: documentWith(
          { type: "embed", version: 1, url: "https://youtu.be/dQw4w9WgXcQ", title: "T" },
          emptyParagraph,
        ),
      },
    });
    expect(embeds(api)[0]).toMatchObject({ url: "https://youtu.be/dQw4w9WgXcQ", title: "T" });
    expect(await openSlashMenu(api)).toContain("Embed");
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/embed/i);
  });
});
