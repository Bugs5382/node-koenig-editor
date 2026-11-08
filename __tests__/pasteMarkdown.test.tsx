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
import { $getRoot, $isTextNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

// jsdom has no DragEvent, which the editor's own paste handling checks for
beforeAll(() => {
  (globalThis as { DragEvent?: unknown }).DragEvent ??= class extends Event {};
});

const paste = async (api: KoenigEditorAPI, text: string) => {
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
        getData: (type: string) => (type === "text/plain" ? text : ""),
        types: ["text/plain"],
      },
    });
  });
};

const shape = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => child.getType()),
  );

const MARKDOWN = "## Scope\n\n- one\n- two\n\nSome **bold** text";

describe("pasting Markdown (#99)", () => {
  it("turns Markdown into headings, lists and formats when the host turns it on", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(""), pasteMarkdown: true },
    });
    await paste(api, MARKDOWN);
    const kinds = shape(api);
    expect(kinds).toContain("heading");
    expect(kinds).toContain("list");
    expect(JSON.stringify(api.editorInstance.getEditorState().toJSON())).not.toContain("**bold**");
  });

  it("leaves a paste as plain text by default", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("") } });
    await paste(api, MARKDOWN);
    expect(shape(api)).not.toContain("heading");
    expect(shape(api)).not.toContain("list");
  });

  it("leaves ordinary text and a single link alone even when on", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(""), pasteMarkdown: true },
    });
    await paste(api, "Just a sentence, with no markup.");
    expect(shape(api)).toEqual(["paragraph"]);
  });
});
