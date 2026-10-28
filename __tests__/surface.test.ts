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
import * as editor from "node-koenig-editor";
import { describe, expect, it } from "vitest";

// Consumers compile against the hand-written declarations, not the sources, so
// the two must not drift: every value the declarations promise has to exist at
// runtime.
const declarations = readFileSync(path.resolve(import.meta.dirname, "../index.d.ts"), "utf8");
const declaredValues = [...declarations.matchAll(/export declare const (\w+)/g)].map(
  (match) => match[1] as string,
);

describe("the declared surface", () => {
  it("declares the composer, the editor and the default nodes", () => {
    expect(declaredValues).toEqual(
      expect.arrayContaining(["DEFAULT_NODES", "KoenigComposer", "KoenigEditor"]),
    );
  });

  it.each(declaredValues)("exports %s at runtime", (name) => {
    expect((editor as Record<string, unknown>)[name]).toBeDefined();
  });
});
