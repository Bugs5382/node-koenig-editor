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

import { placeFloating } from "../src/additions/placement/placeFloating";

const root = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(root, "src/generated/koenig.css"), "utf8");
const readme = readFileSync(path.join(root, "README.md"), "utf8");

describe("type scale and sizing follow the host", () => {
  it("sizes every length from one --kg-rem unit instead of the page's root size", () => {
    // Upstream is written for a 10px root. Every rem is multiplied by the host-set unit.
    const stripped = css.replaceAll(/calc\([\d.]+ \* var\(--kg-rem, 0\.625rem\)\)/g, "");
    // Declarations only: a class name such as .top-\[1\.5rem\] is a selector, not a length.
    const declarations = stripped.split("\n").filter((line) => /^\s+[\w-]+:.*;$/.test(line));
    const bare = declarations.flatMap((line) =>
      [...line.matchAll(/[\d.]+rem\b/g)].map((m) => m[0]),
    );
    expect(bare.filter((value) => value !== "0rem" && value !== "0.625rem")).toEqual([]);
  });

  it("reads the body size, line height and heading sizes from tokens", () => {
    for (const token of [
      "--kg-font-size",
      "--kg-line-height",
      "--kg-font-body",
      "--kg-font-size-h1",
      "--kg-font-size-h2",
      "--kg-font-size-h3",
      "--kg-font-size-h4",
      "--kg-font-size-h5",
    ]) {
      expect(css).toContain(`var(${token},`);
    }
  });

  it("sets the menu width and height from tokens", () => {
    expect(css).toContain("var(--kg-menu-max-height,");
    expect(css).toContain("var(--kg-menu-width,");
  });
});

describe("no built-in green", () => {
  it("takes the selection and focus colour from --kg-selection-color, black by default", () => {
    expect(css).toContain("--kg-selection-color, #000");
  });

  it("leaves green only as the callout's own colour option", () => {
    const classes = [...css.matchAll(/\.([\w\\/:.[\]-]*green[\w\\/:.[\]-]*)/g)].map((m) => m[1]);
    const allowed = new Set(["bg-green\\/10", "bg-green\\/20"]);
    expect(classes.filter((name) => !allowed.has(name!))).toEqual([]);
  });
});

describe("documented tokens", () => {
  it("lists every new token in the README", () => {
    const tokens = new Set(
      css.match(
        /--kg-(rem|selection-color|font-size[\w-]*|line-height|font-body|menu-[\w-]+|plus-[\w-]+)/g,
      ),
    );
    expect(tokens.size).toBeGreaterThan(8);
    for (const token of tokens) {
      expect(readme).toContain(token);
    }
  });
});

describe("placing a floating menu", () => {
  const viewport = { height: 800, width: 1200 };
  const size = { height: 300, width: 320 };

  it("opens below the anchor when there is room", () => {
    const place = placeFloating({ bottom: 120, left: 100, top: 100 }, size, viewport);
    expect(place.placement).toBe("below");
    expect(place.top).toBeGreaterThanOrEqual(120);
    expect(place.maxHeight).toBeGreaterThanOrEqual(300);
  });

  it("flips above when it would run off the bottom and there is more room above", () => {
    const place = placeFloating({ bottom: 720, left: 100, top: 700 }, size, viewport);
    expect(place.placement).toBe("above");
    expect(place.top + Math.min(size.height, place.maxHeight)).toBeLessThanOrEqual(700);
  });

  it("caps the height and scrolls when neither side fits it", () => {
    const place = placeFloating(
      { bottom: 220, left: 100, top: 200 },
      { height: 900, width: 320 },
      {
        height: 500,
        width: 1200,
      },
    );
    expect(place.maxHeight).toBeLessThan(900);
    expect(place.top).toBeGreaterThanOrEqual(0);
    expect(place.top + place.maxHeight).toBeLessThanOrEqual(500);
  });

  it("stays inside the viewport sideways", () => {
    const place = placeFloating({ bottom: 120, left: 1100, top: 100 }, size, viewport);
    expect(place.left + size.width).toBeLessThanOrEqual(viewport.width);
    expect(place.left).toBeGreaterThanOrEqual(0);
  });

  it("copes with an empty document, where the anchor is a zero-size rect at the top", () => {
    const place = placeFloating({ bottom: 0, left: 0, top: 0 }, size, viewport);
    expect(place.placement).toBe("below");
    expect(place.top).toBeGreaterThanOrEqual(0);
  });
});
