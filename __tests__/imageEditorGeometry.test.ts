import {
  aspectOf,
  cropForAspect,
  editedFileName,
  fullCrop,
  moveRect,
  normalizeTurns,
  resizeRect,
  rotatedSize,
  rotationMatrix,
} from "../src/additions/imageEditor/geometry";
import { describe, expect, it } from "vitest";

const size = { height: 600, width: 800 };

describe("image editor geometry", () => {
  it("normalizes quarter turns into 0 to 3", () => {
    expect([normalizeTurns(0), normalizeTurns(4), normalizeTurns(-1), normalizeTurns(5)]).toEqual([
      0, 0, 3, 1,
    ]);
  });

  it("swaps width and height on an odd number of turns", () => {
    expect(rotatedSize(size, 1)).toEqual({ height: 800, width: 600 });
    expect(rotatedSize(size, 2)).toEqual(size);
    expect(rotatedSize(size, -1)).toEqual({ height: 800, width: 600 });
  });

  it("starts with the whole image selected", () => {
    expect(fullCrop(size)).toEqual({ height: 600, width: 800, x: 0, y: 0 });
  });

  it("finds the largest centred crop for an aspect ratio", () => {
    expect(cropForAspect(size, 1)).toEqual({ height: 600, width: 600, x: 100, y: 0 });
    expect(cropForAspect(size, 16 / 9)).toEqual({ height: 450, width: 800, x: 0, y: 75 });
    expect(cropForAspect(size, null)).toEqual(fullCrop(size));
  });

  it("reads a preset as a ratio", () => {
    expect(aspectOf("free", size)).toBeNull();
    expect(aspectOf("original", size)).toBeCloseTo(4 / 3);
    expect(aspectOf("1:1", size)).toBe(1);
    expect(aspectOf("4:3", size)).toBeCloseTo(4 / 3);
    expect(aspectOf("16:9", size)).toBeCloseTo(16 / 9);
  });

  it("moves a crop but keeps it inside the image", () => {
    const crop = { height: 200, width: 200, x: 10, y: 10 };
    expect(moveRect(crop, 50, 20, size)).toEqual({ ...crop, x: 60, y: 30 });
    expect(moveRect(crop, -50, -50, size)).toEqual({ ...crop, x: 0, y: 0 });
    expect(moveRect(crop, 5000, 5000, size)).toEqual({ ...crop, x: 600, y: 400 });
  });

  it("resizes freely and clamps to the image", () => {
    const crop = { height: 200, width: 200, x: 700, y: 500 };
    expect(resizeRect(crop, 50, -50, size, null)).toEqual({ ...crop, height: 100, width: 100 });
    expect(resizeRect(crop, -500, -500, size, null)).toEqual({ ...crop, height: 16, width: 16 });
  });

  it("keeps the ratio when one is set", () => {
    const crop = { height: 100, width: 100, x: 0, y: 0 };
    expect(resizeRect(crop, 100, 0, size, 1)).toEqual({ height: 200, width: 200, x: 0, y: 0 });
    const wide = resizeRect(crop, 5000, 0, size, 1);
    expect(wide.width).toBe(wide.height);
    expect(wide.height).toBeLessThanOrEqual(600);
  });

  it("maps source corners to where a quarter turn puts them", () => {
    const apply = ([a, b, c, d, e, f]: number[], x: number, y: number) => [
      a! * x + c! * y + e!,
      b! * x + d! * y + f!,
    ];
    // 800 wide, 600 high: top-left goes to top-right of the 600 by 800 result
    expect(apply(rotationMatrix(1, size), 0, 0)).toEqual([600, 0]);
    expect(apply(rotationMatrix(1, size), 800, 600)).toEqual([0, 800]);
    expect(apply(rotationMatrix(2, size), 0, 0)).toEqual([800, 600]);
    expect(apply(rotationMatrix(3, size), 0, 0)).toEqual([0, 800]);
    expect(apply(rotationMatrix(3, size), 800, 600)).toEqual([600, 0]);
    expect(apply(rotationMatrix(0, size), 12, 34)).toEqual([12, 34]);
    expect(apply(rotationMatrix(1, size, { height: 10, width: 10, x: 100, y: 50 }), 0, 0)).toEqual([
      500, -50,
    ]);
  });

  it("names the edited file and keeps jpeg and png", () => {
    expect(editedFileName("holiday photo.jpeg", "image/jpeg")).toBe("holiday photo-edited.jpg");
    expect(editedFileName("a.png", "image/png")).toBe("a-edited.png");
    expect(editedFileName("a.webp", "image/png")).toBe("a-edited.png");
    expect(editedFileName("", "image/png")).toBe("image-edited.png");
  });
});
