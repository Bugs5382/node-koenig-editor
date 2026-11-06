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
import { $getRoot } from "lexical";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // storage can be unavailable; the tests that need it say so
  }
});
beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // see above
  }
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const image = (name: string, extra: Record<string, unknown> = {}) => ({
  alt: name,
  caption: "",
  fileName: `${name}.gif`,
  height: 300,
  row: 0,
  src: `${PIXEL}#${name}`,
  title: "",
  width: 400,
  ...extra,
});

const galleryDocument = (images: unknown[]) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
        { caption: "", images, type: "gallery", version: 1 },
        {
          children: [],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const SAMPLE = [
  image("one", { caption: "First &amp; best", title: "Alpha" }),
  image("two", { caption: "", title: "" }),
  image("three", { caption: "Third", title: "" }),
];

const galleryOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "gallery");

const open = async (images: unknown[] = SAMPLE) => {
  const mounted = await mount({ composer: { initialEditorState: galleryDocument(images) } });
  return mounted;
};

const selectGallery = async () => {
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-card="gallery"] img') as Element);
  });
  await waitFor(() =>
    expect(
      document.querySelector('[data-kg-card="gallery"]')?.getAttribute("data-kg-card-selected"),
    ).toBe("true"),
  );
};

const textButtons = () => [
  ...document.querySelectorAll<HTMLButtonElement>("[data-gallery-image-text-edit]"),
];

const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null;

const openDialogFor = async (index: number) => {
  await selectGallery();
  await act(async () => {
    fireEvent.click(textButtons()[index] as Element);
  });
  await waitFor(() => expect(dialog()).not.toBeNull());
  return dialog() as HTMLElement;
};

describe("selecting a photo offers a title and caption dialog, not inline caption boxes", () => {
  it("has no inline caption or alt box and no arrow buttons under the images", async () => {
    await open();
    await selectGallery();
    expect(document.querySelector("[data-gallery-image-caption]")).toBeNull();
    expect(document.querySelector("[data-gallery-image-alt]")).toBeNull();
    expect(document.querySelector("[data-gallery-image-earlier]")).toBeNull();
    expect(document.querySelector("[data-gallery-image-later]")).toBeNull();
    expect(document.querySelector("[data-row-controls]")).toBeNull();
  });

  it("shows an edit icon for each photo when the gallery is selected, next to the remove icon", async () => {
    await open();
    await selectGallery();
    expect(textButtons()).toHaveLength(3);
    for (const button of textButtons()) {
      expect(button.getAttribute("aria-label")).toBe("Edit title, caption and alt text");
      expect(button.parentElement?.querySelector('[aria-label="Delete"]')).not.toBeNull();
    }
  });

  it("opens a modal dialog with the photo's title and caption", async () => {
    await open();
    const box = await openDialogFor(0);
    expect(box.getAttribute("aria-modal")).toBe("true");
    expect(box.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(box.getAttribute("aria-labelledby") as string)).not.toBeNull();
    const title = box.querySelector("[data-gallery-text-title]") as HTMLInputElement;
    const caption = box.querySelector("textarea") as HTMLTextAreaElement;
    const alt = box.querySelector("[data-gallery-text-alt]") as HTMLInputElement;
    expect(title.value).toBe("Alpha");
    expect(caption.value).toBe("First & best");
    expect(alt.value).toBe("one");
    expect(document.activeElement).toBe(title);
    expect(box.querySelector("label [data-gallery-text-alt]")).not.toBeNull();
  });

  it("saves the title and caption for that photo only", async () => {
    const { api } = await open();
    const box = await openDialogFor(1);
    await act(async () => {
      fireEvent.change(box.querySelector("[data-gallery-text-title]") as Element, {
        target: { value: "Beta" },
      });
      fireEvent.change(box.querySelector("textarea") as Element, {
        target: { value: "Tom & <Jerry>" },
      });
      fireEvent.change(box.querySelector("[data-gallery-text-alt]") as Element, {
        target: { value: "A cat and a mouse" },
      });
    });
    await act(async () => {
      fireEvent.click(box.querySelector("[data-gallery-text-save]") as Element);
    });
    await waitFor(() => expect(dialog()).toBeNull());
    const images = galleryOf(api.serialize()).images;
    expect(images[0]).toMatchObject({ title: "Alpha", caption: "First &amp; best" });
    expect(images[1]).toMatchObject({
      alt: "A cat and a mouse",
      caption: "Tom &amp; &lt;Jerry&gt;",
      title: "Beta",
    });
    expect(images[0]).toMatchObject({ alt: "one" });
    expect(images[2]).toMatchObject({ caption: "Third" });
  });

  it("Escape closes it without saving and puts focus back on the icon", async () => {
    const { api } = await open();
    const box = await openDialogFor(0);
    await act(async () => {
      fireEvent.change(box.querySelector("input") as Element, { target: { value: "Changed" } });
      fireEvent.keyDown(box, { key: "Escape" });
    });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(galleryOf(api.serialize()).images[0].title).toBe("Alpha");
    expect(document.activeElement).toBe(textButtons()[0]);
  });

  it("keeps Tab inside the dialog", async () => {
    await open();
    const box = await openDialogFor(0);
    const fields = [...box.querySelectorAll<HTMLElement>("input, textarea, button")];
    const last = fields[fields.length - 1] as HTMLElement;
    const first = fields[0] as HTMLElement;
    last.focus();
    await act(async () => {
      fireEvent.keyDown(last, { key: "Tab" });
    });
    expect(document.activeElement).toBe(first);
    first.focus();
    await act(async () => {
      fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    });
    expect(document.activeElement).toBe(last);
  });

  it("renders outside the card, so the card's own width and transform do not place it", async () => {
    await open();
    const box = await openDialogFor(0);
    expect(box.closest('[data-kg-card="gallery"]')).toBeNull();
    expect(box.closest(".koenig-lexical")).not.toBeNull();
  });
});

