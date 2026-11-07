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
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(root, "src/generated/koenig.css"), "utf8");

// The block of rules between a selector and its closing brace, for a selector given exactly.
const rule = (selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("}", start));
};

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe("table borders and backgrounds are visible, and set by tokens", () => {
  it("draws a cell border from a token, solid by default", () => {
    const cells = rule(".koenig-lexical table tr td,\n.koenig-lexical table tr th");
    expect(cells).toContain("var(--kg-table-border-style, solid)");
    expect(cells).toContain("var(--kg-table-border-color,");
  });

  it("makes the border dashed while editing, from --kg-table-edit-border-style", () => {
    expect(css).toContain('[contenteditable="true"] table tr td');
    expect(css).toContain("var(--kg-table-edit-border-style, dashed)");
  });

  it("has no automatic shade on the header row: it reads as a header by its bold text", () => {
    const at = css.indexOf("var(--kg-table-header-bg");
    const header = css.slice(css.lastIndexOf("{", at), css.indexOf("}", at));
    expect(header).toContain("var(--kg-table-header-bg, transparent)");
    expect(header).toContain("font-weight: 700");
    // no grey fallback, and no dark-mode shade either
    expect(header).not.toContain("--grey-200");
    expect(css).not.toContain("var(--kg-table-header-bg, var(--grey");
  });

  it("keeps dark ink on a cell the author shaded, so the text reads on the shade in light and dark", () => {
    expect(css).toContain('table tr td[style*="background-color"]');
    expect(
      rule(
        '.koenig-lexical table tr td[style*="background-color"],\n.koenig-lexical table tr th[style*="background-color"]',
      ),
    ).toContain("color: #15171A");
  });

  it("draws the caption from the table's own attribute, under the table", () => {
    const caption = rule(".koenig-lexical table[data-kg-caption]::after");
    expect(caption).toContain("content: attr(data-kg-caption)");
    expect(caption).toContain("display: table-caption");
    expect(caption).toContain("caption-side: bottom");
  });

  it("shows selected cells over a shade too, with an inset shadow instead of a background", () => {
    expect(rule(".koenig-lexical table .kg-table-cell-selected")).toContain("box-shadow: inset");
  });

  it("gives the selected cells and the focused cell their own look", () => {
    expect(css).toContain("var(--kg-table-selected-bg,");
    expect(css).toContain("td[data-kg-active-cell]");
  });

  it("keeps an empty cell open to type in, so an empty table shows its grid", () => {
    const cells = rule(".koenig-lexical table tr td,\n.koenig-lexical table tr th");
    expect(cells).toContain("min-width");
    expect(cells).toContain("padding");
  });

  it("keeps solid borders in print", () => {
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toContain("table tr td");
    expect(print).toContain("border-style: solid");
  });

  it("uses system colours in forced-colours mode", () => {
    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
    expect(forced).toContain("CanvasText");
    expect(forced).toContain("table tr td");
  });

  it("has a default border of at least 3:1 against a white and a dark editor", () => {
    // --grey-700 is the default for --kg-table-border-color
    expect(css).toContain("--kg-table-border-color, var(--grey-700)");
    expect(css).toMatch(/--grey-700: var\(--kg-color-grey-700, #7C8B9A\)/i);
    expect(contrast("#7C8B9A", "#FFFFFF")).toBeGreaterThanOrEqual(3);
    expect(contrast("#7C8B9A", "#15171A")).toBeGreaterThanOrEqual(3);
  });
});
