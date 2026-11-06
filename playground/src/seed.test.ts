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
  appendCard,
  dropCards,
  emptyDocument,
  galleryNode,
  imageNode,
  isEmptyDocument,
  SAMPLES,
  seedDocument,
} from "./seed";

type Node = { type: string; [key: string]: unknown };
const childrenOf = (json: string): Node[] => JSON.parse(json).root.children;
const typesOf = (json: string) => childrenOf(json).map((n) => n.type);

describe("sample pictures", () => {
  it("are ten, each with a url under /samples/", () => {
    expect(SAMPLES).toHaveLength(10);
    expect(SAMPLES.every((s) => /^\/samples\/sample-\d\d\.png$/.test(s.url))).toBe(true);
  });
});

describe("start document", () => {
  it("has an intro, a header on the panoramic sample and a gallery", () => {
    const types = typesOf(seedDocument(null));
    expect(types).toEqual(["paragraph", "header", "gallery"]);
    const header = childrenOf(seedDocument(null)).find((n) => n.type === "header") as Node;
    expect(header.backgroundImageSrc).toBe(SAMPLES[9]?.url);
    expect(header.style).toBe("image");
  });

  it("puts all ten pictures in the gallery, in rows of three", () => {
    const gallery = childrenOf(seedDocument(null)).find((n) => n.type === "gallery") as Node;
    const images = gallery.images as { row: number; src: string; width: number }[];
    expect(images).toHaveLength(10);
    expect(images.map((i) => i.row)).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2, 3]);
    expect(new Set(images.map((i) => i.src)).size).toBe(10);
    expect(images.every((i) => i.width > 0)).toBe(true);
  });

  it("leaves out a card that is switched off", () => {
    expect(typesOf(seedDocument(["image", "header"]))).toEqual(["paragraph", "header"]);
    expect(typesOf(seedDocument(["gallery"]))).toEqual(["paragraph", "gallery"]);
    expect(typesOf(seedDocument([]))).toEqual(["paragraph"]);
  });
});

describe("adding cards to the current document", () => {
  it("starts a document when there is none", () => {
    expect(typesOf(appendCard(undefined, imageNode(SAMPLES[0]!)))).toEqual(["image"]);
  });

  it("adds at the end and keeps what is there", () => {
    const before = seedDocument(["image"]);
    const after = appendCard(before, galleryNode(SAMPLES.slice(0, 3)));
    expect(typesOf(after)).toEqual(["paragraph", "gallery"]);
    expect(childrenOf(after)[0]).toEqual(childrenOf(before)[0]);
  });

  it("builds an image card with its size and text", () => {
    const node = imageNode(SAMPLES[1]!) as Node;
    expect(node).toMatchObject({ type: "image", src: SAMPLES[1]!.url, width: 360, height: 540 });
    expect(node.alt).toBeTruthy();
  });
});

describe("cards that were switched off", () => {
  it("are taken out of the document, so it still loads", () => {
    const all = appendCard(seedDocument(null), imageNode(SAMPLES[0]!));
    expect(typesOf(dropCards(all, ["image"]))).toEqual(["paragraph", "image"]);
    expect(typesOf(dropCards(all, null))).toEqual(typesOf(all));
    expect(typesOf(dropCards(all, []))).toEqual(["paragraph"]);
  });

  it("leaves other cards alone", () => {
    const doc = appendCard(undefined, { type: "callout" });
    expect(typesOf(dropCards(doc, []))).toEqual(["callout"]);
  });
});

describe("empty document", () => {
  it("is a single empty paragraph", () => {
    const children = childrenOf(emptyDocument());
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ type: "paragraph", children: [] });
  });

  it("is recognised as empty, and nothing else is", () => {
    expect(isEmptyDocument(emptyDocument())).toBe(true);
    expect(isEmptyDocument(undefined)).toBe(true);
    expect(isEmptyDocument("")).toBe(true);
    expect(isEmptyDocument(seedDocument(null))).toBe(false);
    expect(isEmptyDocument(appendCard(emptyDocument(), imageNode(SAMPLES[0]!)))).toBe(false);
  });

  it("is not empty once there is text, or a card in place of the paragraph", () => {
    const withText = JSON.parse(emptyDocument());
    withText.root.children[0].children = [{ type: "text", text: "hi", version: 1 }];
    expect(isEmptyDocument(JSON.stringify(withText))).toBe(false);
    expect(isEmptyDocument(appendCard(undefined, imageNode(SAMPLES[0]!)))).toBe(false);
  });
});
