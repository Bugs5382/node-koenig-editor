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
import {
  $createRangeSelection,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type LexicalEditor,
  type PointType,
} from "lexical";

interface SavedPoint {
  key: string;
  offset: number;
  type: PointType["type"];
}

/** A selection remembered by node key and offset, with the text it covered. */
export interface SavedSelection {
  anchor: SavedPoint;
  focus: SavedPoint;
  text: string;
}

const point = (p: PointType): SavedPoint => ({ key: p.key, offset: p.offset, type: p.type });

/** Remembers the current range selection, or null when there is none or it is collapsed. */
export const $saveSelection = (): SavedSelection | null => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) return null;
  return {
    anchor: point(selection.anchor),
    focus: point(selection.focus),
    text: selection.getTextContent(),
  };
};

/**
 * Puts `text` in place of the remembered selection, wherever the cursor is now. False, and no
 * change, when the nodes have gone or the covered text is no longer what was selected.
 */
export const replaceSavedSelection = (
  editor: LexicalEditor,
  saved: SavedSelection,
  text: string,
): boolean => {
  let replaced = false;
  editor.update(
    () => {
      const range = $createRangeSelection();
      range.anchor.set(saved.anchor.key, saved.anchor.offset, saved.anchor.type);
      range.focus.set(saved.focus.key, saved.focus.offset, saved.focus.type);
      if (!range.anchor.getNode().isAttached() || !range.focus.getNode().isAttached()) return;
      if (range.getTextContent() !== saved.text) return;
      $setSelection(range);
      range.insertText(text);
      replaced = true;
    },
    { discrete: true },
  );
  return replaced;
};
