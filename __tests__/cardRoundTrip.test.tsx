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
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";
import { cell, row } from "./__utils__/tables";

afterEach(() => cleanup());

// Fields edited in a nested editor are saved as HTML; this is what that editor writes.
const span = (value: string) => `<span style="white-space: pre-wrap;">${value}</span>`;
const para = (value: string) => `<p>${span(value)}</p>`;
const text = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});
const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

/** One filled-in block of every kind the editor saves at the top level. */
const SAMPLES: Record<string, Record<string, unknown>> = {
  paragraph: element("paragraph", [text("Hello")], { textFormat: 0, textStyle: "" }),
  heading: element("heading", [text("A heading")], { tag: "h2" }),
  quote: element("quote", [text("A quote")]),
  aside: element("aside", [text("An aside")]),
  list: element(
    "list",
    [
      element("listitem", [text("one")], { value: 1 }),
      element("listitem", [text("two")], { value: 2 }),
    ],
    { listType: "bullet", start: 1, tag: "ul" },
  ),
  code: element("code", [text("let a = 1;")], { language: "js" }),
  table: element(
    "table",
    [row({ text: "a", headerState: 1 }, { text: "b", headerState: 1 })].map((r) => r),
    {
      colWidths: [120, 120],
    },
  ),
  image: {
    type: "image",
    version: 1,
    src: "https://example.com/a.png",
    width: 640,
    height: 480,
    title: "Title",
    alt: "Alt text",
    caption: span("A caption"),
    cardWidth: "wide",
    href: "https://example.com/",
  },
  gallery: {
    type: "gallery",
    version: 1,
    images: [
      {
        row: 0,
        fileName: "a.png",
        src: "https://example.com/a.png",
        width: 100,
        height: 80,
        alt: "one",
        title: "first",
      },
      {
        row: 0,
        fileName: "b.png",
        src: "https://example.com/b.png",
        width: 100,
        height: 80,
        alt: "two",
        title: "second",
      },
    ],
    caption: para("Gallery caption"),
    maxImages: 12,
    autoplaySeconds: 4,
    shuffle: true,
    screenMode: true,
  },
  video: {
    type: "video",
    version: 1,
    src: "/content/media/a.mp4",
    caption: "A talk",
    transcript: "Hello",
    fileName: "a.mp4",
    mimeType: "video/mp4",
    width: 640,
    height: 360,
    duration: 12,
    cardWidth: "regular",
    trackSrc: "/content/media/a.vtt",
    trackLang: "en",
    trackLabel: "English",
  },
  audio: {
    type: "audio",
    version: 1,
    src: "/content/media/a.mp3",
    title: "Episode",
    transcript: "Words",
    fileName: "a.mp3",
    mimeType: "audio/mpeg",
    duration: 30,
    trackSrc: "/content/media/a.vtt",
    trackLang: "en",
    trackLabel: "English",
  },
  file: {
    type: "file",
    version: 1,
    src: "/content/files/a.pdf",
    fileTitle: "Paper",
    fileCaption: "Notes",
    fileName: "a.pdf",
    fileSize: 2048,
    showIcon: true,
  },
  horizontalrule: { type: "horizontalrule", version: 1 },
  callout: {
    type: "callout",
    version: 1,
    calloutText: para("Note"),
    calloutEmoji: "*",
    backgroundColor: "green",
    textColor: "",
  },
  toggle: { type: "toggle", version: 1, heading: span("Head"), content: para("Body") },
  "toggle-group": {
    type: "toggle-group",
    version: 1,
    items: [
      { heading: span("One"), content: para("First") },
      { heading: span("Two"), content: para("Second") },
    ],
  },
  button: {
    type: "button",
    version: 1,
    buttonText: "Go",
    buttonEmoji: "",
    backgroundColor: "#ff0000",
    textColor: "#ffffff",
    alignment: "left",
    buttonUrl: "https://example.com/go",
  },
  markdown: { type: "markdown", version: 1, markdown: "# Heading\n\nSome *text*" },
  header: {
    type: "header",
    size: "large",
    style: "image",
    buttonEnabled: true,
    buttonUrl: "https://example.com/",
    buttonText: "Read",
    buttonEmoji: "",
    header: span("Big"),
    subheader: span("Small"),
    backgroundImageSrc: "https://example.com/bg.png",
    backgroundImageWidth: 1000,
    backgroundImageHeight: 500,
    accentColor: "#FF1A75",
    alignment: "left",
    backgroundColor: "#000000",
    backgroundSize: "cover",
    textColor: "#FFFFFF",
    buttonColor: "#ffffff",
    buttonTextColor: "#000000",
    layout: "full",
    swapped: true,
    version: 2,
  },
};
SAMPLES.table!.children = [
  row({ text: "a", headerState: 1 }, { text: "b", headerState: 1 }),
  row({ text: "c" }, { text: "d" }),
];

