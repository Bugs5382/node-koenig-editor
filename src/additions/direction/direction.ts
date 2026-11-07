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
import type { BaseSelection } from "lexical";

import { $blocksOf } from "../spacing/spacing";

// The direction of a block. A block with none follows its own text (the editor draws it with
// dir="auto"), so a Hebrew or Arabic paragraph reads right to left without any setting; this sets
// it explicitly to left to right or right to left for the blocks the selection touches. A list or
// table is one block, so it turns around whole, bullets, numbers and columns included.

export type Direction = "ltr" | "rtl";

/** Sets the direction of the selected blocks; null goes back to automatic. Inside an editor update. */
export const $setDirection = (
  selection: BaseSelection | null,
  direction: Direction | null,
): void => {
  for (const block of $blocksOf(selection)) block.setDirection(direction);
};

/** The direction every selected block has set, or null when none is set or they differ. */
export const $getSelectionDirection = (selection: BaseSelection | null): Direction | null => {
  const blocks = $blocksOf(selection);
  const first = blocks[0]?.getDirection() ?? null;
  return first && blocks.every((block) => block.getDirection() === first) ? first : null;
};
