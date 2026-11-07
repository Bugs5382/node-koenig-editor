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
import { $getSelectionStyleValueForProperty, $patchStyleText } from "@lexical/selection";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type BaseSelection,
  type RangeSelection,
} from "lexical";

// Text styling: relative size, text colour, highlight and font family, saved as the text's own
// style (so the saved HTML carries it as inline CSS), and clear formatting, which takes every
// inline format and style off the selected text.

/** Sizes are relative to the text around them (em), so they follow the host's type scale. */
export const FONT_SIZES = [
  { id: "smaller", value: "0.8em" },
  { id: "small", value: "0.9em" },
  { id: "normal", value: null },
  { id: "large", value: "1.25em" },
  { id: "larger", value: "1.5em" },
] as const;

export type FontSizeId = (typeof FONT_SIZES)[number]["id"];

/** Text colours that read on both a light and a dark page (at least 3 to 1 on each). */
export const TEXT_COLORS = [
  { id: "red", value: "#D64545" },
  { id: "orange", value: "#C26A00" },
  { id: "green", value: "#2E8B57" },
  { id: "blue", value: "#3B82F6" },
  { id: "purple", value: "#9B59B6" },
  { id: "grey", value: "#7C8B9A" },
] as const;

/** Highlight colours: light, with dark ink set alongside so the text reads on any page. */
export const HIGHLIGHTS = [
  { id: "yellow", value: "#FFF3B0" },
  { id: "green", value: "#D4EFDF" },
  { id: "blue", value: "#D6EAF8" },
  { id: "pink", value: "#FADBD8" },
  { id: "purple", value: "#E8DAEF" },
  { id: "orange", value: "#FDEBD0" },
] as const;

export const HIGHLIGHT_INK = "#15171A";

export type TextStyleProperty = "background-color" | "color" | "font-family" | "font-size";

/** Sets (or, with null, removes) one style property on the selected text. Inside an editor update. */
export const $setTextStyle = (
  selection: BaseSelection | null,
  property: TextStyleProperty,
  value: null | string,
): void => {
  if (!$isRangeSelection(selection)) return;
  $patchStyleText(selection, { [property]: value });
};

/** Highlights the selected text, or with null takes the highlight off. */
export const $setHighlight = (selection: BaseSelection | null, value: null | string): void => {
  if (!$isRangeSelection(selection)) return;
  $patchStyleText(selection, {
    "background-color": value,
    color: value ? HIGHLIGHT_INK : null,
  });
};

/** The value of a style property across the selection, or null when none is set or it differs. */
export const $getTextStyle = (
  selection: BaseSelection | null,
  property: TextStyleProperty,
): null | string => {
  if (!$isRangeSelection(selection)) return null;
  const value = $getSelectionStyleValueForProperty(selection, property, "");
  return value ? value : null;
};

/** Takes every inline format (bold, italic, underline, strikethrough, sub and superscript, code)
 *  and every style off the selected text. Inside an editor update. */
export const $clearFormatting = (selection: RangeSelection | null = null): void => {
  const range = selection ?? $getSelection();
  if (!$isRangeSelection(range)) return;
  for (const node of range.extract()) {
    if ($isTextNode(node)) {
      node.setFormat(0);
      node.setStyle("");
    }
  }
};
