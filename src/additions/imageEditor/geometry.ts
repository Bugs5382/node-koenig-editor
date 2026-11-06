export interface Size {
  height: number;
  width: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export type AspectPreset = "free" | "original" | "1:1" | "4:3" | "16:9";

export const ASPECT_PRESETS: readonly AspectPreset[] = ["free", "original", "1:1", "4:3", "16:9"];

/** The smallest crop edge, in image pixels. */
export const MIN_CROP = 16;

export const normalizeTurns = (turns: number): number => ((Math.trunc(turns) % 4) + 4) % 4;

/** The size of the image after `turns` quarter turns. */
export const rotatedSize = (size: Size, turns: number): Size =>
  normalizeTurns(turns) % 2 === 1 ? { height: size.width, width: size.height } : { ...size };

export const fullCrop = (size: Size): Rect => ({ ...size, x: 0, y: 0 });

/** The width over height a preset stands for; null when the crop is free. */
export const aspectOf = (preset: AspectPreset, size: Size): number | null => {
  switch (preset) {
    case "original":
      return size.width / size.height;
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "16:9":
      return 16 / 9;
    default:
      return null;
  }
};

/** The largest crop with this aspect ratio, centred in the image. */
export const cropForAspect = (size: Size, aspect: number | null): Rect => {
  if (!aspect) return fullCrop(size);
  let width = size.width;
  let height = Math.round(width / aspect);
  if (height > size.height) {
    height = size.height;
    width = Math.round(height * aspect);
  }
  return {
    height,
    width,
    x: Math.round((size.width - width) / 2),
    y: Math.round((size.height - height) / 2),
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Moves the crop by (dx, dy), stopping at the image edge. */
export const moveRect = (rect: Rect, dx: number, dy: number, bounds: Size): Rect => ({
  ...rect,
  x: clamp(rect.x + dx, 0, bounds.width - rect.width),
  y: clamp(rect.y + dy, 0, bounds.height - rect.height),
});

/**
 * Grows or shrinks the crop from its top-left corner. With a ratio the height follows the
 * width, and both stay inside the image and above MIN_CROP.
 */
export const resizeRect = (
  rect: Rect,
  dw: number,
  dh: number,
  bounds: Size,
  aspect: number | null,
): Rect => {
  const maxWidth = bounds.width - rect.x;
  const maxHeight = bounds.height - rect.y;
  if (aspect) {
    const maxW = Math.min(maxWidth, maxHeight * aspect);
    const minW = Math.max(MIN_CROP, MIN_CROP * aspect);
    const width = Math.round(clamp(rect.width + (dw || dh * aspect), Math.min(minW, maxW), maxW));
    return { ...rect, height: Math.round(width / aspect), width };
  }
  return {
    ...rect,
    height: clamp(rect.height + dh, Math.min(MIN_CROP, maxHeight), maxHeight),
    width: clamp(rect.width + dw, Math.min(MIN_CROP, maxWidth), maxWidth),
  };
};

/**
 * The canvas transform (for setTransform) that draws a source image of `source` size turned by
 * `turns` quarter turns, shifted so the `crop` corner lands at the canvas origin.
 */
export const rotationMatrix = (
  turns: number,
  source: Size,
  crop: Rect = { ...source, x: 0, y: 0 },
): number[] => {
  const t = normalizeTurns(turns);
  const matrix =
    t === 1
      ? [0, 1, -1, 0, source.height, 0]
      : t === 2
        ? [-1, 0, 0, -1, source.width, source.height]
        : t === 3
          ? [0, -1, 1, 0, 0, source.width]
          : [1, 0, 0, 1, 0, 0];
  matrix[4] = (matrix[4] as number) - crop.x;
  matrix[5] = (matrix[5] as number) - crop.y;
  return matrix;
};

/** `photo.jpeg` becomes `photo-edited.jpg`; anything but jpeg is written as png. */
export const editedFileName = (name: string, type: string): string => {
  const base = name.replace(/\.[^./\\]*$/, "") || "image";
  return `${base}-edited.${type === "image/jpeg" ? "jpg" : "png"}`;
};

/** The type an edited copy of this file is saved as. */
export const outputType = (type: string): "image/jpeg" | "image/png" =>
  type === "image/jpeg" ? "image/jpeg" : "image/png";
