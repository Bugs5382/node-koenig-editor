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
// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { URL } from "node:url";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { SAMPLE_SPECS, sampleFileName } from "./sampleSpecs.mjs";
import { renderSample, encodePng, renderTone } from "../scripts/samples.mjs";
import { SAMPLE_FILE_BYTES } from "./kitchenSink";

const dir = new URL("../public/samples/", import.meta.url);
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("sample pictures", () => {
  it("are ten, numbered, and nothing else is in the folder", () => {
    expect(SAMPLE_SPECS).toHaveLength(10);
    expect(readdirSync(dir).sort()).toEqual(SAMPLE_SPECS.map(sampleFileName).sort());
  });

  it("are PNGs of the size the page expects, a few KB each", () => {
    for (const spec of SAMPLE_SPECS) {
      const bytes = readFileSync(new URL(sampleFileName(spec), dir));
      expect(bytes.subarray(0, 8).equals(SIGNATURE)).toBe(true);
      expect(bytes.readUInt32BE(16)).toBe(spec.width);
      expect(bytes.readUInt32BE(20)).toBe(spec.height);
      expect(bytes.length).toBeLessThan(20_000);
    }
  });

  it("cover wide, tall, square and panoramic shapes", () => {
    const ratio = (s: { width: number; height: number }) => s.width / s.height;
    expect(SAMPLE_SPECS.some((s) => ratio(s) === 1)).toBe(true);
    expect(SAMPLE_SPECS.some((s) => ratio(s) < 0.8)).toBe(true);
    expect(SAMPLE_SPECS.some((s) => ratio(s) > 1.5 && ratio(s) < 2)).toBe(true);
    expect(SAMPLE_SPECS.some((s) => ratio(s) > 3)).toBe(true);
  });

  it("hold the pixels the script draws, so the files can be rebuilt", () => {
    // Compare decoded pixels: the compressed bytes differ between zlib versions.
    for (const spec of SAMPLE_SPECS) {
      const file = readFileSync(new URL(sampleFileName(spec), dir));
      const data: Buffer[] = [];
      for (let at = 8; at < file.length;) {
        const length = file.readUInt32BE(at);
        if (file.toString("ascii", at + 4, at + 8) === "IDAT") {
          data.push(file.subarray(at + 8, at + 8 + length));
        }
        at += length + 12;
      }
      const rows = inflateSync(Buffer.concat(data));
      const stride = spec.width * 3 + 1;
      const pixels = Buffer.alloc(spec.width * spec.height * 3);
      for (let y = 0; y < spec.height; y++) {
        expect(rows[y * stride]).toBe(0); // filter "none"
        rows.copy(pixels, y * spec.width * 3, y * stride + 1, (y + 1) * stride);
      }
      expect(pixels.equals(renderSample(spec))).toBe(true);
      expect(encodePng(spec.width, spec.height, pixels).subarray(0, 8).equals(SIGNATURE)).toBe(
        true,
      );
    }
  });

  it("differ from each other", () => {
    const sizes = new Set(SAMPLE_SPECS.map((s) => `${s.width}x${s.height}`));
    expect(sizes.size).toBeGreaterThanOrEqual(7);
    const files = SAMPLE_SPECS.map((s) =>
      readFileSync(new URL(sampleFileName(s), dir)).toString("base64"),
    );
    expect(new Set(files).size).toBe(10);
  });

  it("come with a short sound and a text file for the audio and file cards", () => {
    const media = new URL("../public/media/", import.meta.url);
    const wav = readFileSync(new URL("sample-tone.wav", media));
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.equals(renderTone())).toBe(true);
    expect(wav.length).toBeLessThan(20_000);
    expect(readFileSync(new URL("sample-notes.txt", media)).length).toBe(SAMPLE_FILE_BYTES);
  });
});
