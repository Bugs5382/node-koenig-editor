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
import { act, cleanup, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode } from "lexical";
import type { KoenigEditorAPI, KoenigToolbarAction } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

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

const action = (id: string, extra: Partial<KoenigToolbarAction> = {}): KoenigToolbarAction => ({
  id,
  label: id,
  onSelect: () => undefined,
  ...extra,
});

/** The toolbar's buttons in order, with a "|" where a new row starts. */
const layout = () =>
  [...document.querySelectorAll("[data-kg-toolbar-row]")].flatMap((row, index) => [
    ...(index ? ["|"] : []),
    ...[...row.querySelectorAll("[data-kg-toolbar-button]")].map((node) =>
      node.getAttribute("data-kg-toolbar-button"),
    ),
  ]);

const load = async (composer: Record<string, unknown>) => {
  const { api } = await mount({
    composer: { initialEditorState: documentOf("hello world"), ...composer },
  });
  await selectAll(api);
};

describe("toolbar rows", () => {
  it("puts the text formats on the first row and blocks, lists, alignment and link on the second", async () => {
    await load({});
    const buttons = layout();
    expect(buttons.filter((id) => id === "|")).toHaveLength(1);
    const split = buttons.indexOf("|");
    expect(buttons.slice(0, split)).toEqual(
      expect.arrayContaining(["bold", "textColor", "clearFormatting"]),
    );
    expect(buttons.slice(split + 1)).toEqual(
      expect.arrayContaining(["h1", "bulletList", "alignLeft", "link"]),
    );
    expect(buttons.slice(0, split)).not.toContain("h1");
  });

  it("keeps one row with toolbarRows 1", async () => {
    await load({ toolbarRows: 1 });
    expect(layout()).not.toContain("|");
  });

  it("puts a host action at the end of the row it names", async () => {
    await load({ toolbarActions: [action("first", { row: 1 }), action("second", { row: 2 })] });
    const buttons = layout();
    const split = buttons.indexOf("|");
    expect(buttons.indexOf("first")).toBe(split - 1);
    expect(buttons.indexOf("second")).toBeGreaterThan(buttons.indexOf("link"));
  });

  it("puts a host action right after the built-in button it names, in either row", async () => {
    await load({
      toolbarActions: [
        action("mine", { after: "italic" }),
        action("heading-mine", { after: "heading2" }),
        action("chained", { after: "mine" }),
      ],
    });
    const buttons = layout();
    expect(buttons[buttons.indexOf("italic") + 1]).toBe("mine");
    expect(buttons[buttons.indexOf("mine") + 1]).toBe("chained");
    expect(buttons[buttons.indexOf("h2") + 1]).toBe("heading-mine");
  });

  it("adds a row for a higher row number and falls back to the end of the last row for an unknown anchor", async () => {
    await load({
      toolbarActions: [action("extra", { row: 3 }), action("lost", { after: "no-such-button" })],
    });
    const buttons = layout();
    expect(buttons.filter((id) => id === "|")).toHaveLength(2);
    expect(buttons[buttons.length - 1]).toBe("extra");
    expect(buttons.indexOf("lost")).toBeGreaterThan(buttons.indexOf("link"));
    expect(buttons.indexOf("lost")).toBeLessThan(buttons.lastIndexOf("|"));
  });
});