describe("typing in the dialog never reaches the document", () => {
  it("text, Backspace, Delete, Enter and the arrows leave the document and the gallery alone", async () => {
    const { api } = await open();
    const before = JSON.parse(api.serialize());
    const box = await openDialogFor(0);
    const title = box.querySelector("[data-gallery-text-title]") as HTMLInputElement;
    const caption = box.querySelector("textarea") as HTMLTextAreaElement;
    // The caption takes every key; in the title, Enter saves, so it comes last.
    caption.focus();
    await act(async () => {
      for (const key of ["a", "Backspace", "Delete", "Enter", "ArrowUp", "ArrowDown"]) {
        fireEvent.keyDown(caption, { key });
        fireEvent.keyUp(caption, { key });
      }
    });
    title.focus();
    await act(async () => {
      for (const key of ["a", "Backspace", "Delete", "ArrowUp", "ArrowDown"]) {
        fireEvent.keyDown(title, { key });
        fireEvent.keyUp(title, { key });
      }
    });
    expect(JSON.parse(api.serialize())).toEqual(before);
    expect(api.editorInstance.getEditorState().read(() => $getRoot().getChildrenSize())).toBe(3);
    expect(dialog()).not.toBeNull();
    await act(async () => {
      fireEvent.keyDown(title, { key: "Enter" });
    });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(JSON.parse(api.serialize())).toEqual(before);
    expect(api.editorInstance.getEditorState().read(() => $getRoot().getChildrenSize())).toBe(3);
  });

  it("clicks in the dialog do not toggle the card", async () => {
    await open();
    const box = await openDialogFor(0);
    const card = document.querySelector('[data-kg-card="gallery"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(box.querySelector("input") as Element);
    });
    expect(card.getAttribute("data-kg-card-selected")).toBe("true");
    expect(card.getAttribute("data-kg-card-editing")).not.toBe("true");
  });
});

