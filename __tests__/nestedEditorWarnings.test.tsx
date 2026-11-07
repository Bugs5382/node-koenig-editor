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
import { act, cleanup, render, waitFor } from "@testing-library/react";
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

// Lexical warns once per page, so the cards go in one editor and the warnings are read at the end.
describe("cards with a nested editor do not trigger Lexical's nested-composer warnings (#93)", () => {
  it("inserts a callout, a toggle and a header without a LexicalNestedComposer warning", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...parts) => {
      warnings.push(parts.map(String).join(" "));
    });
    for (const type of ["callout", "toggle", "header"]) {
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
      const editor = api!.editorInstance;
      const menu = menuFor(type);
      await act(async () => {
        editor.focus();
        editor.dispatchCommand(menu.insertCommand, menu.insertParams);
        await new Promise((resolve) => setTimeout(resolve, 200));
      });
      expect(JSON.stringify(editor.getEditorState().toJSON())).toContain(`"type":"${type}"`);
      cleanup();
    }
    expect(warnings.filter((text) => text.includes("LexicalNestedComposer"))).toEqual([]);
  });
});
