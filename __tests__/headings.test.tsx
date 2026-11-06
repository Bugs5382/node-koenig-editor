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
import { act, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode } from "lexical";
import { $isHeadingNode } from "@lexical/rich-text";
import { KOENIG_TOOLBAR_ITEMS, type KoenigEditorAPI } from "node-koenig-editor";
import { describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

const selectAll = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const text = $getRoot().getFirstDescendant();
      if ($isTextNode(text)) text.select(0, text.getTextContentSize());
    });
  });
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
  await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).not.toBeNull());
};

const headingTags = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => ($isHeadingNode(child) ? child.getTag() : child.getType())),
  );

const headingDocument = (tag: string) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "Deep",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          tag,
          type: "heading",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

describe("heading levels", () => {
  it("names the five levels, H1 to H5, and nothing deeper", () => {
    const headings = KOENIG_TOOLBAR_ITEMS.filter((item) => item.startsWith("heading"));
    expect(headings).toEqual(["heading1", "heading2", "heading3", "heading4", "heading5"]);
  });

  it("shows a button for each level", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await selectAll(api);
    const buttons = [...document.querySelectorAll("[data-kg-toolbar-button]")].map((b) =>
      b.getAttribute("data-kg-toolbar-button"),
    );
    expect(buttons).toEqual(expect.arrayContaining(["h1", "h2", "h3", "h4", "h5"]));
    expect(buttons).not.toContain("h6");
  });

  it("turns the paragraph into a Heading 1 from the button", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await selectAll(api);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-toolbar-button="h1"] button') as Element);
    });
    expect(headingTags(api)).toEqual(["h1"]);
  });

  it("can hide the new levels through the toolbar option", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), toolbar: ["bold", "heading1"] },
    });
    await selectAll(api);
    const buttons = [...document.querySelectorAll("[data-kg-toolbar-button]")].map((b) =>
      b.getAttribute("data-kg-toolbar-button"),
    );
    expect(buttons).toEqual(["bold", "h1"]);
  });

  it("clamps a stored or pasted Heading 6 to Heading 5", async () => {
    const { api } = await mount({ composer: { initialEditorState: headingDocument("h6") } });
    await waitFor(() => expect(headingTags(api)).toEqual(["h5"]));
  });

  it("keeps Heading 5 as it is", async () => {
    const { api } = await mount({ composer: { initialEditorState: headingDocument("h5") } });
    expect(headingTags(api)).toEqual(["h5"]);
  });
});
