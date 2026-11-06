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
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const css = readFileSync(path.join(root, "src/generated/koenig.css"), "utf8");

const sources: Record<string, string[]> = {
  gallery: [
    "components/ui/cards/GalleryCard.tsx",
    "nodes/GalleryNodeComponent.tsx",
    "../additions/gallery/ImageTextDialog.tsx",
    "../additions/gallery/GalleryViewer.tsx",
  ],
  header: ["components/ui/cards/HeaderCard.tsx", "nodes/HeaderNodeComponent.tsx"],
  button: ["components/ui/cards/ButtonCard.tsx", "nodes/ButtonNodeComponent.tsx"],
  file: ["nodes/FileNodeComponent.tsx"],
  audio: ["nodes/MediaNodeComponent.tsx"],
  video: ["nodes/MediaNodeComponent.tsx"],
  markdown: ["components/ui/cards/MarkdownCard.tsx", "nodes/MarkdownNodeComponent.tsx"],
};

// Classes that are markers or hooks, not utilities, so the stylesheet has no rule for them.
const MARKERS =
  /^(group|peer|kg-|not-kg|bg-black-60$|markdown-editor$|sans-serif$|fw7$|f7$|center$|buttonUrl$|position$|index$)/;

const escape = (name: string) => name.replace(/([^a-zA-Z0-9_-])/g, "\\$1");

const classesIn = (file: string) => {
  const source = readFileSync(path.join(root, "src/koenig-lexical", file), "utf8");
  const found = new Set<string>();
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    for (const token of (match[1] ?? match[2] ?? "").split(/\s+/)) {
      if (/^[!a-z][a-z0-9:/[\].%#!_-]*$/i.test(token) && !MARKERS.test(token)) found.add(token);
    }
  }
  // Classes picked in a ternary: 'opacity-100' : 'opacity-50'
  for (const match of source.matchAll(/'([a-z][a-z0-9:/[\].%#!_-]*)'/g)) {
    if (/^(opacity|justify|bg|text|border|w|h|m|p|flex|items)-/.test(match[1]!))
      found.add(match[1]!);
  }
  return [...found];
};

describe("the stylesheet carries every utility the new cards use", () => {
  it("has the committed stylesheet", () => {
    expect(readdirSync(path.join(root, "src/generated"))).toContain("koenig.css");
    expect(css.length).toBeGreaterThan(10000);
  });

  it.each(Object.keys(sources))("%s card", (card) => {
    const classes = sources[card]!.flatMap(classesIn);
    // The header card is styled inline from the --kg-* tokens, so it uses few or no utilities.
    if (card !== "header") expect(classes.length).toBeGreaterThan(0);
    const missing = classes.filter((name) => !css.includes(`.${escape(name)}`));
    expect(missing, `${card}: not in koenig.css (run npm run build:css)`).toEqual([]);
  });
});

describe("the stylesheet prints a gallery photo's text under the photo", () => {
  it("has a print rule that puts the text in the flow and hides the controls", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toContain("[data-gallery-image-text]");
    expect(print).toContain("position: static");
    expect(print).toContain("[data-gallery-image-text-toggle]");
  });
});
