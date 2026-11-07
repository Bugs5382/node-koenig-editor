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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { centerOffset } from "../src/additions/gallery/GalleryViewer";
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

  it("moves with the Left and Right arrow keys, Home and End, and goes round at the ends", async () => {
    await open();
    await openFromGallery();
    await press("ArrowRight");
    expect(counter()).toBe("2 of 12");
    await press("ArrowLeft");
    expect(counter()).toBe("1 of 12");
    await press("End");
    expect(counter()).toBe("12 of 12");
    await press("ArrowRight");
    expect(counter()).toBe("1 of 12");
    await press("ArrowLeft");
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

describe("the thumbnail strip sits centered along the bottom", () => {
  it("centers the group when it fits, and scrolls from the start when it does not", async () => {
    await open(3);
    await openFromGallery();
    const strip = viewer()?.querySelector("[data-gallery-viewer-thumbs]") as HTMLElement;
    // the strip scrolls sideways, and what is inside it centers itself with auto margins: unlike
    // justify-content: center, that never cuts off the first thumbnails when the strip overflows
    expect(strip.className).toContain("overflow-x-auto");
    expect(strip.className).not.toContain("justify-center");
    const group = strip.firstElementChild as HTMLElement;
    expect(group.className).toContain("mx-auto");
    expect(group.querySelectorAll("[data-gallery-viewer-thumb]")).toHaveLength(3);
  });

  it("stays inside the phone's safe area", async () => {
    await open(3);
    await openFromGallery();
    const strip = viewer()?.querySelector("[data-gallery-viewer-thumbs]") as HTMLElement;
    expect(strip.className).toContain("env(safe-area-inset-bottom)");
    expect(strip.className).toContain("env(safe-area-inset-left)");
    expect(strip.className).toContain("env(safe-area-inset-right)");
  });

  it("sits below the photo and its title and caption, not over them", async () => {
    await open(9);
    await openFromGallery();
    const box = viewer() as HTMLElement;
    const strip = box.querySelector("[data-gallery-viewer-thumbs]") as HTMLElement;
    const text = box.querySelector("[data-gallery-viewer-text]") as HTMLElement;
    expect(text).not.toBeNull();
    expect(strip.contains(text)).toBe(false);
    expect(strip.className).not.toMatch(/(^|\s)(absolute|fixed)(\s|$)/);
    // the strip comes after the stage that holds the photo and its text, in the page's flow
    const stage = text.closest("div.relative") as HTMLElement;
    expect(stage.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stage.contains(strip)).toBe(false);
  });

  it("scrolls the current thumbnail to the middle as the photo changes", async () => {
    await open(30);
    await openFromGallery();
    const strip = viewer()?.querySelector("[data-gallery-viewer-thumbs]") as HTMLElement;
    const thumbs = [...strip.querySelectorAll<HTMLElement>("[data-gallery-viewer-thumb]")];
    // jsdom has no layout: give the strip 400 wide and each thumbnail 80 wide with 8 gaps
    Object.defineProperty(strip, "clientWidth", { configurable: true, value: 400 });
    Object.defineProperty(strip, "scrollWidth", { configurable: true, value: 30 * 88 });
    thumbs.forEach((thumb, index) => {
      Object.defineProperty(thumb, "offsetLeft", { configurable: true, value: index * 88 });
      Object.defineProperty(thumb, "offsetWidth", { configurable: true, value: 80 });
    });
    await press("End");
    await waitFor(() => expect(strip.scrollLeft).toBe(30 * 88 - 400));
    await press("Home");
    await waitFor(() => expect(strip.scrollLeft).toBe(0));
    await act(async () => {
      fireEvent.click(thumbs[15] as Element);
    });
    await waitFor(() => expect(strip.scrollLeft).toBe(15 * 88 + 40 - 200));
  });
});

describe("centerOffset", () => {
  it("puts the thumbnail in the middle of the strip", () => {
    expect(
      centerOffset({ scrollWidth: 2640, stripWidth: 400, thumbLeft: 1320, thumbWidth: 80 }),
    ).toBe(1160);
  });

  it("never scrolls past either end", () => {
    expect(centerOffset({ scrollWidth: 2640, stripWidth: 400, thumbLeft: 0, thumbWidth: 80 })).toBe(
      0,
    );
    expect(
      centerOffset({ scrollWidth: 2640, stripWidth: 400, thumbLeft: 2560, thumbWidth: 80 }),
    ).toBe(2240);
  });

  it("does not scroll a strip that fits", () => {
    expect(
      centerOffset({ scrollWidth: 300, stripWidth: 400, thumbLeft: 100, thumbWidth: 80 }),
    ).toBe(0);
  });
});

// jsdom has no top layer; stand in for the browser's native <dialog> so the tests can see that the
// viewer asks for it, which is what keeps it above any z-index a host's page uses.
const withNativeDialog = () => {
  const calls = { close: 0, showModal: 0 };
  const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  const saved = { close: proto.close, showModal: proto.showModal };
  // While a modal dialog is open the rest of the page is inert: focusing it does nothing.
  const realFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, ...args: [FocusOptions?]) {
    const modal = document.querySelector("dialog[open]");
    if (modal && !modal.contains(this)) return;
    realFocus.apply(this, args);
  };
  proto.showModal = function (this: HTMLDialogElement) {
    calls.showModal += 1;
    this.setAttribute("open", "");
  };
  proto.close = function (this: HTMLDialogElement) {
    calls.close += 1;
    this.removeAttribute("open");
  };
  return {
    calls,
    restore: () => {
      HTMLElement.prototype.focus = realFocus;
      proto.close = saved.close;
      proto.showModal = saved.showModal;
    },
  };
};

describe("the viewer is drawn in the browser's top layer", () => {
  let native: ReturnType<typeof withNativeDialog>;
  beforeEach(() => {
    native = withNativeDialog();
  });
  afterEach(() => native.restore());

  it("is a native dialog opened as a modal, so no z-index on the page can cover it", async () => {
    await open();
    await openFromGallery();
    const box = viewer() as HTMLElement;
    expect(box.tagName).toBe("DIALOG");
    expect(native.calls.showModal).toBe(1);
    expect(box.hasAttribute("open")).toBe(true);
    expect(box.getAttribute("role")).toBe("dialog");
    expect(box.getAttribute("aria-modal")).toBe("true");
  });

  it("closes from the X, with a visible, labelled, keyboard-reachable button", async () => {
    await open();
    const opener = await openFromGallery();
    const close = viewer()?.querySelector("[data-gallery-viewer-close]") as HTMLButtonElement;
    expect(close.getAttribute("aria-label")).toBe("Exit full screen");
    expect(close.tabIndex).toBeGreaterThanOrEqual(0);
    expect(close.closest("[data-gallery-viewer-bar]")?.className).toContain(
      "env(safe-area-inset-top)",
    );
    expect(close.closest("[data-gallery-viewer-bar]")?.className).toContain(
      "env(safe-area-inset-right)",
    );
    await act(async () => {
      fireEvent.click(close);
    });
    await waitFor(() => expect(viewer()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("labels the exit control: text on wide screens, a custom tooltip with the Esc hint, always visible", async () => {
    await open();
    await openFromGallery();
    const close = viewer()?.querySelector("[data-gallery-viewer-close]") as HTMLButtonElement;
    // no default browser tooltip box: the tooltip is the editor's own
    expect(close.hasAttribute("title")).toBe(false);
    const text = close.querySelector("[data-gallery-viewer-close-text]") as HTMLElement;
    expect(text.textContent).toBe("Exit full screen");
    expect(text.className).toContain("hidden");
    expect(text.className).toContain("sm:inline");
    const tip = viewer()?.querySelector(
      `#${close.getAttribute("aria-describedby")}`,
    ) as HTMLElement;
    expect(tip.getAttribute("role")).toBe("tooltip");
    expect(tip.textContent).toContain("Exit full screen");
    expect(tip.querySelector("kbd")?.textContent).toBe("Esc");
    expect(tip.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(tip.className).toContain("peer-hover:flex");
    expect(tip.className).toContain("peer-focus-visible:flex");
    // never hidden until hover, and not inside anything that hides
    let node: HTMLElement | null = close;
    while (node && node !== viewer()) {
      expect(node.className).not.toMatch(/(^|\s)(invisible|opacity-0|hidden)(\s|$)/);
      node = node.parentElement;
    }
  });

  it("is the first Tab stop inside the viewer", async () => {
    await open();
    await openFromGallery();
    const stops = [
      ...(viewer() as HTMLElement).querySelectorAll<HTMLElement>(
        "button, input, textarea, select, [href], [tabindex]:not([tabindex='-1'])",
      ),
    ].filter((element) => !(element as HTMLButtonElement).disabled);
    expect(stops[0]?.hasAttribute("data-gallery-viewer-close")).toBe(true);
  });

  it("does not use the browser's own Fullscreen API, so there is nothing else to leave", async () => {
    await open();
    const request = vi.fn();
    (Element.prototype as unknown as Record<string, unknown>).requestFullscreen = request;
    await openFromGallery();
    delete (Element.prototype as unknown as Record<string, unknown>).requestFullscreen;
    expect(request).not.toHaveBeenCalled();
  });

  it("closes from a click on the dark backdrop, but not from a click on the photo", async () => {
    await open();
    const opener = await openFromGallery();
    await act(async () => {
      fireEvent.click(viewer()?.querySelector("[data-gallery-viewer-image]") as Element);
    });
    expect(viewer()).not.toBeNull();
    await act(async () => {
      fireEvent.click(viewer()?.querySelector("[data-gallery-viewer-stage]") as Element);
    });
    await waitFor(() => expect(viewer()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("closes on Escape, including the browser's own cancel event", async () => {
    await open();
    const opener = await openFromGallery();
    const cancel = new Event("cancel", { cancelable: true });
    await act(async () => {
      viewer()?.dispatchEvent(cancel);
    });
    expect(cancel.defaultPrevented).toBe(true);
    await waitFor(() => expect(viewer()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("puts the title and caption dialog in the top layer too", async () => {
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-image-text-edit]") as Element);
    });
    const box = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(box.tagName).toBe("DIALOG");
    expect(native.calls.showModal).toBe(1);
    const cancel = new Event("cancel", { cancelable: true });
    await act(async () => {
      box.dispatchEvent(cancel);
    });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });

  it("still works where the browser has no native dialog", async () => {
    native.restore();
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    expect(proto.showModal).toBeUndefined();
    await open();
    await openFromGallery();
    const box = viewer() as HTMLElement;
    expect(box.hasAttribute("open")).toBe(true);
    expect(box.className).toContain("fixed");
    await press("Escape");
    await waitFor(() => expect(viewer()).toBeNull());
  });
});

describe("the viewer's controls share one soft, quiet look", () => {
  const controls = () => [
    ...(viewer() as HTMLElement).querySelectorAll<HTMLElement>(
      "[data-gallery-viewer-close], [data-gallery-viewer-prev], [data-gallery-viewer-next], [data-gallery-viewer-text-toggle]",
    ),
  ];

  it("has no browser tooltip (title attribute) anywhere in the viewer", async () => {
    await open();
    await openFromGallery();
    expect((viewer() as HTMLElement).querySelectorAll("[title]")).toHaveLength(0);
  });

  it("gives the exit and the arrows custom tooltips with their key hints", async () => {
    await open();
    await openFromGallery();
    const hint = (selector: string) => {
      const control = viewer()?.querySelector(selector) as HTMLElement;
      const tip = viewer()?.querySelector(
        `#${control.getAttribute("aria-describedby")}`,
      ) as HTMLElement;
      return {
        role: tip?.getAttribute("role"),
        text: tip?.textContent,
        key: tip?.querySelector("kbd")?.textContent,
      };
    };
    expect(hint("[data-gallery-viewer-prev]")).toEqual({
      key: "\u2190",
      role: "tooltip",
      text: "Previous image\u2190",
    });
    expect(hint("[data-gallery-viewer-next]")).toEqual({
      key: "\u2192",
      role: "tooltip",
      text: "Next image\u2192",
    });
    expect(hint("[data-gallery-viewer-close]").key).toBe("Esc");
  });

  it("softens the hover into a fade and a small lift, with a visible focus ring", async () => {
    await open();
    await openFromGallery();
    for (const control of controls()) {
      const classes = control.className;
      expect(classes, "translucent, not a flat colour").toContain("bg-white/10");
      expect(classes).toContain("hover:bg-white/20");
      expect(classes).toContain("hover:-translate-y-px");
      expect(classes).toContain("focus-visible:ring-2");
      // a ring is a shadow, which high-contrast mode removes: the outline is what shows there
      expect(classes).toContain("focus-visible:outline-transparent");
      // no white border at rest or after a click; the one ring is soft, translucent and keyboard-only
      expect(classes).toContain("border-transparent");
      expect(classes).not.toMatch(/border-white|outline-white|ring-white(?!\/)|ring-offset/);
      expect(classes).toContain("focus-visible:ring-white/40");
      expect(classes).toContain("outline-0");
      expect(classes).not.toMatch(/(^|\s)(focus:ring|focus:outline|border-2)/);
    }
  });

  it("turns the motion off under reduced motion, on every control and thumbnail", async () => {
    await open();
    await openFromGallery();
    for (const control of controls()) {
      expect(control.className).toContain("motion-reduce:transition-none");
      expect(control.className).toContain("motion-reduce:hover:translate-y-0");
    }
    for (const thumb of (viewer() as HTMLElement).querySelectorAll<HTMLElement>(
      "[data-gallery-viewer-thumb]",
    )) {
      expect(thumb.className).toContain("motion-reduce:transition-none");
      expect(thumb.className).toContain("focus-visible:ring-2");
      expect(thumb.className).toContain("focus-visible:outline-transparent");
    }
  });

  it("styles a disabled arrow quietly, and does not lift it", async () => {
    await open();
    await openFromGallery();
    const prev = viewer()?.querySelector("[data-gallery-viewer-prev]") as HTMLButtonElement;
    expect(prev.className).toContain("disabled:opacity-30");
    expect(prev.className).toContain("disabled:hover:translate-y-0");
  });
});
