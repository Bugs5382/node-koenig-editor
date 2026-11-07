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
// The sample pictures as editor content: the start document, and the cards the "sample images"
// buttons add. Works on the editor's saved-state JSON, so it needs no editor instance.
import { SAMPLE_SPECS, sampleFileName } from "./sampleSpecs.mjs";

export interface Sample {
  alt: string;
  file: string;
  height: number;
  id: number;
  url: string;
  width: number;
}

export const SAMPLES: readonly Sample[] = SAMPLE_SPECS.map((spec) => ({
  alt: spec.alt,
  file: sampleFileName(spec),
  height: spec.height,
  id: spec.n,
  url: `${import.meta.env.BASE_URL}samples/${sampleFileName(spec)}`,
  width: spec.width,
}));

const PER_ROW = 3;

export type CardNode = { type: string; [key: string]: unknown };

const paragraph = (text: string): CardNode => ({
  children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});

export const imageNode = (sample: Sample): CardNode => ({
  type: "image",
  version: 1,
  src: sample.url,
  alt: sample.alt,
  caption: "",
  title: "",
  cardWidth: "regular",
  width: sample.width,
  height: sample.height,
  href: "",
});

export const galleryNode = (samples: readonly Sample[]): CardNode => ({
  type: "gallery",
  version: 1,
  caption: "",
  images: samples.map((sample, index) => ({
    alt: sample.alt,
    caption: "",
    fileName: sample.file,
    height: sample.height,
    row: Math.floor(index / PER_ROW),
    src: sample.url,
    width: sample.width,
  })),
});

export const headerNode = (sample: Sample): CardNode => ({
  type: "header",
  version: 2,
  size: "small",
  style: "image",
  header: "Koenig playground",
  subheader: "Pictures are samples drawn by the demo, nothing is uploaded",
  textColor: "#FFFFFF",
  backgroundImageSrc: sample.url,
  backgroundImageWidth: sample.width,
  backgroundImageHeight: sample.height,
});

const documentOf = (children: CardNode[]) => ({
  root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
});

const allowed = (cards: readonly string[] | null, card: string) => !cards || cards.includes(card);

/** Nothing written yet: one empty paragraph. */
export function emptyDocument(): string {
  return JSON.stringify(documentOf([{ ...paragraph(""), children: [] }]));
}

/** The default content Reset returns to: one paragraph of the pangram. */
export const FOX_TEXT = "The quick brown fox jumps over the lazy dog.";
export function foxDocument(): string {
  return JSON.stringify(documentOf([paragraph(FOX_TEXT)]));
}

/** True for no document at all, or one that is a single empty paragraph. */
export function isEmptyDocument(state: string | undefined): boolean {
  if (!state) return true;
  const children = JSON.parse(state).root?.children ?? [];
  return (
    children.length === 0 ||
    (children.length === 1 && children[0].type === "paragraph" && !children[0].children?.length)
  );
}

/** The document the page starts with. `cards` is the enabled list; null means every card. */
export function seedDocument(cards: readonly string[] | null): string {
  const children = [paragraph("Try the cards below, or add pictures from the sample images.")];
  if (allowed(cards, "header")) children.push(headerNode(SAMPLES[SAMPLES.length - 1]!));
  if (allowed(cards, "gallery")) children.push(galleryNode(SAMPLES));
  return JSON.stringify(documentOf(children));
}

/** `state` (saved-state JSON, or nothing yet) with `node` added at the end. */
export function appendCard(state: string | undefined, node: CardNode): string {
  const doc = state ? JSON.parse(state) : documentOf([]);
  doc.root.children.push(node);
  return JSON.stringify(doc);
}

// The cards this file creates. A document that holds one the composer was built without would
// not load, so it is taken out when its card is switched off.
const SEEDED = ["image", "gallery", "header"];

/** `state` without the seeded cards that `cards` no longer includes. */
export function dropCards(state: string, cards: readonly string[] | null): string {
  if (!cards) return state;
  const doc = JSON.parse(state);
  doc.root.children = doc.root.children.filter(
    (node: CardNode) => !SEEDED.includes(node.type) || cards.includes(node.type),
  );
  return JSON.stringify(doc);
}
