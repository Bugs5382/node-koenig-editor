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
import { act, cleanup } from "@testing-library/react";
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isTextNode,
  $setSelection,
  type TextNode,
} from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  $clearFormatting,
  $getTextStyle,
  $setHighlight,
  $setTextStyle,
  FONT_SIZES,
  HIGHLIGHT_INK,
} from "../src/additions/textStyle/textStyle";
import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

const load = async () =>
  (await mount({ composer: { initialEditorState: documentOf("Hello big world") } })).api;

// the point `offset` characters into the paragraph's text, whatever pieces it is split into
const pointAt = (offset: number) => {
  let left = offset;
  const pieces = (
    $getRoot().getFirstChild() as unknown as { getChildren(): TextNode[] }
  ).getChildren();
  for (const piece of pieces) {
    const size = piece.getTextContentSize();
    if (left <= size) return { key: piece.getKey(), offset: left };
    left -= size;
  }
  const last = pieces[pieces.length - 1] as TextNode;
  return { key: last.getKey(), offset: last.getTextContentSize() };
};

const select = async (api: KoenigEditorAPI, from: number, to: number, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(
      () => {
        const start = pointAt(from);
        const end = pointAt(to);
        const selection = $createRangeSelection();
        selection.anchor.set(start.key, start.offset, "text");
        selection.focus.set(end.key, end.offset, "text");
        $setSelection(selection);
        fn();
      },
      { discrete: true },
    );
  });
};
const texts = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    ($getRoot().getFirstChild() as unknown as { getChildren(): TextNode[] })
      .getChildren()
      .map((node) => ({
        format: node.getFormat(),
        style: node.getStyle(),
        text: node.getTextContent(),
      })),
  );

describe("text style", () => {
  it("sizes are relative, with a normal that sets nothing", () => {
    expect(FONT_SIZES.map((size) => size.id)).toEqual([
      "smaller",
      "small",
      "normal",
      "large",
      "larger",
    ]);
    for (const size of FONT_SIZES) if (size.value) expect(size.value.endsWith("em")).toBe(true);
    expect(FONT_SIZES.find((size) => size.id === "normal")?.value).toBeNull();
  });

  it("sets a property on the selected part only", async () => {
    const api = await load();
    await select(api, 6, 9, () => $setTextStyle($getSelection(), "font-size", "1.25em"));
    const parts = texts(api);
    expect(parts.map((part) => part.text)).toEqual(["Hello ", "big", " world"]);
    expect(parts[1]?.style).toContain("font-size: 1.25em");
    expect(parts[0]?.style).toBe("");
  });

  it("reads the property back, and null when it is not set", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "color", "#D64545"));
    let colour: null | string = "";
    await select(api, 0, 5, () => {
      colour = $getTextStyle($getSelection(), "color");
    });
    expect(colour).toBe("#D64545");
    let none: null | string = "x";
    await select(api, 6, 9, () => {
      none = $getTextStyle($getSelection(), "color");
    });
    expect(none).toBeNull();
  });

  it("removes a property with null", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "font-family", "Georgia, serif"));
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "font-family", null));
    expect(texts(api).every((part) => !part.style.includes("font-family"))).toBe(true);
  });

  it("highlights with dark ink alongside, and takes both off again", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setHighlight($getSelection(), "#FFF3B0"));
    expect(texts(api)[0]?.style).toContain("background-color: #FFF3B0");
    expect(texts(api)[0]?.style.toLowerCase()).toContain(`color: ${HIGHLIGHT_INK.toLowerCase()}`);
    await select(api, 0, 5, () => $setHighlight($getSelection(), null));
    expect(texts(api)[0]?.style).not.toContain("background-color");
    expect(texts(api)[0]?.style).not.toContain("color");
  });

  it("is carried to the saved HTML as inline CSS", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "color", "#D64545"));
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    expect(html).toContain("color: rgb(214, 69, 69)");
  });

  it("is saved in the document", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "color", "#D64545"));
    expect(api.serialize()).toContain("color: #D64545");
  });
});

describe("clear formatting", () => {
  it("takes the formats and styles off the selected text and leaves the rest", async () => {
    const api = await load();
    await select(api, 0, 15, () => {
      const selection = $getSelection();
      $setTextStyle(selection, "color", "#D64545");
      $setTextStyle(selection, "font-size", "1.5em");
    });
    await select(api, 0, 15, () => {
      for (const node of ($getSelection() as unknown as { extract(): unknown[] }).extract()) {
        if ($isTextNode(node as never)) (node as TextNode).toggleFormat("bold");
      }
    });
    // clear only "big"
    await select(api, 6, 9, () => $clearFormatting());
    const parts = texts(api);
    const big = parts.find((part) => part.text === "big");
    expect(big).toEqual({ format: 0, style: "", text: "big" });
    const first = parts[0];
    expect(first?.format).toBe(1);
    expect(first?.style).toContain("color");
  });

  it("does nothing without a range selection", async () => {
    const api = await load();
    await select(api, 0, 5, () => $setTextStyle($getSelection(), "color", "#D64545"));
    await act(async () => {
      api.editorInstance.update(
        () => {
          $setSelection(null);
          $clearFormatting(null);
        },
        { discrete: true },
      );
    });
    expect(api.serialize()).toContain("#D64545");
  });
});
