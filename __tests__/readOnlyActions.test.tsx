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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot } from "lexical";
import type { KoenigEditorAPI, KoenigToolbarAction } from "node-koenig-editor";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

// jsdom has no DragEvent, which the editor's own drop handling checks for
beforeAll(() => {
  (globalThis as { DragEvent?: unknown }).DragEvent ??= class extends Event {};
});

const TEXT = "hello world";

/** Selects the text the way a person does: a DOM selection, then the selectionchange it fires. */
const select = async (api: KoenigEditorAPI) => {
  const root = api.editorInstance.getRootElement() as HTMLElement;
  await act(async () => {
    root.focus();
    const text = root.querySelector("span, p")?.firstChild ?? root.firstChild;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const node = walker.nextNode() ?? (text as Node);
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, node.textContent?.length ?? 0);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
};

const buttons = () =>
  [...document.querySelectorAll("[data-kg-toolbar-button]")].map((button) =>
    button.getAttribute("data-kg-toolbar-button"),
  );

const comment: KoenigToolbarAction = {
  id: "comment",
  label: "Comment",
  onSelect: vi.fn(),
  readOnly: true,
};
const shout: KoenigToolbarAction = { id: "shout", label: "Shout", onSelect: vi.fn() };

const readOnly = (toolbarActions: KoenigToolbarAction[] = []) =>
  mount({
    composer: { editable: false, initialEditorState: documentOf(TEXT), toolbarActions },
  });

const snapshot = (api: KoenigEditorAPI) => JSON.stringify(api.editorInstance.getEditorState());

describe("the selection toolbar in a read-only editor (#106)", () => {
  it("shows an action that declares readOnly, and no format button", async () => {
    const { api } = await readOnly([comment, shout]);
    await select(api);
    await waitFor(() => expect(buttons()).toEqual(["comment"]));
  });

  it("calls the action with the selection", async () => {
    const onSelect = vi.fn();
    const { api } = await readOnly([{ ...comment, onSelect }]);
    await select(api);
    await waitFor(() => expect(buttons()).toEqual(["comment"]));
    await act(async () => {
      fireEvent.click(
        document.querySelector('[data-kg-toolbar-button="comment"] button') as Element,
      );
    });
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0]![0].text).toBe(TEXT);
  });

  it("shows no toolbar when no action declares readOnly", async () => {
    const { api } = await readOnly([shout]);
    await select(api);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(buttons()).toEqual([]);
  });

  it("shows no toolbar when the host gives no action", async () => {
    const { api } = await readOnly();
    await select(api);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(buttons()).toEqual([]);
  });

  it("does not let the action's card replace the selected text", async () => {
    const results: boolean[] = [];
    const replacing: KoenigToolbarAction = {
      Card: ({ replaceSelection }) => (
        <button type="button" onClick={() => results.push(replaceSelection("x"))}>
          replace
        </button>
      ),
      id: "replacing",
      label: "Replacing",
      readOnly: true,
    };
    const { api } = await readOnly([replacing]);
    await select(api);
    await waitFor(() => expect(buttons()).toEqual(["replacing"]));
    await act(async () => {
      fireEvent.click(
        document.querySelector('[data-kg-toolbar-button="replacing"] button') as Element,
      );
    });
    await act(async () => {
      fireEvent.click(document.querySelector("button:not([aria-label])") as Element);
    });
    expect(results).toEqual([false]);
    expect(api.editorInstance.getEditorState().read(() => $getRoot().getTextContent())).toBe(TEXT);
  });

  it("leaves an editable editor's toolbar as it was, readOnly actions included", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf(TEXT), toolbarActions: [comment] },
    });
    await select(api);
    await waitFor(() => expect(buttons()).toEqual(expect.arrayContaining(["bold", "comment"])));
  });
});

