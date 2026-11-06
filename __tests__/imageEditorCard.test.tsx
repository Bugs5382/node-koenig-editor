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
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

const uploaded: File[] = [];
const recordingUploader = {
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
  class FakeImage {
    naturalHeight = 600;
    naturalWidth = 800;
    onload: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    setTransform: vi.fn(),
  })) as never;
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type?: string) {
    cb(new Blob(["edited"], { type: type ?? "image/png" }));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pickFile = async (type = "image/png", name = "photo.png") => {
  const input = document.querySelector<HTMLInputElement>("input[name='image-input']");
  expect(input).not.toBeNull();
  const file = new File(["x"], name, { type });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await act(async () => {
    fireEvent.change(input as HTMLInputElement);
  });
  return file;
};

const insertImageCard = async (options: Parameters<typeof mount>[0]) => {
  const { api } = await mount(options);
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector("[data-kg-card-menu-item='Image']") as Element);
  });
};

describe("the image card with the image editor", () => {
  it("opens the editor for a picked file and uploads the edited copy", async () => {
    await insertImageCard({ composer: { fileUploader: recordingUploader } });
    await pickFile();
    expect(uploaded).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole("group", { name: "Crop area" })).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Use this image" }));
    });
    await waitFor(() => expect(uploaded).toHaveLength(1));
    expect(uploaded[0]?.name).toBe("photo-edited.png");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uploads nothing when the editor is cancelled", async () => {
    await insertImageCard({ composer: { fileUploader: recordingUploader } });
    await pickFile();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(uploaded).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends a gif straight to the uploader, since a canvas would flatten it", async () => {
    await insertImageCard({ composer: { fileUploader: recordingUploader } });
    await pickFile("image/gif", "loop.gif");
    await waitFor(() => expect(uploaded).toHaveLength(1));
    expect(uploaded[0]?.name).toBe("loop.gif");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("uploads the original when the host turned the editor off", async () => {
    await insertImageCard({
      composer: { fileUploader: recordingUploader, tools: ["emojiPicker"] },
    });
    await pickFile();
    await waitFor(() => expect(uploaded).toHaveLength(1));
    expect(uploaded[0]?.name).toBe("photo.png");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
