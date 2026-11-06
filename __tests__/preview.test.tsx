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
import { $getRoot, $getSelection, $isRangeSelection, $isTextNode, UNDO_COMMAND } from "lexical";
import { KoenigComposer, KoenigEditor, KoenigPreviewToggle } from "node-koenig-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

import { documentOf, mount, uploader } from "./__utils__/mount";

afterEach(() => cleanup());

const toggle = () => document.querySelector("[data-kg-preview-toggle]") as HTMLButtonElement | null;
const press = async () => {
  await act(async () => {
    fireEvent.click(toggle() as Element);
  });
};

describe("the preview toggle", () => {
  it("is a button on the editor, named Preview, that reports whether it is on", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    const button = toggle() as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.textContent).toContain("Preview");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
    await press();
    expect(toggle()?.getAttribute("aria-pressed")).toBe("true");
    await press();
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps focus on the toggle when it flips, so a keyboard user is not dropped", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    toggle()?.focus();
    await press();
    expect(document.activeElement).toBe(toggle());
    await press();
    expect(document.activeElement).toBe(toggle());
  });

  it("tells the host through onPreviewChange", async () => {
    const seen: boolean[] = [];
    await mount({
      composer: {
        initialEditorState: documentOf("Hello"),
        onPreviewChange: (on: boolean) => seen.push(on),
      },
    });
    await press();
    await press();
    expect(seen).toEqual([true, false]);
  });

  it("starts on with defaultPreview", async () => {
    await mount({ composer: { defaultPreview: true, initialEditorState: documentOf("Hello") } });
    expect(toggle()?.getAttribute("aria-pressed")).toBe("true");
  });

  it("is controlled by the preview prop when the host gives one", async () => {
    const seen: boolean[] = [];
    await mount({
      composer: {
        initialEditorState: documentOf("Hello"),
        onPreviewChange: (on: boolean) => seen.push(on),
        preview: false,
      },
    });
    await press();
    expect(seen).toEqual([true]);
    // the host did not change the prop, so nothing changed
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
  });

  it("follows the preview prop when the host changes it", async () => {
    const host = (preview: boolean) => (
      <KoenigComposer
        fileUploader={uploader}
        initialEditorState={documentOf("Hello")}
        preview={preview}
      >
        <KoenigEditor />
      </KoenigComposer>
    );
    const view = render(host(false));
    await waitFor(() => expect(toggle()).not.toBeNull());
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
    view.rerender(host(true));
    await waitFor(() => expect(toggle()?.getAttribute("aria-pressed")).toBe("true"));
    view.rerender(host(false));
    await waitFor(() => expect(toggle()?.getAttribute("aria-pressed")).toBe("false"));
  });
});

describe("the preview API", () => {
  it("reports and sets it from the editor API", async () => {
    const seen: boolean[] = [];
    const { api } = await mount({
      composer: {
        initialEditorState: documentOf("Hello"),
        onPreviewChange: (on: boolean) => seen.push(on),
      },
    });
    expect(api.isPreview()).toBe(false);
    await act(async () => {
      api.setPreview(true);
    });
    expect(api.isPreview()).toBe(true);
    expect(toggle()?.getAttribute("aria-pressed")).toBe("true");
    expect(seen).toEqual([true]);
    await act(async () => {
      api.setPreview(false);
    });
    expect(api.isPreview()).toBe(false);
    expect(seen).toEqual([true, false]);
  });
});