describe("the title and caption show over the bottom of the photo", () => {
  it("shows an overlay for a photo that has text, and none for one that has none", async () => {
    await open();
    const overlays = document.querySelectorAll("[data-gallery-image-text]");
    expect(overlays).toHaveLength(2);
    expect(overlays[0]?.textContent).toContain("Alpha");
    expect(overlays[0]?.textContent).toContain("First & best");
  });

  it("collapses one photo's text visually, keeps it readable to a screen reader, and remembers it", async () => {
    await open();
    const toggle = document.querySelector("[data-gallery-image-text-toggle]") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const panelId = toggle.getAttribute("aria-controls") as string;
    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const panel = document.getElementById(panelId) as HTMLElement;
    expect(panel.textContent).toContain("Alpha");
    expect(panel.hasAttribute("hidden")).toBe(false);
    expect(panel.getAttribute("data-collapsed")).toBe("true");
    expect(panel.className).toContain("sr-only");
    expect(toggle.getAttribute("aria-label")).toBe("Show title and caption");
    cleanup();
    await open();
    expect(
      (document.querySelector("[data-gallery-image-text-toggle]") as HTMLElement).getAttribute(
        "aria-expanded",
      ),
    ).toBe("false");
  });

  it("one control for the gallery collapses and expands every photo's text", async () => {
    await open();
    const all = document.querySelector("[data-gallery-text-toggle-all]") as HTMLButtonElement;
    expect(all.getAttribute("aria-label")).toBe("Hide all titles and captions");
    await act(async () => {
      fireEvent.click(all);
    });
    for (const toggle of document.querySelectorAll("[data-gallery-image-text-toggle]")) {
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    }
    expect(all.getAttribute("aria-label")).toBe("Show all titles and captions");
    for (const panel of document.querySelectorAll("[data-gallery-image-text]")) {
      expect(panel.textContent?.length).toBeGreaterThan(0);
    }
    await act(async () => {
      fireEvent.click(all);
    });
    for (const toggle of document.querySelectorAll("[data-gallery-image-text-toggle]")) {
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
    }
  });

  it("a photo can be shown again after hiding all", async () => {
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-text-toggle-all]") as Element);
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-image-text-toggle]") as Element);
    });
    const toggles = [...document.querySelectorAll("[data-gallery-image-text-toggle]")];
    expect(toggles[0]?.getAttribute("aria-expanded")).toBe("true");
    expect(toggles[1]?.getAttribute("aria-expanded")).toBe("false");
  });

  it("works when the browser's storage is unavailable", async () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage") as PropertyDescriptor;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      await open();
      const toggle = document.querySelector(
        "[data-gallery-image-text-toggle]",
      ) as HTMLButtonElement;
      await act(async () => {
        fireEvent.click(toggle);
      });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });
});

describe("the dialog also holds the alt text, and says how to move a photo", () => {
  it("has three labelled fields and a help text about Alt and the arrow keys", async () => {
    await open();
    const box = await openDialogFor(0);
    const labels = [...box.querySelectorAll("label")].map((label) =>
      label.firstChild?.textContent?.trim(),
    );
    expect(labels).toEqual(["Title", "Caption", "Alt text"]);
    const help = box.querySelector("[data-gallery-text-help]") as HTMLElement;
    expect(help.textContent).toMatch(/Alt/);
    expect(help.textContent).toMatch(/arrow/i);
    expect(box.getAttribute("aria-describedby")).toBe(help.id);
  });
});

const items = () => [...document.querySelectorAll<HTMLElement>("[data-gallery-image]")];
const names = (api: { serialize: () => string }) =>
  galleryOf(api.serialize()).images.map((photo: { fileName: string }) => photo.fileName);
const live = () => document.querySelector("[data-gallery-announce]") as HTMLElement;

const altArrow = async (item: HTMLElement, key: "ArrowLeft" | "ArrowRight") => {
  await act(async () => {
    fireEvent.keyDown(item, { altKey: true, key });
  });
};

