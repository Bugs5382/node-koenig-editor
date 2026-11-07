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
import { $generateHtmlFromNodes } from "@lexical/html";
import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

// The reader's view is the live editor made read-only, not the exported HTML: it has things the
// HTML cannot (the gallery's full-screen viewer, a toggle that opens), and no stylesheet for the
// HTML's own classes to depend on. What both must agree on is the content. This checks that every
// word the saved HTML carries for a card is in what the preview shows for it.

const para = (text = "") => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});
const PIXEL = "https://example.com/p.png";
const cards: Record<string, Record<string, unknown>> = {
  callout: {
    backgroundColor: "blue",
    calloutEmoji: "\u{1F4A1}",
    calloutText: "A callout about parity",
    type: "callout",
    version: 1,
  },
  image: {
    alt: "alt",
    caption: "An image caption",
    cardWidth: "regular",
    height: 300,
    src: PIXEL,
    type: "image",
    version: 1,
    width: 400,
  },
  gallery: {
    caption: "A gallery caption",
    images: [
      {
        alt: "a",
        caption: "First caption",
        fileName: "a.png",
        height: 300,
        row: 0,
        src: PIXEL + "?a",
        title: "First title",
        width: 400,
      },
      {
        alt: "b",
        caption: "",
        fileName: "b.png",
        height: 300,
        row: 0,
        src: PIXEL + "?b",
        title: "",
        width: 400,
      },
    ],
    type: "gallery",
    version: 1,
  },
  header: {
    alignment: "center",
    backgroundColor: "#123456",
    buttonColor: "#ffffff",
    buttonEnabled: true,
    buttonText: "Read the rest",
    buttonTextColor: "#000000",
    buttonUrl: "https://example.com",
    header: "Header title words",
    layout: "full",
    size: "small",
    style: "dark",
    subheader: "Header subtitle words",
    textColor: "#ffffff",
    type: "header",
    version: 2,
  },
  button: {
    alignment: "center",
    buttonText: "Press the button",
    buttonUrl: "https://example.com",
    type: "button",
    version: 1,
  },
  file: {
    fileCaption: "File description words",
    fileName: "report.pdf",
    fileSize: 2048,
    fileTitle: "File title words",
    src: "https://example.com/report.pdf",
    type: "file",
    version: 1,
  },
  audio: {
    duration: 3,
    fileName: "a.mp3",
    mimeType: "audio/mpeg",
    src: "https://example.com/a.mp3",
    title: "Audio title words",
    trackLabel: "",
    trackLang: "en",
    trackSrc: "",
    transcript: "Audio transcript words",
    type: "audio",
    version: 1,
  },
  video: {
    caption: "Video caption words",
    cardWidth: "regular",
    duration: 3,
    fileName: "v.mp4",
    height: 360,
    mimeType: "video/mp4",
    src: "https://example.com/v.mp4",
    trackLabel: "",
    trackLang: "en",
    trackSrc: "",
    transcript: "Video transcript words",
    type: "video",
    version: 1,
    width: 640,
  },
  markdown: {
    markdown: "## Markdown heading\n\nSome **bold** words and a [link](https://example.com).",
    type: "markdown",
    version: 1,
  },
  toggle: {
    content: "<p>Toggle hidden words</p>",
    heading: "<p>Toggle heading words</p>",
    type: "toggle",
    version: 1,
  },
};

// The text of an element, node by node with a space between, so neighbouring elements do not run together.
const textOf = (element: Element | null | undefined): string => {
  if (!element) return "";
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? "");
  return parts.join(" ");
};

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2),
  );

describe("what a reader sees in preview matches the content of the saved HTML", () => {
  for (const [name, card] of Object.entries(cards)) {
    it(`${name}: every word the saved HTML has for the card is shown`, async () => {
      const doc = JSON.stringify({
        root: {
          children: [para("before"), card, para("after")],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      });
      const { api } = await mount({ composer: { defaultPreview: true, initialEditorState: doc } });
      await waitFor(() =>
        expect(document.querySelector(`[data-kg-card="${name}"]`)).not.toBeNull(),
      );
      const editor = api.editorInstance;
      const html = editor.getEditorState().read(() => $generateHtmlFromNodes(editor, null));
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const exported = [...holder.children].find(
        (child) =>
          !/^(before|after)$/.test(child.textContent?.trim() ?? "") &&
          (child.textContent ?? "").trim() !== "",
      );
      const saved = words(textOf(exported));
      const shown = words(textOf(document.querySelector(`[data-kg-card="${name}"]`)));
      expect(saved.size, `the saved HTML has text for ${name}`).toBeGreaterThan(0);
      const missing = [...saved].filter((word) => !shown.has(word));
      expect(missing, `${name}: in the saved HTML, not in the preview`).toEqual([]);
    });
  }
});
