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
import type { FileUploader, KoenigGalleryRenderProps } from "node-koenig-editor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

// jsdom neither decodes images nor makes object URLs, so both are stood in for.
beforeEach(() => {
  let counter = 0;
  URL.createObjectURL = () => `blob:preview-${counter++}`;
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

const png = (name: string) => new File(["x"], name, { type: "image/png" });

/** A host uploader that records every call and answers with one url per file. */
const recordingUploader = (calls: string[][]): Partial<FileUploader> => ({
  fileTypes: { image: { extensions: [".png"], mimeTypes: ["image/png"] } },
  useFileUpload: () => ({
    errors: [],
    isLoading: false,
    progress: 0,
    upload: async (files) => {
      const names = [...files].map((file) => file.name);
      calls.push(names);
      return names.map((name) => ({ fileName: name, url: `https://cdn.test/${name}` }));
    },
  }),
});

const insertGallery = async (composer: Parameters<typeof mount>[0] = {}) => {
  const mounted = await mount(composer);
  await openSlashMenu(mounted.api);
  const item = document.querySelector('[data-kg-card-menu-item="Gallery"]');
  expect(item, "the Gallery entry is in the slash menu").not.toBeNull();
  await act(async () => {
    fireEvent.click(item as Element);
  });
  return mounted;
};

const addFiles = async (files: File[]) => {
  const input = document.querySelector('input[name="image-input"]') as HTMLInputElement;
  expect(input).not.toBeNull();
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
};

const galleryOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "gallery");

describe("the gallery card", () => {
  it("calls the host's uploader once per image", async () => {
    const calls: string[][] = [];
    await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles([png("a.png"), png("b.png"), png("c.png")]);
    await waitFor(() => expect(calls).toHaveLength(3));
    expect(calls).toEqual([["a.png"], ["b.png"], ["c.png"]]);
  });

  it("saves the uploaded urls in order", async () => {
    const calls: string[][] = [];
    const { api } = await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles([png("a.png"), png("b.png")]);
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(2));
    const images = galleryOf(api.serialize()).images;
    expect(images.map((image: { src: string }) => image.src)).toEqual([
      "https://cdn.test/a.png",
      "https://cdn.test/b.png",
    ]);
  });

  it("stops at nine images and says so", async () => {
    const calls: string[][] = [];
    const { api } = await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles(Array.from({ length: 11 }, (_, index) => png(`${index}.png`)));
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(9));
    expect(calls).toHaveLength(9);
    expect(document.querySelector('[data-testid="gallery-error"]')).not.toBeNull();
  });

  it("refuses a file the host's types do not allow, without calling the uploader", async () => {
    const calls: string[][] = [];
    await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles([new File(["x"], "notes.pdf", { type: "application/pdf" })]);
    await waitFor(() =>
      expect(document.querySelector('[data-testid="gallery-error"]')).not.toBeNull(),
    );
    expect(calls).toHaveLength(0);
  });

  it("keeps an alt text and a caption for each image", async () => {
    const calls: string[][] = [];
    const { api } = await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles([png("a.png"), png("b.png")]);
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(2));
    const alts = document.querySelectorAll<HTMLInputElement>("[data-gallery-image-alt]");
    const captions = document.querySelectorAll<HTMLInputElement>("[data-gallery-image-caption]");
    expect(alts).toHaveLength(2);
    await act(async () => {
      fireEvent.change(alts[1] as Element, { target: { value: "Second picture" } });
      fireEvent.change(captions[1] as Element, { target: { value: "Taken on site" } });
    });
    const images = galleryOf(api.serialize()).images;
    expect(images[0]).toMatchObject({ alt: "", caption: "" });
    expect(images[1]).toMatchObject({ alt: "Second picture", caption: "Taken on site" });
  });

  it("moves an image earlier and later", async () => {
    const calls: string[][] = [];
    const { api } = await insertGallery({ composer: { fileUploader: recordingUploader(calls) } });
    await addFiles([png("a.png"), png("b.png"), png("c.png")]);
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(3));
    await act(async () => {
      fireEvent.click(document.querySelectorAll("[data-gallery-image-earlier]")[2] as Element);
    });
    const names = galleryOf(api.serialize()).images.map((image: { src: string }) =>
      image.src.split("/").pop(),
    );
    expect(names).toEqual(["a.png", "c.png", "b.png"]);
  });

  it("lets a host replace the layout through cardRenderers.gallery", async () => {
    const calls: string[][] = [];
    let seen: KoenigGalleryRenderProps | undefined;
    const Replacement = (props: KoenigGalleryRenderProps) => {
      seen = props;
      return (
        <div data-custom-gallery>
          {props.images.map((image) => (
            <span key={image.fileName} data-custom-image>
              {image.alt}
            </span>
          ))}
        </div>
      );
    };
    const { api } = await insertGallery({
      composer: {
        cardRenderers: { gallery: Replacement },
        fileUploader: recordingUploader(calls),
      },
    });
    expect(document.querySelector("[data-custom-gallery]")).not.toBeNull();
    expect(document.querySelector("[data-gallery]")).toBeNull();
    expect(seen?.maxImages).toBe(9);
    await act(async () => {
      await seen?.addFiles([png("a.png"), png("b.png")]);
    });
    await waitFor(() => expect(galleryOf(api.serialize())?.images).toHaveLength(2));
    expect(calls).toEqual([["a.png"], ["b.png"]]);
    await act(async () => {
      seen?.updateImage(0, { alt: "From the host" });
    });
    expect(galleryOf(api.serialize()).images[0].alt).toBe("From the host");
    await act(async () => {
      seen?.moveImage(0, 1);
    });
    expect(galleryOf(api.serialize()).images[1].alt).toBe("From the host");
    await act(async () => {
      seen?.removeImage(0);
    });
    expect(galleryOf(api.serialize()).images).toHaveLength(1);
  });
});

describe("the card choice", () => {
  it("leaves the gallery out of the menu when cards omits it", async () => {
    const { api } = await mount({ composer: { cards: ["image", "divider", "callout", "toggle"] } });
    const labels = await openSlashMenu(api);
    expect(labels).not.toContain("Gallery");
    expect(labels).not.toContain("Header");
  });
});
