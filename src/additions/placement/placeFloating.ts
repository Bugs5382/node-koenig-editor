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
export interface AnchorRect {
  bottom: number;
  left: number;
  top: number;
}

export interface Size {
  height: number;
  width: number;
}

export interface Placement {
  left: number;
  /** The tallest the menu may be where it was put; it scrolls beyond this. */
  maxHeight: number;
  placement: "above" | "below";
  /** The menu's top edge in viewport coordinates. */
  top: number;
}

const GAP = 4;
const MARGIN = 8;
const MIN_HEIGHT = 120;

/**
 * Where a floating menu goes so it is never cut off: below the anchor when it fits (or when
 * there is more room below than above), else above it. A menu taller than the room it has is
 * capped and scrolls. All values are viewport coordinates, for `position: fixed`.
 */
export const placeFloating = (anchor: AnchorRect, size: Size, viewport: Size): Placement => {
  const below = viewport.height - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - GAP - MARGIN;
  const placement = size.height <= below || below >= above ? "below" : "above";
  const room = Math.max(placement === "below" ? below : above, MIN_HEIGHT);
  const maxHeight = Math.min(size.height, room);
  const top =
    placement === "below" ? anchor.bottom + GAP : Math.max(anchor.top - GAP - maxHeight, 0);
  const left = Math.max(Math.min(anchor.left, viewport.width - size.width - MARGIN), MARGIN);
  return { left, maxHeight, placement, top };
};
