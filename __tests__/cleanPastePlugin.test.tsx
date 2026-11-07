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
import { act, cleanup, fireEvent } from "@testing-library/react";
import { $getRoot, $isTextNode, type ElementNode, type TextNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

// jsdom has no DragEvent, which the editor's own paste handling checks for
beforeAll(() => {
  (globalThis as { DragEvent?: unknown }).DragEvent ??= class extends Event {};
});

const WORD = `<html><head><style>p.MsoNormal{font-family:Calibri}</style></head><body><!--StartFragment--><p class=MsoNormal><b><span style='font-size:14.0pt;color:red'>Quarterly report</span></b><o:p></o:p></p><p class=MsoListParagraphCxSpFirst style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span><![endif]>First point</p><p class=MsoListParagraphCxSpLast style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span>&nbsp;&nbsp;</span></span><![endif]>Second point</p><!--EndFragment--></body></html>`;
const DOCS = `<meta charset='utf-8'><b style="font-weight:normal;" id="docs-internal-guid-9"><p dir="ltr" style="line-height:1.38"><span style="font-size:11pt;font-weight:400;white-space:pre-wrap;">Plain </span><span style="font-size:11pt;font-weight:700;white-space:pre-wrap;">heavy</span></p></b>`;

const paste = async (api: KoenigEditorAPI, data: Record<string, string>, types?: string[]) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) first.select(first.getTextContentSize(), first.getTextContentSize());
    });
  });
  await act(async () => {
    fireEvent.paste(api.editorInstance.getRootElement() as Element, {
      clipboardData: {
        files: [],
        getData: (type: string) => data[type] ?? "",
        types: types ?? Object.keys(data),
      },
    });
  });
};

const shape = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map(
        (child) =>
          child.getType() +
          (child.getType() === "list"
            ? `:${(child as unknown as { getListType(): string }).getListType()}`
            : ""),
      ),
  );
const texts = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => {
    const found: { format: number; style: string; text: string }[] = [];
    const walk = (node: ElementNode) => {
      for (const child of node.getChildren()) {
        if ($isTextNode(child)) {
          const text = child as TextNode;
          found.push({
            format: text.getFormat(),
            style: text.getStyle(),
            text: text.getTextContent(),
          });
        } else if ("getChildren" in child) walk(child as ElementNode);
      }
    };
    walk($getRoot());
    return found;
  });

describe("pasting from Word", () => {
  it("brings the structure and leaves the noise behind", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("") } });
    await paste(api, {
      "text/html": WORD,
      "text/plain": "Quarterly report\nFirst point\nSecond point",
    });
    expect(shape(api)).toContain("list:bullet");
    const found = texts(api);
    expect(found.every((entry) => entry.style === "")).toBe(true);
    const title = found.find((entry) => entry.text === "Quarterly report");
    expect(title?.format).toBe(1);
    expect(found.some((entry) => entry.text.includes("·"))).toBe(false);
    expect(found.map((entry) => entry.text)).toEqual(
      expect.arrayContaining(["First point", "Second point"]),
    );
  });
});

describe("pasting from Google Docs", () => {
  it("does not turn the whole paste bold", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("") } });
    await paste(api, { "text/html": DOCS, "text/plain": "Plain heavy" });
    const found = texts(api);
    expect(found.find((entry) => entry.text.includes("Plain"))?.format).toBe(0);
    expect(found.find((entry) => entry.text === "heavy")?.format).toBe(1);
    expect(found.every((entry) => entry.style === "")).toBe(true);
  });
});

describe("what clean paste leaves alone", () => {
  it("is off when the host's tools option leaves it out", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(""), tools: ["preview"] },
    });
    await paste(api, { "text/html": WORD, "text/plain": "x" });
    // without the cleaner the Word list is just paragraphs with the bullet character in them
    expect(shape(api)).not.toContain("list:bullet");
  });
});
