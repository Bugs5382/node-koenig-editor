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
import { editedFileName, outputType, type Rect, rotatedSize, rotationMatrix } from "./geometry";

export interface LoadedImage {
  image: HTMLImageElement;
  /** Frees the object URL once the editor is done with the image. */
  release: () => void;
}

/** Opens a local file as an image. Nothing leaves the browser: the source is an object URL. */
export const loadImage = (file: File): Promise<LoadedImage> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, release: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image could not be decoded"));
    };
    image.src = url;
  });

/**
 * Draws `image` turned by `turns` quarter turns onto `canvas`, showing only `crop` (in the
 * turned image's pixels), scaled to `width` pixels wide. False when there is no 2d context.
 */
export const drawEdited = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  turns: number,
  crop: Rect,
  width = crop.width,
): boolean => {
  const scale = width / crop.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  canvas.width = Math.max(1, Math.round(crop.width * scale));
  canvas.height = Math.max(1, Math.round(crop.height * scale));
  const source = { height: image.naturalHeight, width: image.naturalWidth };
  const [a, b, c, d, e, f] = rotationMatrix(turns, source, crop) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  ctx.setTransform(a * scale, b * scale, c * scale, d * scale, e * scale, f * scale);
  ctx.drawImage(image, 0, 0);
  return true;
};

/** The edited copy of `original` as a File, or null when the canvas cannot produce one. */
export const renderEditedFile = async (
  original: File,
  image: HTMLImageElement,
  turns: number,
  crop: Rect,
): Promise<File | null> => {
  const canvas = document.createElement("canvas");
  if (!drawEdited(canvas, image, turns, crop)) return null;
  const type = outputType(original.type);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === "image/jpeg" ? 0.92 : undefined),
  );
  return blob ? new File([blob], editedFileName(original.name, type), { type }) : null;
};

/** The image's size after the turns, for the crop bounds. */
export const imageBounds = (image: HTMLImageElement, turns: number) =>
  rotatedSize({ height: image.naturalHeight, width: image.naturalWidth }, turns);
