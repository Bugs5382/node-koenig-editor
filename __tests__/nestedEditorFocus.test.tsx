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

import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { createEditor, type LexicalEditor } from "lexical";
import { DEFAULT_NODES, KoenigComposer, KoenigEditor, type KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

import { documentOf, uploader } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom has no hit testing; the editor's drag handle asks for it on pointer moves.
document.elementFromPoint = () => null;

type Menu = { insertCommand: never; insertParams: never };

const menuFor = (type: string): Menu => {
  const node = DEFAULT_NODES.find((n) => (n as { getType?: () => string }).getType?.() === type);
  const menu = (node as unknown as { kgMenu?: Menu | Menu[] }).kgMenu;
  return (Array.isArray(menu) ? menu[0] : menu) as Menu;
};

describe("a card's nested editor asks to focus itself, then goes away (#92)", () => {
  // Lexical runs the callback given to `editor.focus()` on the editor's next commit. When the
  // nested editor is unmounted first (React's StrictMode does that in development, and so does
  // closing a card), that commit is the one inside `setRootElement(null)`, and the editor has no
  // root element by then. The callback must cope with that.
  it.each(["callout", "toggle"])("%s: a focus request that runs after the unmount does not throw", async (type) => {
    const prototype = Object.getPrototypeOf(createEditor()) as LexicalEditor;
    const original = prototype.focus;
    const held: Array<{ editor: LexicalEditor; run: () => void }> = [];
    prototype.focus = function (this: LexicalEditor, callback?: () => void) {
      if (callback && (this as unknown as { _parentEditor?: unknown })._parentEditor) {
        held.push({ editor: this, run: callback });
        return;
      }
      return original.call(this, callback);
    } as typeof prototype.focus;
    try {
      let api: KoenigEditorAPI | undefined;
      render(
        <KoenigComposer fileUploader={uploader} initialEditorState={documentOf("Hello")}>
          <KoenigEditor
            registerAPI={(registered) => {
              api = registered;
            }}
          />
        </KoenigComposer>,
      );
      await waitFor(() => expect(api).toBeDefined());
      const menu = menuFor(type);
      await act(async () => {
        api!.editorInstance.focus();
        api!.editorInstance.dispatchCommand(menu.insertCommand, menu.insertParams);
        await new Promise((resolve) => setTimeout(resolve, 300));
      });
      const card = document.querySelector("[data-kg-card]") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(card);
        fireEvent.click(card);
        await new Promise((resolve) => setTimeout(resolve, 300));
      });
      expect(held.length).toBeGreaterThan(0);
      for (const { editor } of held) editor.setRootElement(null);
      for (const { run } of held) expect(run).not.toThrow();
    } finally {
      prototype.focus = original;
    }
  });
});
