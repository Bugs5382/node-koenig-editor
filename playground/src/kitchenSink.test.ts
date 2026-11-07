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
import { kitchenSink, KITCHEN_SINK_FALLBACK, tryDocument, tryNeeds } from "./kitchenSink";
import { defaultSettings, type Catalog } from "./config";
import { TRY_IDS } from "./route";

type Node = { type: string; [key: string]: unknown };
const childrenOf = (json: string): Node[] => JSON.parse(json).root.children;
const typesOf = (json: string) => [...new Set(childrenOf(json).map((n) => n.type))];

const MAIN = ["image", "gallery", "header", "divider", "callout", "toggle", "table"];
const ALL = [...MAIN, "toggleGroup", "file", "video", "audio", "button", "markdown"];

describe("kitchen sink document", () => {
  it("shows every card the package has, once each", () => {
    const types = childrenOf(kitchenSink(ALL, null)).map((n) => n.type);
    for (const type of [
      "image",
      "gallery",
      "header",
      "horizontalrule",
      "callout",
      "toggle",
      "table",
      "file",
      "video",
      "audio",
      "button",
      "markdown",
    ]) {
      expect(
        types.filter((t) => t === type),
        type,
      ).toHaveLength(1);
    }
  });

  it("also shows plain writing: headings, bold and italic, a list and a quote", () => {
    const types = typesOf(kitchenSink(MAIN, null));
    expect(types).toEqual(expect.arrayContaining(["heading", "paragraph", "list", "quote"]));
    const text = JSON.stringify(childrenOf(kitchenSink(MAIN, null)));
    expect(text).toContain('"format":1'); // bold
    expect(text).toContain('"format":2'); // italic
  });

  it("leaves out cards the package does not have, so it still loads", () => {
    const types = typesOf(kitchenSink(MAIN, null));
    for (const type of ["file", "video", "audio", "button", "markdown"]) {
      expect(types).not.toContain(type);
    }
  });

  it("leaves out cards that are switched off", () => {
    const types = typesOf(kitchenSink(ALL, ["image", "divider"]));
    expect(types).toContain("image");
    expect(types).toContain("horizontalrule");
    for (const type of ["gallery", "header", "callout", "toggle", "table", "markdown", "video"]) {
      expect(types).not.toContain(type);
    }
  });

  it("falls back to the baseline set when the package lists no cards", () => {
    expect(typesOf(kitchenSink([], null))).toEqual(
      typesOf(kitchenSink(KITCHEN_SINK_FALLBACK, null)),
    );
  });

  it("uses the sample pictures, a sample sound and a sample file, never a remote address", () => {
    const text = JSON.stringify(childrenOf(kitchenSink(ALL, null)));
    expect(text).toContain("/samples/sample-");
    expect(text).toContain("/media/sample-tone.wav");
    expect(text).toContain("/media/sample-notes.txt");
    const urls = text.match(/"(?:src|buttonUrl)":"([^"]+)"/g) ?? [];
    expect(urls.every((u) => !/"https?:\/\/(?!github\.com\/Bugs5382)/.test(u))).toBe(true);
  });

  it("gives video and audio the captions the cards ask for", () => {
    const nodes = childrenOf(kitchenSink(ALL, null));
    const audio = nodes.find((n) => n.type === "audio") as Node;
    expect(String(audio.transcript).length).toBeGreaterThan(10);
  });

  it("has a header row in the table", () => {
    const table = childrenOf(kitchenSink(MAIN, null)).find((n) => n.type === "table") as Node;
    const rows = table.children as Node[];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const firstCells = rows[0]!.children as Node[];
    expect(firstCells.every((cell) => cell.headerState === 1)).toBe(true);
  });
});

describe("try documents", () => {
  it("make a short document for each card, with that card in it", () => {
    for (const id of ["image", "gallery", "header", "callout", "toggle", "divider", "table"]) {
      const types = childrenOf(tryDocument(id as never, ALL)!).map((n) => n.type);
      const want = id === "divider" ? "horizontalrule" : id;
      expect(types, id).toContain(want);
      expect(types[0]).toBe("paragraph");
    }
    for (const id of ["file", "video", "audio", "button", "markdown"]) {
      expect(typesOf(tryDocument(id as never, ALL)!), id).toContain(id);
    }
  });

  it("opens the tools on a card that uses them", () => {
    expect(typesOf(tryDocument("image-editor", ALL)!)).toContain("image");
    expect(typesOf(tryDocument("emoji-picker", ALL)!)).toContain("callout");
    const words = tryDocument("word-count", ALL)!;
    expect(typesOf(words)).toEqual(["paragraph"]);
    expect(words.length).toBeGreaterThan(200);
  });

  it("is nothing for a card the package does not have", () => {
    expect(tryDocument("file", MAIN)).toBeNull();
    expect(tryDocument("image-editor", ["callout"])).toBeNull();
    expect(tryDocument("word-count", [])).not.toBeNull();
  });

  it("has a document for every try id when the package has everything", () => {
    for (const id of TRY_IDS) expect(tryDocument(id, ALL), id).not.toBeNull();
  });

  const catalog: Catalog = { cards: ALL, tools: ["emojiPicker", "imageEditor"], wordCount: true };

  it("says which settings the card needs, and nothing when they are already on", () => {
    const all = defaultSettings(catalog);
    expect(tryNeeds("gallery", all, catalog)).toEqual({});
    const few = { ...all, cards: ["image", "divider"], tools: [], wordCount: false };
    expect(tryNeeds("gallery", few, catalog)).toEqual({
      cards: ["image", "divider", "gallery"].sort((a, b) => ALL.indexOf(a) - ALL.indexOf(b)),
    });
    expect(tryNeeds("image-editor", few, catalog)).toEqual({ tools: ["imageEditor"] });
    expect(tryNeeds("emoji-picker", few, catalog)).toEqual({
      cards: ["image", "divider", "callout"].sort((a, b) => ALL.indexOf(a) - ALL.indexOf(b)),
      tools: ["emojiPicker"],
    });
    expect(tryNeeds("word-count", few, catalog)).toEqual({ wordCount: true });
  });
});