const documentOf = (children: unknown[], root: Record<string, unknown> = {}) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1, ...root },
  });

type Saved = Record<string, unknown> & { $?: { id?: string }; type: string };

const saved = (api: Awaited<ReturnType<typeof mount>>["api"]): Saved[] =>
  (api.editorInstance.getEditorState().toJSON().root.children as unknown as Saved[]).filter(
    (child) => !(child.type === "paragraph" && (child.children as unknown[]).length === 0),
  );

const textOf = (node: Record<string, unknown>): string =>
  typeof node.text === "string"
    ? node.text
    : ((node.children as Record<string, unknown>[] | undefined) ?? []).map(textOf).join("");

const without = ({ $: _state, ...rest }: Saved) => rest;

describe("every block saves and loads without losing data", () => {
  it.each(Object.keys(SAMPLES))("%s: nothing the document held is lost", async (type) => {
    const { api } = await mount({ composer: { initialEditorState: documentOf([SAMPLES[type]]) } });
    const [first] = saved(api);
    if (type === "code") {
      // the code block saves its text as highlighted runs; the text and language are the same
      expect(first).toMatchObject({ type: "code", language: "js" });
      expect(textOf(first!)).toBe("let a = 1;");
      return;
    }
    expect(first).toMatchObject(SAMPLES[type]!);
  });

  it.each(Object.keys(SAMPLES))("%s: saving again gives the same document", async (type) => {
    const one = await mount({ composer: { initialEditorState: documentOf([SAMPLES[type]]) } });
    const firstPass = one.api.editorInstance.getEditorState().toJSON();
    cleanup();
    const two = await mount({ composer: { initialEditorState: JSON.stringify(firstPass) } });
    expect(two.api.editorInstance.getEditorState().toJSON()).toEqual(firstPass);
  });

  it.each(Object.keys(SAMPLES))("%s: carries an id and a type, like a paragraph", async (type) => {
    const { api } = await mount({ composer: { initialEditorState: documentOf([SAMPLES[type]]) } });
    const [first] = saved(api);
    expect(first!.type).toBe(type);
    expect(first!.$?.id).toMatch(/^[0-9a-f]{4}$/);
  });

  it("a document of every block keeps the ids it has across a save and a load", async () => {
    const children = Object.values(SAMPLES);
    const one = await mount({ composer: { initialEditorState: documentOf(children) } });
    const ids = saved(one.api).map((block) => block.$?.id);
    expect(ids.every((id) => typeof id === "string")).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const firstPass = JSON.stringify(one.api.editorInstance.getEditorState().toJSON());
    cleanup();
    const two = await mount({ composer: { initialEditorState: firstPass } });
    expect(saved(two.api).map((block) => block.$?.id)).toEqual(ids);
    expect(saved(two.api).map(without)).toEqual(saved(one.api).map(without));
  });

  it("an old document with no ids opens unchanged, and gets ids", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf([SAMPLES.paragraph, SAMPLES.callout]) },
    });
    const blocks = saved(api);
    expect(blocks.map(without)).toMatchObject([SAMPLES.paragraph, SAMPLES.callout]);
    expect(blocks.every((block) => block.$?.id)).toBe(true);
  });

  it("the cell helper is still a table cell", () => {
    expect(cell({ text: "x" }).type).toBe("tablecell");
    expect(act).toBeDefined();
  });
});
