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
import { describe, expect, it } from "vitest";
import {
  buildSnippet,
  defaultSettings,
  parseSettings,
  serializeSettings,
  SIZES,
  type Catalog,
} from "./config";

const catalog: Catalog = {
  cards: ["image", "gallery", "header", "divider", "callout"],
  tools: ["emojiPicker", "imageEditor"],
};

describe("settings in the page address", () => {
  it("starts with every card and tool on and the extras off", () => {
    const s = defaultSettings(catalog);
    expect(s.cards).toEqual(catalog.cards);
    expect(s.tools).toEqual(catalog.tools);
    expect(s).toMatchObject({
      comments: true,
      toolbarActions: true,
      readOnly: false,
      sampleUploads: true,
      size: 16,
    });
  });

  it("writes nothing for the defaults", () => {
    expect(serializeSettings(defaultSettings(catalog), catalog)).toBe("");
  });

  it("round-trips a changed configuration", () => {
    const s = {
      ...defaultSettings(catalog),
      cards: ["image", "divider"],
      tools: [],
      comments: false,
      readOnly: true,
      dark: true,
      sampleUploads: false,
      size: 20,
    };
    const query = serializeSettings(s, catalog);
    expect(parseSettings(`?${query}`, catalog)).toEqual(s);
  });

  it("keeps an empty list apart from a missing one", () => {
    const none = { ...defaultSettings(catalog), cards: [] };
    const query = serializeSettings(none, catalog);
    expect(query).toContain("cards=");
    expect(parseSettings(query, catalog).cards).toEqual([]);
    expect(parseSettings("", catalog).cards).toEqual(catalog.cards);
  });

  it("drops unknown names and keeps catalog order", () => {
    const s = parseSettings("cards=divider,bogus,image&tools=nope", catalog);
    expect(s.cards).toEqual(["image", "divider"]);
    expect(s.tools).toEqual([]);
  });

  it("falls back to the default for a bad flag or text size", () => {
    const s = parseSettings("comments=maybe&size=99&readOnly=1", catalog);
    expect(s.comments).toBe(true);
    expect(s.readOnly).toBe(true);
    expect(s.size).toBe(16);
    expect(SIZES).toContain(s.size);
  });
});

describe("code snippet", () => {
  it("shows the bare composer for the defaults", () => {
    const code = buildSnippet(defaultSettings(catalog), catalog);
    expect(code).toContain("<KoenigComposer");
    expect(code).not.toContain("cards=");
    expect(code).not.toContain("tools=");
    expect(code).toContain("toolbarActions={toolbarActions}");
    expect(code).toContain("comments={comments}");
  });

  it("lists only the cards and tools that are on", () => {
    const s = { ...defaultSettings(catalog), cards: ["image", "divider"], tools: ["emojiPicker"] };
    const code = buildSnippet(s, catalog);
    expect(code).toContain('cards={["image", "divider"]}');
    expect(code).toContain('tools={["emojiPicker"]}');
  });

  it("writes an empty list when everything is off, and leaves out the rest", () => {
    const s = {
      ...defaultSettings(catalog),
      cards: [],
      tools: [],
      toolbarActions: false,
      comments: false,
      readOnly: true,
    };
    const code = buildSnippet(s, catalog);
    expect(code).toContain("cards={[]}");
    expect(code).toContain("tools={[]}");
    expect(code).toContain("editable={false}");
    expect(code).toContain("<KoenigEditor readOnly />");
    expect(code).not.toContain("toolbarActions");
    expect(code).not.toContain("comments=");
  });

  it("leaves out tools when the package has none", () => {
    const bare: Catalog = { cards: catalog.cards, tools: [] };
    const code = buildSnippet(defaultSettings(bare), bare);
    expect(code).not.toContain("tools=");
  });
});
