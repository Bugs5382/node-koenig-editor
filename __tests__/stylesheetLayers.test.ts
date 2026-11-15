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
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const css = readFileSync(path.join(root, "src/generated/koenig.css"), "utf8");
const tree = postcss.parse(css);

// Tailwind's --tw-* defaults: the `*, ::before, ::after` and `::backdrop` resets. Utilities that
// set a --tw-* variable of their own (a ring or a gradient stop) are not resets.
const RESET_SELECTORS = new Set(["::backdrop", "*, ::before, ::after"]);
const isTwReset = (rule: postcss.Rule) =>
  RESET_SELECTORS.has(rule.selector.replace(/\s+/g, " ")) &&
  rule.nodes.some((node) => node.type === "decl" && node.prop.startsWith("--tw-"));

describe("stylesheet cascade layers", () => {
  it("ships the --tw-* reset inside an @layer, never at the top level", () => {
    const topLevel: string[] = [];
    tree.each((node) => {
      if (node.type === "rule" && isTwReset(node)) topLevel.push(node.selector);
    });
    // An unlayered reset beats a host's `@layer utilities` (Tailwind v4) translate and scale classes.
    expect(topLevel).toEqual([]);

    const layered: string[] = [];
    tree.walkAtRules("layer", (layer) => {
      layer.walkRules((rule) => {
        if (isTwReset(rule)) layered.push(rule.selector);
      });
    });
    expect(layered.some((selector) => selector.includes("::before"))).toBe(true);
    expect(css).toMatch(/--tw-translate-x:\s*0/);
  });

  it("uses the base layer, which a host orders below its utilities", () => {
    const names = new Set<string>();
    tree.walkAtRules("layer", (layer) => {
      names.add(layer.params);
    });
    expect([...names]).toEqual(["base"]);
  });
});
