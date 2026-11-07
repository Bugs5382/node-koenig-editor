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
import { $findMatchingParent } from "@lexical/utils";
import { $getSelection, $isElementNode, $isRangeSelection, type ElementNode } from "lexical";

// Text alignment of the block the selection is in. The alignment is the block's own format, which
// Lexical saves in the document, draws as text-align and exports as text-align in HTML.

export type Align = "center" | "justify" | "left" | "right";

/** Each toolbar item and the alignment it sets. */
export const ALIGN_OF_ITEM = {
  alignCenter: "center",
  alignJustify: "justify",
  alignLeft: "left",
  alignRight: "right",
} as const satisfies Record<string, Align>;

/** The shortcut letter of each alignment, used with Ctrl or Cmd and Shift. */
export const ALIGN_OF_KEY: Record<string, Align> = {
  E: "center",
  J: "justify",
  L: "left",
  R: "right",
};

export interface BlockAlignment {
  direction: "ltr" | "rtl" | null;
  format: string;
}

/** The block (paragraph, heading, quote or list item) the selection starts in. */
export const $blockOfSelection = (): ElementNode | null => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const node = selection.anchor.getNode();
  return $findMatchingParent(
    node,
    (parent) => $isElementNode(parent) && !parent.isInline(),
  ) as ElementNode | null;
};

// Lexical leaves a block's direction unset and lets the browser decide (`dir="auto"`), which picks
// it from the first strong character. The same rule is used here to know which way a block runs.
const RTL_CHARACTER =
  /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;
const LTR_CHARACTER = /\p{L}/u;

/** The direction of a piece of text: that of its first strong character, left to right otherwise. */
export const directionOfText = (text: string): "ltr" | "rtl" => {
  for (const character of text) {
    if (RTL_CHARACTER.test(character)) return "rtl";
    if (LTR_CHARACTER.test(character)) return "ltr";
  }
  return "ltr";
};

export const $alignmentOfSelection = (): BlockAlignment | null => {
  const block = $blockOfSelection();
  if (!block || block.getType() === "root") return null;
  return {
    direction: block.getDirection() ?? directionOfText(block.getTextContent()),
    format: block.getFormatType(),
  };
};

/**
 * Whether an alignment button is the active one for a block. A block with no stored alignment (or
 * `start`) is aligned to the start of its line: left in left-to-right text, right in right-to-left
 * text; `end` is the opposite. So the marked button is right for a Hebrew or Arabic paragraph.
 */
export const isAlignActive = (align: Align, { direction, format }: BlockAlignment): boolean => {
  const rtl = direction === "rtl";
  const effective: string =
    format === "" || format === "start"
      ? rtl
        ? "right"
        : "left"
      : format === "end"
        ? rtl
          ? "left"
          : "right"
        : format;
  return effective === align;
};