describe("placing and switching off the toggle", () => {
  it("drops the default toggle with showPreviewToggle={false}, for a host that places its own", async () => {
    await mount({
      composer: { initialEditorState: documentOf("Hello"), showPreviewToggle: false },
      extra: (
        <div data-host-slot>
          <KoenigPreviewToggle />
        </div>
      ),
    });
    expect(document.querySelectorAll("[data-kg-preview-toggle]")).toHaveLength(1);
    expect((toggle() as HTMLElement).closest("[data-host-slot]")).not.toBeNull();
    await press();
    expect(toggle()?.getAttribute("aria-pressed")).toBe("true");
  });

  it("has no toggle when the preview tool is left out of tools", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), tools: ["imageEditor", "emojiPicker"] },
      extra: <KoenigPreviewToggle />,
    });
    expect(toggle()).toBeNull();
    await act(async () => {
      api.setPreview(true);
    });
    expect(api.isPreview()).toBe(false);
    expect(api.editorInstance.isEditable()).toBe(true);
  });

  it("is on by default, and tools={[]} turns it off with the rest", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello"), tools: [] } });
    expect(toggle()).toBeNull();
  });

  it("is not offered when the host's editor is not editable at all", async () => {
    await mount({ composer: { editable: false, initialEditorState: documentOf("Hello") } });
    expect(toggle()).toBeNull();
  });
});

describe("one live document, nothing lost, back where it was", () => {
  it("makes the editor read-only in preview and gives back what the host had", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(api.editorInstance.isEditable()).toBe(true);
    await press();
    expect(api.editorInstance.isEditable()).toBe(false);
    await press();
    expect(api.editorInstance.isEditable()).toBe(true);
  });

  it("does not change the document: it serializes the same after a round trip", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello", "World") } });
    const before = api.serialize();
    await press();
    expect(api.serialize()).toBe(before);
    await press();
    expect(api.serialize()).toBe(before);
  });

  it("is the same editor throughout, not a copy", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    const root = api.editorInstance.getRootElement();
    await press();
    expect(api.editorInstance.getRootElement()).toBe(root);
    // an edit made through the API while previewing is in the one document
    await act(async () => {
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.setTextContent("Changed while previewing");
      });
    });
    await press();
    expect(api.serialize()).toContain("Changed while previewing");
  });

  it("keeps the selection through two flips", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello world") } });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.select(2, 7);
      });
    });
    const read = () =>
      api.editorInstance.getEditorState().read(() => {
        const selection = $getSelection();
        return $isRangeSelection(selection)
          ? { anchor: selection.anchor.offset, focus: selection.focus.offset }
          : null;
      });
    expect(read()).toEqual({ anchor: 2, focus: 7 });
    await press();
    await press();
    expect(read()).toEqual({ anchor: 2, focus: 7 });
  });

  it("puts the cursor back in the editor after previewing", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello world") } });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.select(3, 3);
      });
    });
    await press();
    await press();
    await waitFor(() => expect(document.activeElement).toBe(api.editorInstance.getRootElement()));
  });

  it("leaves no undo step behind: undo after the round trip reverts the real edit", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await act(async () => {
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.setTextContent("Edited");
      });
    });
    expect(api.serialize()).toContain("Edited");
    await press();
    await press();
    await act(async () => {
      api.editorInstance.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(api.serialize()).toContain("Hello");
    expect(api.serialize()).not.toContain("Edited");
  });

  it("clears a selected card when previewing starts, so no card is left in edit mode", async () => {
    const callout = {
      backgroundColor: "blue",
      calloutEmoji: "",
      calloutText: "Note",
      type: "callout",
      version: 1,
    };
    const doc = JSON.stringify({
      root: {
        children: [
          { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
          callout,
          { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    });
    await mount({ composer: { initialEditorState: doc } });
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card="callout"]') as Element);
    });
    expect(
      document.querySelector('[data-kg-card="callout"]')?.getAttribute("data-kg-card-selected"),
    ).toBe("true");
    await press();
    const card = document.querySelector('[data-kg-card="callout"]') as HTMLElement;
    expect(card.getAttribute("data-kg-card-selected")).not.toBe("true");
    expect(card.getAttribute("data-kg-card-editing")).not.toBe("true");
  });

  it("closes an open dialog when previewing starts", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    document.querySelector(".koenig-lexical")?.appendChild(dialog);
    const cancel = vi.fn((event: Event) => event.preventDefault());
    dialog.addEventListener("cancel", cancel);
    await press();
    expect(cancel).toHaveBeenCalled();
  });
});
