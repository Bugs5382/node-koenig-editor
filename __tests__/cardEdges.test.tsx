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
import {
  $createNodeSelection,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
} from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const card = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  ...extra,
});

const callout = () =>
  card("callout", { backgroundColor: "blue", calloutEmoji: "", calloutText: "Note" });
const divider = () => card("horizontalrule");

const documentWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const types = (api: Api) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => child.getType()),
  );

const selectionKind = (api: Api) =>
  api.editorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isNodeSelection(selection)) return "card";
    if ($isRangeSelection(selection))
      return selection.anchor.getNode().getTopLevelElement()?.getType();
    return "none";
  });

const selectCardAt = async (api: Api, index: number) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const selection = $createNodeSelection();
      selection.add($getRoot().getChildAtIndex(index)!.getKey());
      $setSelection(selection);
    });
  });
};

const press = async (
  api: Api,
  command: LexicalCommand<KeyboardEvent>,
  init: KeyboardEventInit = {},
) => {
  await act(async () => {
    api.editorInstance.dispatchCommand(command, new KeyboardEvent("keydown", init));
  });
};

describe("a card always has room for the cursor above and below it", () => {
  it("adds a paragraph either side of a document that is only a card", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    expect(types(api)).toEqual(["paragraph", "callout", "paragraph"]);
  });

  it("adds one between two cards, and at both ends", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout(), divider()) },
    });
    expect(types(api)).toEqual([
      "paragraph",
      "callout",
      "paragraph",
      "horizontalrule",
      "paragraph",
    ]);
  });

  it("leaves a document that already has the space alone", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith(
          { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
          callout(),
          { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
        ),
      },
    });
    expect(types(api)).toEqual(["paragraph", "callout", "paragraph"]);
  });

  it("keeps the space when a card is inserted from the menu at the end", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card-menu-item="Divider"]') as Element);
    });
    const order = types(api);
    expect(order.at(-1)).toBe("paragraph");
    expect(order[order.indexOf("horizontalrule") - 1]).toBe("paragraph");
  });

  it("does not touch a read-only editor", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout()) },
      editor: { readOnly: true },
    });
    expect(types(api)).toEqual(["callout"]);
  });
});

describe("the keyboard reaches the space around a card", () => {
  it("Arrow up on the first card puts the cursor in the paragraph above", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    await selectCardAt(api, 1);
    await press(api, KEY_ARROW_UP_COMMAND as LexicalCommand<KeyboardEvent>, { key: "ArrowUp" });
    expect(selectionKind(api)).toBe("paragraph");
    expect(
      api.editorInstance
        .getEditorState()
        .read(() => $getSelection()?.getNodes()[0]?.getTopLevelElement()?.getIndexWithinParent()),
    ).toBe(0);
  });

  it("Arrow down on the last card puts the cursor in the paragraph below", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    await selectCardAt(api, 1);
    await press(api, KEY_ARROW_DOWN_COMMAND as LexicalCommand<KeyboardEvent>, { key: "ArrowDown" });
    expect(selectionKind(api)).toBe("paragraph");
    expect(
      api.editorInstance
        .getEditorState()
        .read(() => $getSelection()?.getNodes()[0]?.getTopLevelElement()?.getIndexWithinParent()),
    ).toBe(2);
  });

  it("Enter on a selected card puts the cursor in the paragraph below it", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(divider()) } });
    await selectCardAt(api, 1);
    await press(api, KEY_ENTER_COMMAND as LexicalCommand<KeyboardEvent>, { key: "Enter" });
    expect(selectionKind(api)).toBe("paragraph");
    expect(types(api).at(-1)).toBe("paragraph");
  });
});
