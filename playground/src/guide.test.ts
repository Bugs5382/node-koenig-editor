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
// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const guide = readFileSync(join(process.cwd(), "../guides/cards.md"), "utf8");
const headings = guide
  .split("\n")
  .filter((line) => line.startsWith("## "))
  .map((line) => line.slice(3));

const CARDS = [
  "Image",
  "Gallery",
  "Header",
  "Callout",
  "Toggle",
  "Divider",
  "Table",
  "File",
  "Video",
  "Audio",
  "Button",
  "Markdown",
];

describe("cards guide", () => {
  it("opens with a quick-reference table of the twelve cards", () => {
    const quick = guide.slice(
      guide.indexOf("## Quick reference"),
      guide.indexOf("## Adding a card"),
    );
    const rows = quick
      .split("\n")
      .filter(
        (line) => line.startsWith("| ") && !line.startsWith("| Card") && !line.startsWith("| ---"),
      );
    expect(rows.map((row) => row.split("|")[1]?.trim())).toEqual(CARDS);
  });

  it("has a section for each card, the two tools and the word count", () => {
    for (const name of [...CARDS, "Image editor", "Emoji picker", "Word count"]) {
      expect(headings).toContain(name);
    }
  });

  it("covers how to add, what it can do and how a developer turns it off, for every card", () => {
    for (const name of CARDS) {
      const start = guide.indexOf(`\n## ${name}\n`);
      const next = guide.indexOf("\n## ", start + 1);
      const section = guide.slice(start, next);
      expect(section, name).toContain("**For:**");
      expect(section, name).toContain("**Add it:**");
      expect(section, name).toContain("**Developer:**");
    }
  });

  it("names the options a developer uses", () => {
    for (const option of [
      "cards",
      "tools",
      "cardRenderers",
      "gallery.maxImages",
      "useKoenigWordCount",
    ]) {
      expect(guide).toContain(option);
    }
  });

  it("states the gallery limit and the caption rule for video and audio", () => {
    expect(guide).toContain("50 pictures");
    expect(guide).toMatch(/Captions are required/);
    expect(guide).toMatch(/same captions rule as video/i);
  });
});
