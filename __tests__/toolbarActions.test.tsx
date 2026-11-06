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
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { $getRoot, $isTextNode } from "lexical";
import type { KoenigEditorAPI, KoenigToolbarAction } from "node-koenig-editor";
import { describe, expect, it, vi } from "vitest";

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

const documentText = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => $getRoot().getTextContent());

const shout: KoenigToolbarAction = {
  Card: ({ replaceSelection, text }) => (
    <div data-testid="shout-card">
      <span>{text}</span>
      <button type="button" onClick={() => replaceSelection(text.toUpperCase())}>
        apply
      </button>
    </div>
  ),
  id: "shout",
  label: "Shout",
};

const press = async (selector: string) => {
  await act(async () => {
    fireEvent.click(document.querySelector(selector) as Element);
  });
};

describe("host toolbar actions", () => {
  it("adds a button to the selection toolbar beside the built-in ones", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("hello world"), toolbarActions: [shout] },
    });
    await selectAll(api);
    const buttons = [...document.querySelectorAll("[data-kg-toolbar-button]")].map((b) =>
      b.getAttribute("data-kg-toolbar-button"),
    );
    expect(buttons).toEqual(expect.arrayContaining(["bold", "link", "shout"]));
    expect(
      document.querySelector('[data-kg-toolbar-button="shout"] button')?.getAttribute("aria-label"),
    ).toBe("Shout");
  });

  it("opens the host's card with the selected text and lets it replace that text", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("hello world"), toolbarActions: [shout] },
    });
    await selectAll(api);
    await press('[data-kg-toolbar-button="shout"] button');
    expect((await screen.findByTestId("shout-card")).textContent).toContain("hello world");
    // the card takes focus from the editor, as a host's input or answer does
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().selectEnd();
      });
    });
    await act(async () => {
      fireEvent.click(screen.getByText("apply"));
    });
    expect(documentText(api)).toBe("HELLO WORLD");
  });

  it("refuses to replace text that changed since the card opened", async () => {
    const results: boolean[] = [];
    const late: KoenigToolbarAction = {
      Card: ({ replaceSelection }) => (
        <button type="button" onClick={() => results.push(replaceSelection("x"))}>
          late
        </button>
      ),
      id: "late",
      label: "Late",
    };
    const { api } = await mount({
      composer: { initialEditorState: documentOf("hello world"), toolbarActions: [late] },
    });
    await selectAll(api);
    await press('[data-kg-toolbar-button="late"] button');
    await act(async () => {
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.setTextContent("changed");
      });
    });
    await act(async () => {
      fireEvent.click(await screen.findByText("late"));
    });
    expect(results).toEqual([false]);
    expect(documentText(api)).toBe("changed");
  });

  it("runs onSelect for a button with no card", async () => {
    const onSelect = vi.fn();
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf("hello world"),
        toolbarActions: [{ id: "note", label: "Note", onSelect }],
      },
    });
    await selectAll(api);
    await press('[data-kg-toolbar-button="note"] button');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ text: "hello world" }));
  });

  it("leaves out a hidden action", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf("hello world"),
        toolbarActions: [{ ...shout, hidden: true }],
      },
    });
    await selectAll(api);
    expect(document.querySelector('[data-kg-toolbar-button="shout"]')).toBeNull();
  });
});
