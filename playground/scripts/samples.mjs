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
// Draws the sample pictures with no dependencies and no network: a banded gradient, one shape and
// the picture's number in seven-segment digits, written as small PNGs.
//   npm run samples
import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { crc32, deflateSync } from "node:zlib";
import { fileURLToPath, URL } from "node:url";
import { SAMPLE_SPECS, sampleFileName } from "../src/sampleSpecs.mjs";

const BANDS = 14; // few distinct colours keep the files at a few KB

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// Which of the seven segments (top, top-left, top-right, middle, bottom-left, bottom-right, bottom) each digit lights.
const SEGMENTS = {
  0: [1, 1, 1, 0, 1, 1, 1],
  1: [0, 0, 1, 0, 0, 1, 0],
  2: [1, 0, 1, 1, 1, 0, 1],
  3: [1, 0, 1, 1, 0, 1, 1],
  4: [0, 1, 1, 1, 0, 1, 0],
  5: [1, 1, 0, 1, 0, 1, 1],
  6: [1, 1, 0, 1, 1, 1, 1],
  7: [1, 0, 1, 0, 0, 1, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
};

// Rectangles (in a 3 x 5 grid, 0..3 across and 0..5 down) for each segment.
const SEGMENT_BOXES = [
  [0, 0, 3, 1],
  [0, 0, 1, 3],
  [2, 0, 3, 3],
  [0, 2, 3, 3],
  [0, 3, 1, 5],
  [2, 3, 3, 5],
  [0, 4, 3, 5],
];

function numberPixels(n, unit) {
  const digits = String(n).split("");
  const boxes = [];
  digits.forEach((digit, index) => {
    const offset = index * 4 * unit;
    SEGMENTS[digit].forEach((on, segment) => {
      if (!on) return;
      const [x0, y0, x1, y1] = SEGMENT_BOXES[segment];
      boxes.push([offset + x0 * unit, y0 * unit, offset + x1 * unit, y1 * unit]);
    });
  });
  return boxes;
}

function inShape(shape, x, y, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.3;
  const dx = x - cx;
  const dy = y - cy;
  switch (shape) {
    case "circle":
      return Math.hypot(dx, dy) < r;
    case "ring":
      return Math.hypot(dx, dy) < r && Math.hypot(dx, dy) > r * 0.6;
    case "diamond":
      return Math.abs(dx) + Math.abs(dy) < r;
    case "triangle":
      return y > cy - r && y < cy + r && Math.abs(dx) < (y - (cy - r)) / 2;
    case "rect":
      return Math.abs(dx) < r * 0.8 && Math.abs(dy) < r * 1.1;
    case "stripes":
      return Math.floor((x + y) / (height / 4)) % 2 === 0 && Math.abs(dy) < height * 0.3;
    case "twoCircles":
      return (
        Math.hypot(dx - width * 0.2, dy) < r * 0.8 || Math.hypot(dx + width * 0.2, dy) < r * 0.8
      );
    case "wave":
      return Math.abs(y - cy - Math.sin((x / width) * Math.PI * 4) * height * 0.2) < height * 0.07;
    default:
      return false;
  }
}

/** RGB pixels (3 bytes each, row by row) of one sample. Deterministic. */
export function renderSample(spec) {
  const { width, height } = spec;
  const pixels = Buffer.alloc(width * height * 3);
  const unit = Math.max(4, Math.round(height * 0.04));
  const boxes = numberPixels(spec.n, unit);
  const margin = unit * 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = Math.min(BANDS - 1, Math.floor(((x / width + y / height) / 2) * BANDS));
      let color = mix(spec.from, spec.to, band / (BANDS - 1));
      if (inShape(spec.shape, x, y, width, height)) color = mix(color, [255, 255, 255], 0.4);
      const px = x - margin;
      const py = y - margin;
      if (boxes.some(([x0, y0, x1, y1]) => px >= x0 && px < x1 && py >= y0 && py < y1)) {
        color = mix(color, [0, 0, 0], 0.7);
      }
      pixels.set(color, (y * width + x) * 3);
    }
  }
  return pixels;
}

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};

/** A PNG (8-bit RGB) from RGB pixels. */
export function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    pixels.copy(rows, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = new URL("../public/samples/", import.meta.url);
  mkdirSync(out, { recursive: true });
  for (const spec of SAMPLE_SPECS) {
    const png = encodePng(spec.width, spec.height, renderSample(spec));
    writeFileSync(new URL(sampleFileName(spec), out), png);
    console.log(`${sampleFileName(spec)} ${spec.width}x${spec.height} ${png.length} bytes`);
  }
}
