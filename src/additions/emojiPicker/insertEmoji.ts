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
import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";

/**
 * Inserts `emoji` at the editor's text selection, replacing a range selection. False, and no
 * change, when the selection is not in text (a card is selected, or the editor never had focus).
 * A host picks the emoji with `EmojiPicker` and calls this from its own button or toolbar action.
 */
export const insertEmoji = (editor: LexicalEditor, emoji: string): boolean => {
  let inserted = false;
  editor.update(
    () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      selection.insertText(emoji);
      inserted = true;
    },
    { discrete: true },
  );
  return inserted;
};
