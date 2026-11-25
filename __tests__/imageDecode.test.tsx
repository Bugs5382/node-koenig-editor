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

import { mount, openSlashMenu } from "./__utils__/mount";

// A stand-in for the browser's decoder: a blob URL is a picture only when its file starts with the
// PNG signature "PNG!" in this test, and anything else fails to load, the way a text file does.
const pictures = new Map<string, boolean>();
let counter = 0;

const uploaded: File[] = [];
const uploader = {
  useFileUpload: () => ({
    errors: [],
    isLoading: false,
    progress: 0,
    upload: async (files: File[] | FileList) => {
      uploaded.push(...Array.from(files));
      return [{ url: "https://host.test/uploaded.png" }];
    },
  }),
};

beforeEach(() => {
  uploaded.length = 0;
  pictures.clear();
  class FakeImage {
    naturalHeight = 600;
    naturalWidth = 800;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    set src(value: string) {
      queueMicrotask(() => (pictures.get(value) ? this.onload?.() : this.onerror?.()));
    }
  }
  vi.stubGlobal("Image", FakeImage);
  URL.createObjectURL = vi.fn((file: Blob) => {
    const url = `blob:test-${counter++}`;
    pictures.set(url, (file as File & { __picture?: boolean }).__picture === true);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = (name: string, picture: boolean) =>
  Object.assign(new File([picture ? "PNG!" : "just some words"], name, { type: "image/png" }), {
    __picture: picture,
  });

const insertAndPick = async (picked: File, composer: Parameters<typeof mount>[0] = {}) => {
  const { api } = await mount({
    ...composer,
    composer: { fileUploader: uploader, tools: [], ...composer?.composer },
  });
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-card-menu-item="Image"]') as Element);
  });
  const input = await waitFor(() => {
    const found = document.querySelector<HTMLInputElement>("input[name='image-input']");
    expect(found).not.toBeNull();
    return found as HTMLInputElement;
  });
  await act(async () => {
    fireEvent.change(input, { target: { files: [picked] } });
  });
  return api;
};

describe("a file that is not a picture", () => {
  it("shows a plain error on the card, uploads nothing and says so to the host", async () => {
    const onUploadError = vi.fn();
    const api = await insertAndPick(file("notes.png", false), { composer: { onUploadError } });
    const error = await waitFor(() => {
      const found = document.querySelector("[data-kg-image-error]");
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent).toContain("notes.png");
    expect(uploaded).toHaveLength(0);
    expect(onUploadError).toHaveBeenCalledTimes(1);
    expect(onUploadError).toHaveBeenCalledWith(
      expect.objectContaining({ card: "image", reason: "not-a-picture", file: expect.any(File) }),
    );
    expect(
      (
        api.editorInstance.getEditorState().toJSON().root.children as {
          type: string;
          src?: string;
        }[]
      ).find((child) => child.type === "image"),
    ).toMatchObject({ src: "" });
  });

  it("works without an onUploadError", async () => {
    await insertAndPick(file("notes.png", false));
    await waitFor(() => expect(document.querySelector("[data-kg-image-error]")).not.toBeNull());
  });

  it("the wording is the host's to change", async () => {
    await insertAndPick(file("notes.png", false), {
      composer: { strings: { image: { decodeError: "{name} ist kein Bild" } } as never },
    });
    const error = await waitFor(() => document.querySelector("[data-kg-image-error]"));
    expect(error?.textContent).toBe("notes.png ist kein Bild");
  });

  it("a real picture still uploads, with no error", async () => {
    const onUploadError = vi.fn();
    await insertAndPick(file("photo.png", true), { composer: { onUploadError } });
    await waitFor(() => expect(uploaded).toHaveLength(1));
    expect(document.querySelector("[data-kg-image-error]")).toBeNull();
    expect(onUploadError).not.toHaveBeenCalled();
  });
});
