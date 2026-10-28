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
import { act, render, waitFor } from "@testing-library/react";
import { $getRoot, CONTROLLED_TEXT_INSERTION_COMMAND, type SerializedEditorState } from "lexical";
import {
  KoenigComposer,
  type KoenigComposerProps,
  KoenigEditor,
  type KoenigEditorAPI,
  type KoenigEditorProps,
} from "node-koenig-editor";
import type { ReactNode } from "react";
import { expect } from "vitest";

export const paragraph = (text: string) => ({
  children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});

export const documentOf = (...texts: string[]) =>
  JSON.stringify({
    root: {
      children: texts.map(paragraph),
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

export const uploader = {
  useFileUpload: () => ({
    errors: [],
    isLoading: false,
    progress: 0,
    upload: async () => null,
  }),
};

// Types at the end of the document the way the keyboard does: Lexical turns a
// keystroke into this command once the selection is in place.
export const typeAtEnd = (api: KoenigEditorAPI, text: string) =>
  act(async () => {
    api.editorInstance.update(() => {
      $getRoot().selectEnd();
    });
    api.editorInstance.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, text);
  });

export interface MountOptions {
  composer?: Partial<KoenigComposerProps>;
  editor?: Partial<KoenigEditorProps>;
  extra?: ReactNode;
}

export const mount = async ({ composer = {}, editor = {}, extra }: MountOptions = {}) => {
  let api: KoenigEditorAPI | undefined;
  const changes: SerializedEditorState[] = [];
  const view = render(
    <KoenigComposer fileUploader={uploader} {...composer}>
      <KoenigEditor
        onChange={(state) => changes.push(state)}
        registerAPI={(registered) => {
          api = registered;
        }}
        {...editor}
      />
      {extra}
    </KoenigComposer>,
  );
  await waitFor(() => expect(api).toBeDefined());
  return { api: api as KoenigEditorAPI, changes, view };
};

/** The labels the open "+" or slash menu lists, in order. */
export const menuLabels = () =>
  [...document.querySelectorAll("[data-kg-card-menu-item]")].map((item) =>
    item.getAttribute("data-kg-card-menu-item"),
  );

/** Opens the slash menu the way a person does: focus, press "/", type it. */
export const openSlashMenu = async (api: KoenigEditorAPI) => {
  const editor = api.editorInstance;
  await act(async () => {
    editor.getRootElement()?.focus();
    editor.update(() => {
      $getRoot().selectEnd();
    });
  });
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keypress", { key: "/" }));
  });
  await typeAtEnd(api, "/");
  await waitFor(() => expect(menuLabels().length).toBeGreaterThan(0));
  return menuLabels();
};