describe("Alt and the left or right arrow move the focused photo", () => {
  it("makes each photo focusable only while the gallery is selected", async () => {
    await open();
    for (const item of items()) expect(item.getAttribute("tabindex")).toBeNull();
    await selectGallery();
    for (const item of items()) expect(item.getAttribute("tabindex")).toBe("0");
    expect(items()[1]?.getAttribute("aria-label")).toBe("Image 2 of 3");
  });

  it("Alt+Left moves a photo before the one in front of it and announces it", async () => {
    const { api } = await open();
    await selectGallery();
    items()[1]?.focus();
    await altArrow(items()[1] as HTMLElement, "ArrowLeft");
    expect(names(api)).toEqual(["two.gif", "one.gif", "three.gif"]);
    expect(live().textContent).toBe("Image 2 of 3, moved before image 1");
    expect(live().getAttribute("aria-live")).toBe("polite");
  });

  it("Alt+Right moves it after the next one, and focus stays on the moved photo", async () => {
    const { api } = await open();
    await selectGallery();
    items()[0]?.focus();
    await altArrow(items()[0] as HTMLElement, "ArrowRight");
    expect(names(api)).toEqual(["two.gif", "one.gif", "three.gif"]);
    expect(live().textContent).toBe("Image 1 of 3, moved after image 2");
    await waitFor(() => {
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Image 2 of 3");
    });
    expect(document.activeElement?.querySelector("img")?.getAttribute("alt")).toBe("one");
  });

  it("says so at the ends and changes nothing", async () => {
    const { api } = await open();
    await selectGallery();
    await altArrow(items()[0] as HTMLElement, "ArrowLeft");
    expect(names(api)).toEqual(["one.gif", "two.gif", "three.gif"]);
    expect(live().textContent).toBe("Image 1 of 3 is already first");
    await altArrow(items()[2] as HTMLElement, "ArrowRight");
    expect(names(api)).toEqual(["one.gif", "two.gif", "three.gif"]);
    expect(live().textContent).toBe("Image 3 of 3 is already last");
  });

  it("leaves the arrows alone without Alt, and leaves the document's cursor keys alone", async () => {
    const { api } = await open();
    await selectGallery();
    await act(async () => {
      fireEvent.keyDown(items()[1] as HTMLElement, { key: "ArrowLeft" });
    });
    expect(names(api)).toEqual(["one.gif", "two.gif", "three.gif"]);
    expect(live().textContent).toBe("");
  });

  it("does not move a photo while a field in the dialog has the keys", async () => {
    const { api } = await open();
    const box = await openDialogFor(1);
    await act(async () => {
      fireEvent.keyDown(box.querySelector("[data-gallery-text-title]") as Element, {
        altKey: true,
        key: "ArrowLeft",
      });
    });
    expect(names(api)).toEqual(["one.gif", "two.gif", "three.gif"]);
  });
});

describe("the remembered collapse choice follows the photo, not the order", () => {
  it("is kept when a photo is moved with Alt and the arrow keys", async () => {
    await open();
    await selectGallery();
    const toggles = () =>
      [...document.querySelectorAll<HTMLElement>("[data-gallery-image-text-toggle]")].map(
        (toggle) => toggle.getAttribute("aria-expanded"),
      );
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-image-text-toggle]") as Element);
    });
    expect(toggles()).toEqual(["false", "true"]);
    // "one" moves right twice, past "two" and "three", so it is now the last photo with text
    for (const position of [0, 1]) {
      await act(async () => {
        fireEvent.keyDown(document.querySelectorAll("[data-gallery-image]")[position] as Element, {
          altKey: true,
          key: "ArrowRight",
        });
      });
    }
    // the collapsed photo is now second of the two; the choice went with it
    expect(toggles()).toEqual(["true", "false"]);
    cleanup();
    await open();
    expect(
      [...document.querySelectorAll<HTMLElement>("[data-gallery-image-text-toggle]")].map(
        (toggle) => toggle.getAttribute("aria-expanded"),
      ),
    ).toEqual(["false", "true"]);
  });

  it("is kept when a photo is added to the gallery", async () => {
    await open();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-text-toggle-all]") as Element);
    });
    cleanup();
    await open([...SAMPLE, image("four", { row: 1, title: "Delta" })]);
    const toggles = [...document.querySelectorAll<HTMLElement>("[data-gallery-image-text-toggle]")];
    expect(toggles.map((toggle) => toggle.getAttribute("aria-expanded"))).toEqual([
      "false",
      "false",
      "true",
    ]);
  });
});
