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

import { PLUS_GAP, placePlus } from "../src/additions/placement/placePlus";

const SIZE = 22;

describe("placePlus", () => {
  it("sits just before the line when the padding leaves room", () => {
    // box 0..600, text starts at 80
    expect(placePlus({ left: 80, width: 520 }, { left: 0, width: 600 }, SIZE)).toBe(
      80 - SIZE - PLUS_GAP,
    );
  });

  it("falls back to the box's left edge when there is no padding", () => {
    expect(placePlus({ left: 0, width: 600 }, { left: 0, width: 600 }, SIZE)).toBe(0);
    expect(placePlus({ left: 10, width: 590 }, { left: 0, width: 600 }, SIZE)).toBe(0);
  });

  it("never leaves the box on the left, even when the line starts before it", () => {
    expect(placePlus({ left: -50, width: 100 }, { left: 0, width: 600 }, SIZE)).toBe(0);
  });

  it("stays inside a narrow box", () => {
    const left = placePlus({ left: 300, width: 40 }, { left: 0, width: 60 }, SIZE);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + SIZE).toBeLessThanOrEqual(60);
  });

  it("stays inside a box narrower than the button", () => {
    expect(placePlus({ left: 30, width: 5 }, { left: 0, width: 10 }, SIZE)).toBe(0);
  });

  it("measures from the element it is positioned against", () => {
    // box starts at 100, the button's offset parent starts at 40
    expect(placePlus({ left: 200, width: 400 }, { left: 100, width: 600 }, SIZE, 8, 40)).toBe(
      200 - SIZE - 8 - 40,
    );
    expect(placePlus({ left: 100, width: 400 }, { left: 100, width: 600 }, SIZE, 8, 40)).toBe(60);
  });

  it("scales with the button, as the size follows --kg-plus-size at every text size", () => {
    for (const size of [18, 22, 28, 34, 44]) {
      const left = placePlus({ left: 64, width: 400 }, { left: 0, width: 480 }, size);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + size).toBeLessThanOrEqual(480);
    }
  });
});
