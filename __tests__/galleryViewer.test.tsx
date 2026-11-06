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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // storage can be unavailable
  }
});
afterEach(() => cleanup());

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const photo = (index: number) => ({
  alt: `alt ${index}`,
  caption: index % 2 === 0 ? `Caption ${index}` : "",
  fileName: `p${index}.gif`,
  height: 300,
  row: Math.floor(index / 3),
  src: `${PIXEL}#${index}`,
  title: index % 2 === 0 ? `Title ${index}` : "",
  width: 400,
});

const galleryDocument = (count: number) =>
  JSON.stringify({
    root: {
      children: [
        { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
        {
          caption: "",
          images: Array.from({ length: count }, (_, index) => photo(index)),
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

const viewer = () => document.querySelector("[data-gallery-viewer]") as HTMLElement | null;
const counter = () => viewer()?.querySelector("[data-gallery-viewer-count]")?.textContent;
const shownTitle = () => viewer()?.querySelector("[data-gallery-viewer-text]")?.textContent ?? "";

const open = async (
  count = 12,
  composer: NonNullable<Parameters<typeof mount>[0]>["composer"] = {},
) => {
  const mounted = await mount({
    composer: { initialEditorState: galleryDocument(count), ...composer },
  });
  return mounted;
};

const openFromGallery = async () => {
  const button = document.querySelector("[data-gallery-fullscreen]") as HTMLButtonElement;
  button.focus();
  await act(async () => {
    fireEvent.click(button);
  });
  await waitFor(() => expect(viewer()).not.toBeNull());
  return button;
};

const press = async (key: string, init: KeyboardEventInit = {}) => {
  await act(async () => {
    fireEvent.keyDown(viewer() as Element, { key, ...init });
  });
};

describe("the full-screen gallery viewer", () => {
  it("opens from a button on the gallery, in a modal dialog that fills the screen", async () => {
    await open();
    await openFromGallery();
    const box = viewer() as HTMLElement;
    expect(box.getAttribute("role")).toBe("dialog");
    expect(box.getAttribute("aria-modal")).toBe("true");
    expect(box.getAttribute("aria-label")).toBe("Gallery viewer");
    expect(box.className).toContain("fixed");
    expect(box.className).toContain("inset-0");
    expect(box.closest('[data-kg-card="gallery"]')).toBeNull();
    expect(box.closest(".koenig-lexical")).not.toBeNull();
    expect(counter()).toBe("1 of 12");
  });

  it("puts focus inside, locks the page's scroll, and gives both back on close", async () => {
    await open();
    const opener = await openFromGallery();
    expect(viewer()?.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    await press("Escape");
    await waitFor(() => expect(viewer()).toBeNull());
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.activeElement).toBe(opener);
  });

  it("keeps Tab inside the viewer", async () => {
    await open();
    await openFromGallery();
    const stops = [...(viewer() as HTMLElement).querySelectorAll<HTMLElement>("button")];
    const last = stops[stops.length - 1] as HTMLElement;
    last.focus();
    await act(async () => {
      fireEvent.keyDown(last, { key: "Tab" });
    });
    expect(viewer()?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(stops[0]);
  });

  it("moves with the Left and Right arrow keys, Home and End, and stops at the ends", async () => {
    await open();
    await openFromGallery();
    await press("ArrowRight");
    expect(counter()).toBe("2 of 12");
    await press("ArrowLeft");
    await press("ArrowLeft");
    expect(counter()).toBe("1 of 12");
    await press("End");
    expect(counter()).toBe("12 of 12");
    await press("ArrowRight");
    expect(counter()).toBe("12 of 12");
    await press("Home");
    expect(counter()).toBe("1 of 12");
  });

  it("moves with the next and previous buttons", async () => {
    await open();
    await openFromGallery();
    await act(async () => {
      fireEvent.click(viewer()?.querySelector('[aria-label="Next image"]') as Element);
    });
    expect(counter()).toBe("2 of 12");
    await act(async () => {
      fireEvent.click(viewer()?.querySelector('[aria-label="Previous image"]') as Element);
    });
    expect(counter()).toBe("1 of 12");
  });

  it("moves with a swipe", async () => {
    await open();
    await openFromGallery();
    const stage = viewer()?.querySelector("[data-gallery-viewer-stage]") as HTMLElement;
    const swipe = async (fromX: number, toX: number, fromY = 100, toY = 100) => {
      await act(async () => {
        fireEvent.touchStart(stage, { changedTouches: [{ clientX: fromX, clientY: fromY }] });
        fireEvent.touchEnd(stage, { changedTouches: [{ clientX: toX, clientY: toY }] });
      });
    };
    await swipe(300, 100);
    expect(counter()).toBe("2 of 12");
    await swipe(100, 300);
    expect(counter()).toBe("1 of 12");
    await swipe(100, 130);
    expect(counter()).toBe("1 of 12");
    await swipe(300, 100, 100, 400);
    expect(counter()).toBe("1 of 12");
  });

  it("has a thumbnail strip for a long gallery that jumps to a photo", async () => {
    await open(30);
    await openFromGallery();
    const thumbs = [
      ...(viewer() as HTMLElement).querySelectorAll<HTMLElement>("[data-gallery-viewer-thumb]"),
    ];
    expect(thumbs).toHaveLength(30);
    for (const thumb of thumbs) {
      expect(thumb.querySelector("img")?.getAttribute("loading")).toBe("lazy");
    }
    expect(thumbs[0]?.getAttribute("aria-current")).toBe("true");
    await act(async () => {
      fireEvent.click(thumbs[17] as Element);
    });
    expect(counter()).toBe("18 of 30");
    expect(thumbs[17]?.getAttribute("aria-current")).toBe("true");
    expect(thumbs[0]?.getAttribute("aria-current")).toBeNull();
  });

  it("opens at a photo from that photo's own button", async () => {
    await open();
    const buttons = document.querySelectorAll<HTMLElement>("[data-gallery-image-fullscreen]");
    expect(buttons).toHaveLength(12);
    await act(async () => {
      fireEvent.click(buttons[4] as Element);
    });
    await waitFor(() => expect(viewer()).not.toBeNull());
    expect(counter()).toBe("5 of 12");
    expect(shownTitle()).toContain("Title 4");
  });

  it("shows the photo's title and caption over it, and a control that collapses them", async () => {
    await open();
    await openFromGallery();
    expect(shownTitle()).toContain("Title 0");
    expect(shownTitle()).toContain("Caption 0");
    const toggle = viewer()?.querySelector("[data-gallery-viewer-text-toggle]") as HTMLElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // collapsed to the eye, still in the page for a screen reader
    const text = viewer()?.querySelector("[data-gallery-viewer-text]") as HTMLElement;
    expect(text.textContent).toContain("Title 0");
    expect(text.className).toContain("sr-only");
    // a photo with no text has none to show
    await press("ArrowRight");
    expect(viewer()?.querySelector("[data-gallery-viewer-text]")).toBeNull();
  });

  it("gives the photo its alt text", async () => {
    await open();
    await openFromGallery();
    expect(viewer()?.querySelector("[data-gallery-viewer-image]")?.getAttribute("alt")).toBe(
      "alt 0",
    );
    await press("ArrowRight");
    expect(viewer()?.querySelector("[data-gallery-viewer-image]")?.getAttribute("alt")).toBe(
      "alt 1",
    );
  });

  it("respects reduced motion", async () => {
    await open();
    await openFromGallery();
    const animated = [
      ...(viewer() as HTMLElement).querySelectorAll<HTMLElement>("[class*='transition']"),
    ];
    expect(animated.length).toBeGreaterThan(0);
    for (const element of animated) {
      expect(element.className).toContain("motion-reduce:transition-none");
    }
  });

  it("does not let a key typed in the viewer pull focus out to the card's caption", async () => {
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    await openFromGallery();
    const close = viewer()?.querySelector("[data-gallery-viewer-close]") as HTMLElement;
    close.focus();
    await act(async () => {
      fireEvent.keyDown(close, { key: "a" });
    });
    expect(viewer()?.contains(document.activeElement)).toBe(true);
  });

  it("does not toggle the card's own state when its buttons are used", async () => {
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    const card = document.querySelector('[data-kg-card="gallery"]') as HTMLElement;
    await openFromGallery();
    await press("Escape");
    await waitFor(() => expect(viewer()).toBeNull());
    expect(card.getAttribute("data-kg-card-editing")).not.toBe("true");
  });
});

describe("a gallery for someone who can only read it", () => {
  it("offers full screen but no editing", async () => {
    await open(12, { editable: false });
    expect(document.querySelector("[data-gallery-fullscreen]")).not.toBeNull();
    expect(document.querySelectorAll("[data-gallery-image-fullscreen]")).toHaveLength(12);
    expect(document.querySelector("[data-gallery-image-text-edit]")).toBeNull();
    expect(document.querySelector('[aria-label="Delete"]')).toBeNull();
    expect(document.querySelector("input[name='image-input']")).toBeNull();
    expect(document.querySelector("[data-gallery-count]")).toBeNull();
    for (const item of document.querySelectorAll("[data-gallery-image]")) {
      expect(item.getAttribute("tabindex")).toBeNull();
    }
  });

  it("can reach each photo's full-screen button from the keyboard", async () => {
    await open(6, { editable: false });
    for (const button of document.querySelectorAll<HTMLElement>(
      "[data-gallery-image-fullscreen]",
    )) {
      // not hidden with visibility, which would take it out of the tab order
      let node: HTMLElement | null = button;
      while (node && node !== document.body) {
        expect(node.className).not.toMatch(/(^|\s)invisible(\s|$)/);
        node = node.parentElement;
      }
    }
  });

  it("opens the viewer and works the same way", async () => {
    await open(12, { editable: false });
    await openFromGallery();
    await press("ArrowRight");
    expect(counter()).toBe("2 of 12");
    await press("Escape");
    await waitFor(() => expect(viewer()).toBeNull());
  });

  it("shows nothing to upload into when the gallery is empty", async () => {
    await open(0, { editable: false });
    expect(document.querySelector("input[name='image-input']")).toBeNull();
    expect(document.body.textContent).not.toContain("Click to select");
  });
});
