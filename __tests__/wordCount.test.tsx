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
import { cleanup, waitFor } from "@testing-library/react";
import {
  countWords,
  getReadingTime,
  getWordCount,
  useKoenigWordCount,
  type KoenigWordCount,
} from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

describe("counting words", () => {
  it.each([
    ["", 0],
    ["   \n ", 0],
    ["one", 1],
    ["one two  three\nfour", 4],
    ["well-known don't stop", 3],
    ["It costs 3.50 today", 4],
    ["Wait... what?! Yes.", 3],
  ])("counts %j as %i", (text, words) => {
    expect(countWords(text)).toBe(words);
  });

  it("counts each Han character run by words, not as one", () => {
    expect(countWords("今天天气很好")).toBeGreaterThan(1);
  });

  it("works out reading time from a words-per-minute rate", () => {
    expect(getReadingTime(0)).toBe(0);
    expect(getReadingTime(1)).toBe(1);
    expect(getReadingTime(238)).toBe(1);
    expect(getReadingTime(239)).toBe(2);
    expect(getReadingTime(600, 300)).toBe(2);
    expect(getReadingTime(600, 0)).toBe(3);
  });
});

const withCards = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Three plain words",
            type: "text",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
      {
        type: "button",
        version: 1,
        buttonText: "Press here now please",
        buttonUrl: "https://example.com/a/b/c",
        alignment: "center",
      },
      {
        type: "markdown",
        version: 1,
        markdown: "# Heading with several words\n\n[link text](https://example.com)",
      },
      {
        type: "callout",
        version: 1,
        calloutText: "Callout words here",
        calloutEmoji: "",
        backgroundColor: "blue",
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

describe("the editor's word count", () => {
  it("counts the text of the document and ignores what cards hold inside", async () => {
    const { api } = await mount({ composer: { initialEditorState: withCards } });
    expect(getWordCount(api.editorInstance.getEditorState())).toBe(3);
  });

  it("counts several paragraphs and headings", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("a b c", "d e") } });
    expect(getWordCount(api.editorInstance.getEditorState())).toBe(5);
  });

  it("is a hook the host places, kept up to date as the text changes", async () => {
    let seen: KoenigWordCount | undefined;
    const Probe = () => {
      seen = useKoenigWordCount({ wordsPerMinute: 2 });
      return <output data-testid="wc">{seen.readingTimeLabel}</output>;
    };
    const { api } = await mount({
      composer: { initialEditorState: documentOf("one two three four five") },
      extra: <Probe />,
    });
    await waitFor(() => expect(seen?.words).toBe(5));
    expect(seen?.minutes).toBe(3);
    expect(seen?.wordsLabel).toBe("5 words");
    expect(seen?.readingTimeLabel).toBe("3 min read");
    expect(api).toBeDefined();
  });

  it("words its labels through strings", async () => {
    let seen: KoenigWordCount | undefined;
    const Probe = () => {
      seen = useKoenigWordCount();
      return null;
    };
    await mount({
      composer: {
        initialEditorState: documentOf("one"),
        strings: { wordCount: { readMinutes: "{minutes} min", word: "{count} mot" } },
      },
      extra: <Probe />,
    });
    await waitFor(() => expect(seen?.words).toBe(1));
    expect(seen?.wordsLabel).toBe("1 mot");
    expect(seen?.readingTimeLabel).toBe("1 min");
  });

  it("says less than a minute for an empty document", async () => {
    let seen: KoenigWordCount | undefined;
    const Probe = () => {
      seen = useKoenigWordCount();
      return null;
    };
    await mount({ extra: <Probe /> });
    await waitFor(() => expect(seen).toBeDefined());
    expect(seen?.words).toBe(0);
    expect(seen?.readingTimeLabel).toBe("Less than a minute");
  });
});
