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
import { describe, expect, it } from "vitest";
import { editorHref, guideHref, parseRoute, tryHref, TRY_IDS } from "./route";

describe("page address", () => {
  it("is the editor with no hash, a bare hash or an unknown one", () => {
    for (const hash of ["", "#", "#/", "#/nonsense", "#/guide-ish"]) {
      expect(parseRoute(hash), hash).toEqual({ page: "editor" });
    }
  });

  it("reads the guide, and a section of it", () => {
    expect(parseRoute("#/guide")).toEqual({ page: "guide" });
    expect(parseRoute("#/guide/")).toEqual({ page: "guide" });
    expect(parseRoute("#/guide/gallery")).toEqual({ page: "guide", anchor: "gallery" });
    expect(parseRoute("#/guide/image-editor")).toEqual({ page: "guide", anchor: "image-editor" });
  });

  it("ignores a section name that could not be an anchor", () => {
    expect(parseRoute("#/guide/<script>")).toEqual({ page: "guide" });
    expect(parseRoute("#/guide/a%20b")).toEqual({ page: "guide" });
  });

  it("reads a try link only for a known id", () => {
    expect(parseRoute("#/try/gallery")).toEqual({ page: "editor", tryId: "gallery" });
    expect(parseRoute("#/try/word-count")).toEqual({ page: "editor", tryId: "word-count" });
    expect(parseRoute("#/try/bogus")).toEqual({ page: "editor" });
    expect(parseRoute("#/try")).toEqual({ page: "editor" });
  });

  it("builds links that read back the same", () => {
    expect(editorHref).toBe("#/");
    expect(guideHref()).toBe("#/guide");
    expect(parseRoute(guideHref("table"))).toEqual({ page: "guide", anchor: "table" });
    for (const id of TRY_IDS)
      expect(parseRoute(tryHref(id))).toEqual({ page: "editor", tryId: id });
  });

  it("offers a try link for each of the thirteen cards, the two tools and the word count", () => {
    expect(TRY_IDS).toHaveLength(16);
  });
});
