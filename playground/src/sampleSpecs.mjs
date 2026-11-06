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
// The ten sample pictures: sizes and colours. `npm run samples` draws them into
// public/samples/ (scripts/samples.mjs); the page lists them from here. No network, no photos.

/**
 * @typedef {object} SampleSpec
 * @property {number} n number drawn on the picture (1 to 10)
 * @property {number} width
 * @property {number} height
 * @property {[number, number, number]} from gradient start colour
 * @property {[number, number, number]} to gradient end colour
 * @property {"circle" | "ring" | "diamond" | "triangle" | "rect" | "stripes" | "twoCircles" | "wave"} shape
 * @property {string} alt
 */

/** @type {readonly SampleSpec[]} */
export const SAMPLE_SPECS = [
  {
    n: 1,
    width: 640,
    height: 360,
    from: [30, 90, 200],
    to: [120, 200, 240],
    shape: "circle",
    alt: "Wide picture with a circle",
  },
  {
    n: 2,
    width: 360,
    height: 540,
    from: [200, 60, 90],
    to: [250, 170, 120],
    shape: "triangle",
    alt: "Tall picture with a triangle",
  },
  {
    n: 3,
    width: 480,
    height: 480,
    from: [40, 140, 90],
    to: [190, 230, 120],
    shape: "diamond",
    alt: "Square picture with a diamond",
  },
  {
    n: 4,
    width: 960,
    height: 270,
    from: [90, 50, 160],
    to: [230, 120, 200],
    shape: "stripes",
    alt: "Panoramic picture with stripes",
  },
  {
    n: 5,
    width: 640,
    height: 360,
    from: [220, 130, 30],
    to: [250, 220, 100],
    shape: "twoCircles",
    alt: "Wide picture with two circles",
  },
  {
    n: 6,
    width: 360,
    height: 540,
    from: [20, 110, 130],
    to: [110, 210, 200],
    shape: "rect",
    alt: "Tall picture with a rectangle",
  },
  {
    n: 7,
    width: 480,
    height: 480,
    from: [150, 40, 60],
    to: [240, 110, 110],
    shape: "ring",
    alt: "Square picture with a ring",
  },
  {
    n: 8,
    width: 600,
    height: 400,
    from: [60, 70, 90],
    to: [150, 170, 200],
    shape: "triangle",
    alt: "Landscape picture with a triangle",
  },
  {
    n: 9,
    width: 400,
    height: 600,
    from: [100, 130, 30],
    to: [220, 210, 90],
    shape: "diamond",
    alt: "Portrait picture with a diamond",
  },
  {
    n: 10,
    width: 1200,
    height: 320,
    from: [20, 40, 80],
    to: [70, 140, 190],
    shape: "wave",
    alt: "Panoramic picture with a wave",
  },
];

export const sampleFileName = (/** @type {{ n: number }} */ spec) =>
  `sample-${String(spec.n).padStart(2, "0")}.png`;
