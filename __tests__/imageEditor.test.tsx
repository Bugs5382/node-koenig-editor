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
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageEditorDialog, KoenigComposer } from "node-koenig-editor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const drawn: { transform?: number[]; crop?: unknown; size?: [number, number] }[] = [];

beforeEach(() => {
  drawn.length = 0;
  // jsdom never loads an image or draws a canvas: answer the way a browser would.
  class FakeImage {
    naturalHeight = 600;
    naturalWidth = 800;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
    return {
      drawImage: vi.fn(() => drawn.push({ size: [this.width, this.height] })),
      setTransform: vi.fn((...m: number[]) => drawn.push({ transform: m })),
    };
  }) as never;
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback, type?: string) {
    cb(new Blob(["edited"], { type: type ?? "image/png" }));
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = () => new File(["x"], "holiday.jpeg", { type: "image/jpeg" });

const open = async (onApply = vi.fn(), onCancel = vi.fn()) => {
  render(
    <KoenigComposer>
      <ImageEditorDialog file={file()} onApply={onApply} onCancel={onCancel} />
    </KoenigComposer>,
  );
  await waitFor(() => expect(screen.getByRole("group", { name: "Crop area" })).toBeTruthy());
  return { onApply, onCancel };
};

describe("the image editor dialog", () => {
  it("is a labelled modal dialog with focus inside it", async () => {
    await open();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Edit image")).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("cancels on Escape", async () => {
    const { onCancel, onApply } = await open();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the dialog", async () => {
    await open();
    const dialog = screen.getByRole("dialog");
    const focusable = [...dialog.querySelectorAll<HTMLElement>("button, select, [tabindex='0']")];
    focusable.at(-1)?.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusable.at(-1));
  });

  it("moves and resizes the crop from the keyboard", async () => {
    await open();
    const crop = screen.getByRole("group", { name: "Crop area" });
    const before = crop.getAttribute("data-crop");
    expect(before).toBe("0,0,800,600");
    fireEvent.keyDown(crop, { key: "ArrowLeft", shiftKey: true });
    const shrunk = crop.getAttribute("data-crop") as string;
    expect(Number(shrunk.split(",")[2])).toBeLessThan(800);
    fireEvent.keyDown(crop, { key: "ArrowRight" });
    expect(Number((crop.getAttribute("data-crop") as string).split(",")[0])).toBeGreaterThan(0);
  });

  it("applies an aspect preset", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Crop shape"), { target: { value: "1:1" } });
    expect(screen.getByRole("group", { name: "Crop area" }).getAttribute("data-crop")).toBe(
      "100,0,600,600",
    );
  });

  it("rotates in quarter turns and swaps the crop to the rotated size", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    expect(screen.getByRole("group", { name: "Crop area" }).getAttribute("data-crop")).toBe(
      "0,0,600,800",
    );
    fireEvent.click(screen.getByRole("button", { name: "Rotate left" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate left" }));
    expect(screen.getByRole("group", { name: "Crop area" }).getAttribute("data-crop")).toBe(
      "0,0,600,800",
    );
  });

  it("hands back an edited jpeg file, makes no network call, and draws the rotation", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { onApply } = await open();
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Use this image" }));
    });
    await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
    const edited = onApply.mock.calls[0]![0] as File;
    expect(edited.name).toBe("holiday-edited.jpg");
    expect(edited.type).toBe("image/jpeg");
    expect(drawn.some((step) => step.transform?.join() === "0,1,-1,0,600,0")).toBe(true);
    expect(drawn.some((step) => step.size?.join() === "600,800")).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("says so when the canvas is unavailable", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    const { onApply } = await open();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Use this image" }));
    });
    expect(screen.getByRole("alert").textContent).toContain("could not be saved");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("says so when the image cannot be opened", async () => {
    class BrokenImage {
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", BrokenImage);
    render(
      <KoenigComposer>
        <ImageEditorDialog file={file()} onApply={vi.fn()} onCancel={vi.fn()} />
      </KoenigComposer>,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("could not be opened"),
    );
  });

  it("uses the host's wording", async () => {
    render(
      <KoenigComposer strings={{ imageEditor: { title: "Bild bearbeiten" } }}>
        <ImageEditorDialog file={file()} onApply={vi.fn()} onCancel={vi.fn()} />
      </KoenigComposer>,
    );
    expect(screen.getByText("Bild bearbeiten")).toBeTruthy();
  });
});
