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
import { renderGuide, slugify } from "./guideDoc";
import { TRY_IDS } from "./route";

const guide = readFileSync(join(process.cwd(), "../guides/cards.md"), "utf8");

describe("slugify", () => {
  it("makes an anchor from a heading", () => {
    expect(slugify("Image editor")).toBe("image-editor");
    expect(slugify("Quick reference")).toBe("quick-reference");
    expect(slugify("For developers: switching things off or replacing them")).toBe(
      "for-developers-switching-things-off-or-replacing-them",
    );
  });
});

describe("rendered guide", () => {
  const { html, title, toc } = renderGuide(guide);

  it("has the title and a contents list of every section, in order", () => {
    expect(title).toBe("Koenig editor: the default cards");
    expect(toc.map((t) => t.id).slice(0, 4)).toEqual([
      "quick-reference",
      "adding-a-card-for-any-card",
      "image",
      "gallery",
    ]);
    expect(toc.map((t) => t.id)).toContain("word-count");
    expect(new Set(toc.map((t) => t.id)).size).toBe(toc.length);
  });

  it("gives each section an anchor, and a link to it", () => {
    for (const { id, title: heading } of toc) {
      expect(html, id).toContain(`id="guide-${id}"`);
      expect(html, id).toContain(`href="#/guide/${id}"`);
      expect(heading.length).toBeGreaterThan(0);
    }
  });

  it("puts a Try it link under every card, tool and the word count, and nowhere else", () => {
    for (const id of TRY_IDS) {
      expect(html, id).toContain(`href="#/try/${id}"`);
    }
    const links = html.match(/href="#\/try\/[a-z-]+"/g) ?? [];
    expect(links).toHaveLength(TRY_IDS.length);
    const quick = html.slice(
      html.indexOf('id="guide-quick-reference"'),
      html.indexOf('id="guide-image"'),
    );
    expect(quick).not.toContain("#/try/");
  });

  it("keeps the quick-reference table", () => {
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Card</th>");
  });

  it("never lets raw HTML in the Markdown through", () => {
    const out = renderGuide(
      "# T\n\n## Image\n\n<script>alert(1)</script>\n\n<b onclick=x>bold</b>\n",
    ).html;
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<b onclick");
    expect(out).toContain("&lt;script&gt;");
  });
});
