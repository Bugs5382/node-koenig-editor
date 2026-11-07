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
import { $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $findMatches, $replaceAll, $replaceMatch } from "../src/additions/find/findReplace";
import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const text = (value: string, extra: Record<string, unknown> = {}) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
  ...extra,
});
const paragraph = (...children: unknown[]) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph",
  version: 1,
});
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const load = async (...blocks: unknown[]) =>
  (await mount({ composer: { initialEditorState: doc(...blocks) } })).api;
const read = <T,>(api: KoenigEditorAPI, fn: () => T) =>
  api.editorInstance.getEditorState().read(fn);
const update = async (api: KoenigEditorAPI, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(fn, { discrete: true });
  });
};
const blocks = (api: KoenigEditorAPI) =>
  read(api, () =>
    $getRoot()
      .getChildren()
      .map((child) => child.getTextContent()),
  );

describe("finding", () => {
  it("finds every match in reading order", async () => {
    const api = await load(paragraph(text("one two one")), paragraph(text("One and two")));
    const matches = read(api, () => $findMatches("one", false));
    expect(matches.map((match) => [match.start, match.end])).toEqual([
      [0, 3],
      [8, 11],
      [0, 3],
    ]);
  });

  it("can match case", async () => {
    const api = await load(paragraph(text("one One ONE")));
    expect(read(api, () => $findMatches("One", true)).length).toBe(1);
    expect(read(api, () => $findMatches("One", false)).length).toBe(3);
  });

  it("finds text that runs across formatting", async () => {
    const api = await load(paragraph(text("hel"), text("lo", { format: 1 }), text(" world")));
    expect(read(api, () => $findMatches("hello", false)).length).toBe(1);
  });

  it("finds nothing for an empty query, and does not read a query as a pattern", async () => {
    const api = await load(paragraph(text("a.c abc")));
    expect(read(api, () => $findMatches("", false))).toEqual([]);
    expect(read(api, () => $findMatches("a.c", false)).length).toBe(1);
  });
});

describe("replacing", () => {
  it("replaces one match and keeps the rest", async () => {
    const api = await load(paragraph(text("one two one")));
    await update(api, () => {
      const [first] = $findMatches("one", false);
      if (first) $replaceMatch(first, "1");
    });
    expect(blocks(api)).toEqual(["1 two one"]);
  });

  it("replaces a match that runs across formatting", async () => {
    const api = await load(paragraph(text("hel"), text("lo", { format: 1 }), text(" world")));
    await update(api, () => {
      const [first] = $findMatches("hello", false);
      if (first) $replaceMatch(first, "HI");
    });
    expect(blocks(api)).toEqual(["HI world"]);
  });

  it("replaces all of them, and says how many", async () => {
    const api = await load(paragraph(text("one two one")), paragraph(text("one")));
    let count = 0;
    await update(api, () => {
      count = $replaceAll("one", "1", false);
    });
    expect(count).toBe(3);
    expect(blocks(api)).toEqual(["1 two 1", "1"]);
  });

  it("replaces with text longer or shorter than the match, and with nothing", async () => {
    const api = await load(paragraph(text("a-a-a")));
    await update(api, () => {
      $replaceAll("a", "bbb", false);
    });
    expect(blocks(api)).toEqual(["bbb-bbb-bbb"]);
    await update(api, () => {
      $replaceAll("bbb", "", false);
    });
    expect(blocks(api)).toEqual(["--"]);
  });

  it("does not loop when the replacement contains the query", async () => {
    const api = await load(paragraph(text("a a")));
    await update(api, () => {
      expect($replaceAll("a", "aa", false)).toBe(2);
    });
    expect(blocks(api)).toEqual(["aa aa"]);
  });
});
