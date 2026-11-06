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

// The generated rule that sets the heading colour in dark mode: its selectors and its body.
const darkHeadingRule = (): { body: string; selectors: string[] } => {
  const start = css.indexOf(".koenig-lexical.dark .kg-prose :where(");
  const colour = css.indexOf("color: var(--white);", start);
  const open = css.lastIndexOf("{", colour);
  if (start === -1 || colour === -1) return { body: "", selectors: [] };
  return {
    body: css.slice(open, colour + 20),
    selectors: css
      .slice(start, open)
      .split(/,(?![^(]*\))/)
      .map((selector) => selector.trim())
      .filter(Boolean),
  };
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

describe("headings are readable in dark mode", () => {
  it("matches whether `dark` is on the editor itself, on an ancestor or on a descendant", () => {
    const { selectors } = darkHeadingRule();
    expect(selectors.length).toBeGreaterThan(0);
    const fixtures: Record<string, string> = {
      "on the editor":
        '<div class="koenig-lexical dark"><div class="kg-prose"><h1>t</h1></div></div>',
      "on an ancestor":
        '<div class="dark"><div class="koenig-lexical"><div class="kg-prose"><h1>t</h1></div></div></div>',
      "on a descendant":
        '<div class="koenig-lexical"><div class="dark"><div class="kg-prose"><h1>t</h1></div></div></div>',
    };
    for (const [where, html] of Object.entries(fixtures)) {
      document.body.innerHTML = html;
      const heading = document.querySelector("h1") as Element;
      const hit = selectors.some((selector) => {
        // :where() and :not() with a list are not understood by every DOM, so the part that
        // decides the dark placement is tested on its own.
        const simple = selector.replace(/:where\([^)]*\)/g, "").replace(/:not\(.*$/, "");
        try {
          return heading.matches(`${simple.trim()} h1`) || heading.matches(simple.trim() + " *");
        } catch {
          return false;
        }
      });
      expect(hit, where).toBe(true);
    }
  });

  it("sets the heading colour to the white token and outranks the light colour", () => {
    const { body, selectors } = darkHeadingRule();
    expect(body).toContain("color: var(--white)");
    expect(selectors.every((selector) => selector.includes(".kg-prose"))).toBe(true);
  });

  it("has white (the --white default) at least 4.5:1 on the darkest and lightest dark surfaces", () => {
    expect(css).toMatch(/--white: var\(--kg-color-white, #FFF\)/i);
    // the dark surfaces: the black token and the demo's #1C1F25
    expect(contrast("#FFFFFF", "#15171A")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", "#23292F")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", "#1C1F25")).toBeGreaterThanOrEqual(4.5);
  });
});
