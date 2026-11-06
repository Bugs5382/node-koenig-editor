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
export interface Box {
  left: number;
  width: number;
}

/** The space kept between the "+" button and the empty line's text edge. */
export const PLUS_GAP = 8;

/**
 * Where the "+" button goes, as an offset from `origin` (the left edge of the element the button
 * is positioned against; the editor's box when omitted). It sits just before the empty line
 * when the editor's padding leaves room, otherwise at the box's left edge, and never so far
 * right that it leaves the box: the button always stays inside the editor, however narrow the
 * host's container is.
 */
export const placePlus = (
  line: Box,
  box: Box,
  size: number,
  gap = PLUS_GAP,
  origin = box.left,
): number => {
  const wanted = line.left - size - gap;
  const least = box.left;
  const most = Math.max(box.left + box.width - size, least);
  return Math.min(Math.max(wanted, least), most) - origin;
};