describe("a read-only editor takes no edit (#106)", () => {
  const root = (api: KoenigEditorAPI) => api.editorInstance.getRootElement() as HTMLElement;

  const stays = async (api: KoenigEditorAPI, act_: () => void | Promise<void>) => {
    await select(api);
    const before = snapshot(api);
    await act(async () => {
      await act_();
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(snapshot(api)).toBe(before);
  };

  const clipboard = (data: Record<string, string>) => ({
    clipboardData: {
      files: [],
      getData: (type: string) => data[type] ?? "",
      types: Object.keys(data),
    },
  });

  it("is not content-editable", async () => {
    const { api } = await readOnly();
    expect(root(api).getAttribute("contenteditable")).toBe("false");
  });

  it("ignores typed text (beforeinput)", async () => {
    const { api } = await readOnly();
    await stays(api, () => {
      fireEvent(
        root(api),
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          data: "x",
          inputType: "insertText",
        }),
      );
    });
  });

  it("ignores delete and replace (beforeinput)", async () => {
    const { api } = await readOnly();
    for (const inputType of [
      "deleteContentBackward",
      "deleteContentForward",
      "insertParagraph",
      "deleteByCut",
      "insertFromPaste",
    ]) {
      await stays(api, () => {
        fireEvent(
          root(api),
          new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType }),
        );
      });
    }
  });

  it("ignores Backspace, Delete, Enter and Tab", async () => {
    const { api } = await readOnly();
    for (const key of ["Backspace", "Delete", "Enter", "Tab"]) {
      await stays(api, () => {
        fireEvent.keyDown(root(api), { key });
      });
    }
  });

  it("ignores the formatting shortcuts", async () => {
    const { api } = await readOnly();
    const shortcuts = [
      { ctrlKey: true, key: "b", keyCode: 66 },
      { ctrlKey: true, key: "i", keyCode: 73 },
      { ctrlKey: true, key: "u", keyCode: 85 },
      { ctrlKey: true, key: "z", keyCode: 90 },
      { ctrlKey: true, key: "y", keyCode: 89 },
      { ctrlKey: true, key: "\\", keyCode: 220 },
      { ctrlKey: true, key: "k", keyCode: 75 },
      { ctrlKey: true, shiftKey: true, key: "x", keyCode: 88 },
      { altKey: true, ctrlKey: true, key: "1", keyCode: 49 },
    ];
    for (const shortcut of shortcuts) {
      await stays(api, () => {
        fireEvent.keyDown(root(api), shortcut);
      });
    }
  });

  it("ignores paste, plain and rich", async () => {
    const { api } = await readOnly();
    await stays(api, () => {
      fireEvent.paste(root(api), clipboard({ "text/plain": "pasted" }));
    });
    await stays(api, () => {
      fireEvent.paste(
        root(api),
        clipboard({ "text/html": "<p><b>pasted</b></p>", "text/plain": "pasted" }),
      );
    });
  });

  it("ignores cut", async () => {
    const { api } = await readOnly();
    await stays(api, () => {
      fireEvent.cut(root(api), clipboard({}));
    });
  });

  it("ignores a drop of text, html or a file", async () => {
    const { api } = await readOnly();
    await stays(api, () => {
      fireEvent.drop(root(api), {
        dataTransfer: {
          files: [],
          getData: (type: string) => (type === "text/plain" ? "dropped" : ""),
          types: ["text/plain"],
        },
      });
    });
    await stays(api, () => {
      fireEvent.drop(root(api), {
        dataTransfer: {
          files: [new File(["x"], "x.png", { type: "image/png" })],
          getData: () => "",
          types: ["Files"],
        },
      });
    });
  });

  it("ignores the markdown shortcut when '## ' is typed", async () => {
    const { api } = await readOnly();
    await stays(api, () => {
      for (const data of ["#", "#", " "]) {
        fireEvent(
          root(api),
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            data,
            inputType: "insertText",
          }),
        );
      }
    });
  });

  // the control: the same paste does edit an editable editor, so the tests above can fail
  it("(control) the same paste edits an editable editor", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf(TEXT) } });
    const before = snapshot(api);
    await select(api);
    await act(async () => {
      fireEvent.paste(
        root(api),
        clipboard({ "text/html": "<p>pasted</p>", "text/plain": "pasted" }),
      );
    });
    await waitFor(() => expect(snapshot(api)).not.toBe(before));
  });
});
