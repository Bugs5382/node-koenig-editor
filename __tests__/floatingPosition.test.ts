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
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// the helper is plain JavaScript carried over from Koenig
import { setFloatingElemPosition } from "../src/koenig-lexical/utils/setFloatingElemPosition";

const WINDOW_HEIGHT = 600;
const WINDOW_WIDTH = 1000;

const rect = (top: number, height: number, left = 400, width = 100) => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  top,
  width,
});

// A toolbar of a given size placed with the helper, returning where it ended up.
const place = (selectionTop: number, toolbarHeight: number, selectionHeight = 20) => {
  const toolbar = document.createElement("div");
  toolbar.getBoundingClientRect = () => rect(0, toolbarHeight, 0, 300) as DOMRect;
  const anchor = document.createElement("div");
  const scroller = document.createElement("div");
  scroller.getBoundingClientRect = () => rect(0, WINDOW_HEIGHT, 0, WINDOW_WIDTH) as DOMRect;
  scroller.append(anchor);
  setFloatingElemPosition(rect(selectionTop, selectionHeight), toolbar, anchor, {});
  const top = Number.parseFloat(toolbar.style.top);
  return { bottom: top + toolbarHeight, top };
};

beforeEach(() => {
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: WINDOW_WIDTH,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    configurable: true,
    value: WINDOW_HEIGHT,
  });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: WINDOW_HEIGHT });
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("the selection toolbar's place", () => {
  it.each([40, 84])("opens above the selection when there is room (%i px high)", (height) => {
    const { bottom } = place(300, height);
    expect(bottom).toBeLessThanOrEqual(300);
  });

  it.each([40, 84])(
    "opens below the selection at the very top of the window (%i px high)",
    (height) => {
      const { top } = place(2, height);
      expect(top).toBeGreaterThanOrEqual(22);
    },
  );

  it.each([40, 84])(
    "stays inside the window with the selection at the very top (%i px high)",
    (height) => {
      const { bottom, top } = place(0, height);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(WINDOW_HEIGHT);
    },
  );

  it.each([40, 84])(
    "stays inside the window with the selection at the very bottom (%i px high)",
    (height) => {
      const { bottom, top } = place(WINDOW_HEIGHT - 20, height);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(WINDOW_HEIGHT);
    },
  );

  it("counts both rows: a selection just under a two-row toolbar's height goes below, not above", () => {
    // 60 px of room above: enough for one row (40 + gap) but not for two (84 + gap)
    expect(place(60, 40).bottom).toBeLessThanOrEqual(60);
    expect(place(60, 84).top).toBeGreaterThanOrEqual(80);
  });

  it("stays inside a window shorter than the toolbar and the selection together", () => {
    Object.defineProperty(document.documentElement, "clientHeight", {
      configurable: true,
      value: 150,
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 150 });
    for (const selectionTop of [0, 40, 75, 130]) {
      const { bottom, top } = place(selectionTop, 84, 30);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(150);
    }
  });
});
