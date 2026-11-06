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
import type { KoenigWordCount, KoenigWordCountOptions } from "node-koenig-editor";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useState } from "react";

import { useKoenigStrings } from "../options";
import { DEFAULT_WORDS_PER_MINUTE, getReadingTime, getWordCount } from "./wordCount";

/**
 * The word count and reading time of the editor it is placed under, kept up to date as the text
 * changes. Place it in a component rendered inside `KoenigComposer`, wherever the count shows.
 */
export const useKoenigWordCount = ({
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
}: KoenigWordCountOptions = {}): KoenigWordCount => {
  const [editor] = useLexicalComposerContext();
  const strings = useKoenigStrings().wordCount;
  const [words, setWords] = useState(() => getWordCount(editor.getEditorState()));

  useEffect(() => {
    setWords(getWordCount(editor.getEditorState()));
    return editor.registerUpdateListener(({ editorState }) => {
      setWords(getWordCount(editorState));
    });
  }, [editor]);

  const minutes = getReadingTime(words, wordsPerMinute);
  return {
    minutes,
    readingTimeLabel:
      minutes > 0
        ? strings.readMinutes.replace("{minutes}", String(minutes))
        : strings.readLessThanMinute,
    words,
    wordsLabel: (words === 1 ? strings.word : strings.words).replace("{count}", String(words)),
  };
};
