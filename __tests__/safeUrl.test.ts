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

import { isSafeUrl, toSafeUrl } from "node-koenig-editor";

describe("safe URLs", () => {
  it.each([
    "https://example.com/a?b=1#c",
    "http://example.com",
    "HTTPS://EXAMPLE.COM",
    "mailto:someone@example.com",
    "  https://example.com  ",
  ])("allows %j", (url) => {
    expect(isSafeUrl(url)).toBe(true);
    expect(toSafeUrl(url)).toBe(url.trim());
  });

  it.each([
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//example.com/path",
    "/relative/path",
    "relative/path",
    "ftp://example.com",
    "file:///etc/passwd",
    "tel:+15555550100",
    "https:",
    "mailto:",
    "",
    "   ",
  ])("rejects %j", (url) => {
    expect(isSafeUrl(url)).toBe(false);
    expect(toSafeUrl(url)).toBe("");
  });

  it("rejects values that are not strings", () => {
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
    expect(toSafeUrl(42 as unknown as string)).toBe("");
  });

  it("removes tabs and newlines inside an allowed URL, as a browser does", () => {
    expect(toSafeUrl("https://exa\nmple.com")).toBe("https://example.com");
  });
});
