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
import { act, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const galleryDocument = JSON.stringify({
  root: {
    children: [
      { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
      {
        caption: "",
        images: [
          {
            alt: "a",
            caption: "A long caption",
            fileName: "a.gif",
            height: 100,
            row: 0,
            src: `${PIXEL}#a`,
            title: "T",
            width: 100,
          },
        ],
        type: "gallery",
        version: 1,
      },
      { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

// jsdom has no layout, so these check the classes that keep things inside a narrow screen or a big
// text size; the real measurements are made in a browser (see the size matrix in the PR).
describe("what keeps the editor inside a narrow window or a large text size", () => {
  it("never lets the card menu be wider than the window", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    const menu = document.querySelector('[role="menu"]') as HTMLElement;
    expect(menu.className).toContain("max-w-[calc(100vw-16px)]");
  });

  it("never lets an upload placeholder button be wider than its card", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card-menu-item="Gallery"]') as Element);
    });
    const placeholder = document.querySelector(
      '[data-kg-card="gallery"] button.group',
    ) as HTMLElement;
    expect(placeholder.className).toContain("max-w-full");
  });

  it("keeps a photo's title and caption inside the photo, scrolling when the text is taller", async () => {
    await mount({ composer: { initialEditorState: galleryDocument } });
    const wrap = document.querySelector("[data-gallery-image-text-wrap]") as HTMLElement;
    const text = document.querySelector("[data-gallery-image-text]") as HTMLElement;
    expect(wrap.className).toContain("max-h-full");
    expect(text.className).toContain("max-h-full");
    expect(text.className).toContain("overflow-y-auto");
    // and never wider than a narrow photo: its padding shrinks with it and long words wrap
    expect(text.className).toContain("min-w-0");
    expect(text.className).toContain("break-words");
  });
});
