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
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(root, "src/generated/koenig.css"), "utf8");
const readme = readFileSync(path.join(root, "README.md"), "utf8");
const require = createRequire(import.meta.url);
const tailwind = require(path.join(root, "tailwind.config.cjs")) as {
  theme: { colors: Record<string, string | Record<string, string>> };
};

/** Every palette value with its default, read out of the token fallback. */
const paletteDefaults = (): string[] =>
  Object.values(tailwind.theme.colors)
    .flatMap((value) => (typeof value === "string" ? [value] : Object.values(value)))
    .map((value) => /#[0-9a-f]{3,8}/i.exec(value)?.[0])
    .filter((value): value is string => value !== undefined);

const channels = (hex: string): string => {
  const full =
    hex.length === 4
      ? hex
          .slice(1)
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex.slice(1, 7);
  return [0, 2, 4].map((start) => Number.parseInt(full.slice(start, start + 2), 16)).join(" ");
};

describe("theme tokens", () => {
  it("sends every palette colour through a --kg-color token", () => {
    for (const value of Object.values(tailwind.theme.colors)) {
      const values = typeof value === "string" ? [value] : Object.values(value);
      for (const color of values) {
        if (color === "transparent" || color === "currentColor") continue;
        expect(color).toMatch(/var\(--kg-(color-[\w-]+|accent-color),/);
      }
    }
  });

  it("leaves no palette colour hard-coded in the stylesheet", () => {
    for (const hex of paletteDefaults()) {
      // Tailwind's own gradient stops end in a fully transparent white; that is no colour.
      expect(css).not.toMatch(new RegExp(`rgb\\(${channels(hex)} / (?!0\\))`));
      const pattern = new RegExp(`${hex}(?![0-9a-f])`, "gi");
      for (const match of css.matchAll(pattern)) {
        const before = css.slice(Math.max(0, match.index - 60), match.index);
        expect(before).toMatch(/var\(--kg-[\w-]+,\s*$/);
      }
    }
  });

  it("lets the host set the fonts", () => {
    for (const token of ["--kg-font-sans", "--kg-font-serif", "--kg-font-mono"]) {
      expect(css).toContain(`var(${token}`);
    }
  });

  it("documents every token the stylesheet reads", () => {
    const tokens = new Set(css.match(/--kg-(color-[\w-]+|font-[\w-]+|accent-color)/g) ?? []);
    expect(tokens.size).toBeGreaterThan(10);
    for (const token of tokens) {
      expect(readme).toContain(token);
    }
  });
});
