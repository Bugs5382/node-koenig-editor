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
import { describe, expect, it } from "vitest";
import { SAMPLE_SPECS, sampleFileName } from "./sampleSpecs.mjs";
import { renderSample, encodePng } from "../scripts/samples.mjs";

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

  it("are exactly what the script draws, so the files can be rebuilt", () => {
    for (const spec of SAMPLE_SPECS) {
      const committed = readFileSync(new URL(sampleFileName(spec), dir));
      expect(encodePng(spec.width, spec.height, renderSample(spec)).equals(committed)).toBe(true);
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
});
