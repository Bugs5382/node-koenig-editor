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
// What the package under test offers. The demo runs against the local source or the published
// build, and older builds lack some options, so every optional export is looked up by name.
import * as Koenig from "node-koenig-editor";
import type { Catalog } from "./config";

interface OptionalExports {
  KOENIG_CARD_NAMES?: readonly string[];
  KOENIG_TOOLS?: readonly string[];
  useKoenigWordCount?: () => { readingTimeLabel: string; words: number; wordsLabel: string };
  useKoenigPreview?: () => {
    options: { width: string };
    setOptions: (changes: { width: string }) => void;
  };
}

const lib = Koenig as unknown as OptionalExports;

export const useWordCount = lib.useKoenigWordCount;
export const usePreview = lib.useKoenigPreview;

export const catalog: Catalog = {
  cards: lib.KOENIG_CARD_NAMES ?? [],
  tools: lib.KOENIG_TOOLS ?? [],
  wordCount: typeof useWordCount === "function",
};
