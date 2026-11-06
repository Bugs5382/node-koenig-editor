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
import { act, cleanup } from "@testing-library/react";
import { $getRoot } from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const rect = (left: number, width: number): DOMRect =>
  ({ bottom: 20, height: 20, left, right: left + width, top: 0, width, x: left, y: 0 }) as DOMRect;

// jsdom has no layout: give the editor's box, the empty line and the button the sizes a browser would.
const withLayout = (box: DOMRect, line: DOMRect) => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this.matches(".koenig-lexical")) return box;
    if (this.tagName === "P") return line;
    if (this.closest("[data-kg-plus-button]") && this.tagName === "BUTTON") return rect(0, 22);
    return rect(0, 0);
  });
};

const showPlus = async (box: DOMRect, line: DOMRect) => {
  const { api } = await mount();
  withLayout(box, line);
  const editor = api.editorInstance;
  await act(async () => {
    editor.getRootElement()?.focus();
    editor.update(() => {
      const p = $getRoot().getFirstChild();
      p?.selectStart();
    });
  });
  const root = editor.getRootElement() as HTMLElement;
  const p = root.querySelector("p") as HTMLElement;
  await act(async () => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    selection?.addRange(range);
    editor.update(() => {
      $getRoot().getFirstChild()?.selectStart();
    });
  });
  return document.querySelector("[data-kg-plus-container]") as HTMLElement | null;
};

describe("the plus button stays inside the editor's box", () => {
  it("sits in the host's padding, before the placeholder, not over it", async () => {
    // The editor starts at the text; the 56px of padding belongs to a host card around it.
    const { api } = await mount();
    const root = api.editorInstance.getRootElement() as HTMLElement;
    const wrapper = root.closest(".koenig-lexical") as HTMLElement;
    // The host card is the element around the editor (here the render container).
    const card = wrapper.parentElement as HTMLElement;
    card.style.backgroundColor = "rgb(255, 255, 255)";
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this === card) return rect(0, 700);
      if (this.matches(".koenig-lexical")) return rect(56, 600);
      if (this.tagName === "P") return rect(56, 600);
      if (this.closest("[data-kg-plus-button]") && this.tagName === "BUTTON") return rect(0, 22);
      return rect(0, 0);
    });
    await act(async () => {
      root.focus();
      api.editorInstance.update(() => {
        $getRoot().getFirstChild()?.selectStart();
      });
    });
    const container = document.querySelector("[data-kg-plus-container]") as HTMLElement | null;
    expect(container).not.toBeNull();
    // The container is positioned against .koenig-lexical, which starts at the text (56).
    // The button belongs 22 + 8 before the text, inside the card.
    expect(Number.parseFloat(container!.style.left)).toBe(-(22 + 8));
  });

  it("sits before the empty line when the padding leaves room", async () => {
    const container = await showPlus(rect(0, 600), rect(80, 520));
    expect(container).not.toBeNull();
    expect(Number.parseFloat(container!.style.left)).toBe(80 - 22 - 8);
  });

  it("sits at the box's left edge with no padding, never at a negative offset", async () => {
    const container = await showPlus(rect(0, 600), rect(0, 600));
    expect(container).not.toBeNull();
    expect(Number.parseFloat(container!.style.left)).toBe(0);
  });

  it("stays inside a narrow host container", async () => {
    const container = await showPlus(rect(0, 40), rect(200, 40));
    expect(container).not.toBeNull();
    const left = Number.parseFloat(container!.style.left);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + 22).toBeLessThanOrEqual(40);
  });
});
