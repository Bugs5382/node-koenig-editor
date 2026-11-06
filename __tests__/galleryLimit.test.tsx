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
import type { FileUploader } from "node-koenig-editor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

beforeEach(() => {
  let counter = 0;
  URL.createObjectURL = () => `blob:preview-${counter++}`;
  URL.revokeObjectURL = () => {};
  vi.stubGlobal(
    "Image",
    class {
      naturalHeight = 300;
      naturalWidth = 400;
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const photo = (index: number, extra: Record<string, unknown> = {}) => ({
  alt: `photo ${index}`,
  caption: "",
  fileName: `p${index}.gif`,
  height: 300,
  row: 0,
  src: `${PIXEL}#${index}`,
  title: "",
  width: 400,
  ...extra,
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

const galleryOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "gallery");

const png = (name: string) => new File(["x"], name, { type: "image/png" });

const insertGallery = async (composer: Parameters<typeof mount>[0] = {}) => {
  const mounted = await mount(composer);
  await openSlashMenu(mounted.api);
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-card-menu-item="Gallery"]') as Element);
  });
  return mounted;
};

const addFiles = async (files: File[]) => {
  const input = document.querySelector('input[name="image-input"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
};

/** Records every call and how many were running at once. */
const trackingUploader = (state: {
  calls: string[];
  inFlight: number;
  peak: number;
  failOn?: string;
}) =>
  ({
    fileTypes: { image: { extensions: [".png"], mimeTypes: ["image/png"] } },
    useFileUpload: () => ({
      errors: [],
      isLoading: false,
      progress: 0,
      upload: async (files: File[]) => {
        const name = [...files][0]!.name;
        state.calls.push(name);
        state.inFlight += 1;
        state.peak = Math.max(state.peak, state.inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        state.inFlight -= 1;
        if (state.failOn === name) throw new Error("host failure");
        return [{ fileName: name, url: `https://cdn.test/${name}` }];
      },
    }),
  }) as Partial<FileUploader>;

describe("how many images a gallery holds", () => {
  it("holds 50 by default", async () => {
    const state = { calls: [] as string[], inFlight: 0, peak: 0 };
    const { api } = await insertGallery({ composer: { fileUploader: trackingUploader(state) } });
    await addFiles(Array.from({ length: 53 }, (_, index) => png(`${index}.png`)));
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(50), {
      timeout: 5000,
    });
    expect(state.calls).toHaveLength(50);
    expect(document.querySelector('[data-testid="gallery-error"]')?.textContent).toContain("50");
  });

  it("takes a limit from the host, and says it in the wording", async () => {
    const state = { calls: [] as string[], inFlight: 0, peak: 0 };
    const { api } = await insertGallery({
      composer: { fileUploader: trackingUploader(state), gallery: { maxImages: 4 } },
    });
    expect(document.body.textContent).toContain("Click to select up to 4 images");
    await addFiles(Array.from({ length: 6 }, (_, index) => png(`${index}.png`)));
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(4));
    expect(state.calls).toHaveLength(4);
    expect(document.querySelector('[data-testid="gallery-error"]')?.textContent).toContain("4");
  });

  it("says 50 in the empty gallery when the host sets nothing", async () => {
    await insertGallery();
    expect(document.body.textContent).toContain("Click to select up to 50 images");
  });

  it("ignores a limit that is not a positive whole number", async () => {
    await insertGallery({ composer: { gallery: { maxImages: -3 } } });
    expect(document.body.textContent).toContain("up to 50 images");
  });

  it("shows and keeps a stored gallery of more than the old nine", async () => {
    const { api } = await mount({ composer: { initialEditorState: galleryDocument(24) } });
    expect(document.querySelectorAll("[data-gallery] [data-image]")).toHaveLength(24);
    expect(galleryOf(api.serialize()).images).toHaveLength(24);
  });

  it("never drops stored images when the host's limit is lower than the gallery", async () => {
    const { api } = await mount({
      composer: { gallery: { maxImages: 9 }, initialEditorState: galleryDocument(30) },
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-image-text-edit]") as Element);
    });
    const box = document.querySelector('[role="dialog"]') as HTMLElement;
    await act(async () => {
      fireEvent.change(box.querySelector("[data-gallery-text-title]") as Element, {
        target: { value: "Edited" },
      });
      fireEvent.click(box.querySelector("[data-gallery-text-save]") as Element);
    });
    const images = galleryOf(api.serialize()).images;
    expect(images).toHaveLength(30);
    expect(images[0].title).toBe("Edited");
  });

  it("does not take more images once a stored gallery is already over the limit", async () => {
    const state = { calls: [] as string[], inFlight: 0, peak: 0 };
    const { api } = await mount({
      composer: {
        fileUploader: trackingUploader(state),
        gallery: { maxImages: 9 },
        initialEditorState: galleryDocument(12),
      },
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    await addFiles([png("extra.png")]);
    await waitFor(() =>
      expect(document.querySelector('[data-testid="gallery-error"]')).not.toBeNull(),
    );
    expect(state.calls).toHaveLength(0);
    expect(galleryOf(api.serialize()).images).toHaveLength(12);
  });
});

describe("sending many files", () => {
  it("calls the uploader once per image, a few at a time, and keeps the order", async () => {
    const state = { calls: [] as string[], inFlight: 0, peak: 0 };
    const { api } = await insertGallery({ composer: { fileUploader: trackingUploader(state) } });
    const names = Array.from({ length: 12 }, (_, index) => `${index}.png`);
    await addFiles(names.map(png));
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(12), {
      timeout: 5000,
    });
    expect(state.calls.sort()).toEqual([...names].sort());
    expect(state.peak).toBeGreaterThan(1);
    expect(state.peak).toBeLessThanOrEqual(3);
    expect(galleryOf(api.serialize()).images.map((image: { src: string }) => image.src)).toEqual(
      names.map((name) => `https://cdn.test/${name}`),
    );
  });

  it("one failed upload does not stop the others", async () => {
    const state = { calls: [] as string[], failOn: "3.png", inFlight: 0, peak: 0 };
    const { api } = await insertGallery({ composer: { fileUploader: trackingUploader(state) } });
    await addFiles(Array.from({ length: 6 }, (_, index) => png(`${index}.png`)));
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(5), {
      timeout: 5000,
    });
    expect(
      galleryOf(api.serialize()).images.map((image: { src: string }) => image.src.split("/").pop()),
    ).toEqual(["0.png", "1.png", "2.png", "4.png", "5.png"]);
    expect(document.querySelector('[data-testid="gallery-error"]')).not.toBeNull();
  });

  it("loads images lazily and decodes them off the main thread", async () => {
    await mount({ composer: { initialEditorState: galleryDocument(6) } });
    for (const image of document.querySelectorAll("[data-gallery] img")) {
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.getAttribute("decoding")).toBe("async");
    }
  });
});
