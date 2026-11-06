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
import { $getRoot, $isDecoratorNode, type EditorState } from "lexical";

/** The reading speed used when the host names none, in words per minute. */
export const DEFAULT_WORDS_PER_MINUTE = 238;

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

let segmenter: Intl.Segmenter | null | undefined;
const getSegmenter = () => {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "word" })
        : null;
  }
  return segmenter;
};

/**
 * The number of words in a piece of text. Words are runs between spaces (so "well-known" and
 * "don't" are one each); a run that holds Han, Kana or Thai text, which has no spaces, is
 * counted with the browser's word segmenter instead.
 */
export const countWords = (text: string): number => {
  let words = 0;
  for (const token of text.split(/\s+/)) {
    if (!HAS_LETTER_OR_DIGIT.test(token)) continue;
    const split = CJK.test(token) ? getSegmenter() : null;
    if (!split) {
      words += 1;
      continue;
    }
    for (const part of split.segment(token)) {
      if (part.isWordLike) words += 1;
    }
  }
  return words;
};

/** Whole minutes to read `words` at `wordsPerMinute`, rounded up; 0 for no words. */
export const getReadingTime = (
  words: number,
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
): number => {
  if (words <= 0) return 0;
  const rate = wordsPerMinute > 0 ? wordsPerMinute : DEFAULT_WORDS_PER_MINUTE;
  return Math.ceil(words / rate);
};

/**
 * The words in the document's own text: paragraphs, headings, lists, quotes, code and tables.
 * Cards are not counted at all, so a gallery's alt text, an image caption, a button's label and
 * link, a callout, a toggle or the source of a Markdown card never adds to it.
 */
export const getWordCount = (editorState: EditorState): number =>
  editorState.read(() =>
    $getRoot()
      .getChildren()
      .filter((node) => !$isDecoratorNode(node))
      .reduce((total, node) => total + countWords(node.getTextContent()), 0),
  );
