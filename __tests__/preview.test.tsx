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
import {
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  KEY_ARROW_DOWN_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import {
  KoenigComposer,
  KoenigEditor,
  KoenigPreviewOptionsPanel,
  KoenigPreviewToggle,
} from "node-koenig-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

import { documentOf, mount, openSlashMenu, uploader } from "./__utils__/mount";

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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("true");
    await press();
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("false");
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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("true");
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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("false");
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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("false");
    view.rerender(host(true));
    await waitFor(() => expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("true"));
    view.rerender(host(false));
    await waitFor(() => expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("false"));
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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("true");
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
    expect(toggle()?.getAttribute("data-kg-preview-on")).toBe("true");
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

const blank = () => ({
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});
const line = (text: string) => ({
  children: [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});
const docWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
const callout = (calloutText = "Note") => ({
  backgroundColor: "blue",
  calloutEmoji: "",
  calloutText,
  type: "callout",
  version: 1,
});

// the editor's own wrapper, not the toolbar bar above it (which carries the class too)
const root = () =>
  document.querySelector("[data-lexical-editor]")?.closest(".koenig-lexical") as HTMLElement;

describe("preview shows no editing chrome", () => {
  it("marks the editor so styles can tell, and shows comment highlights only when asked", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(root().hasAttribute("data-kg-preview")).toBe(false);
    await press();
    expect(root().getAttribute("data-kg-preview")).toBe("true");
    expect(root().hasAttribute("data-kg-preview-comments")).toBe(false);
    await press();
    expect(root().hasAttribute("data-kg-preview")).toBe(false);
    cleanup();
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: documentOf("Hello"),
        previewComments: true,
      },
    });
    expect(root().getAttribute("data-kg-preview-comments")).toBe("true");
  });

  it("hides comment highlights in the stylesheet unless the host asks", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const css = readFileSync(
      path.resolve(import.meta.dirname, "../src/generated/koenig.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\[data-kg-preview\]:not\(\[data-kg-preview-comments\]\) mark\[data-kg-comment-ids\]/,
    );
  });

  it("has no editor placeholder in an empty document", async () => {
    await mount({ composer: { initialEditorState: docWith(blank()) } });
    expect(document.body.textContent).toContain("Begin writing");
    await press();
    expect(document.body.textContent).not.toContain("Begin writing");
  });

  it("has no placeholder in an empty card field: a callout's text, a caption", async () => {
    await mount({ composer: { initialEditorState: docWith(line("a"), callout("")) } });
    expect(document.body.textContent).toContain("Callout text");
    await press();
    expect(document.body.textContent).not.toContain("Callout text");
  });

  it("has no plus button on an empty line", async () => {
    const { api } = await mount({
      composer: { initialEditorState: docWith(line("a"), blank(), line("b")) },
    });
    // jsdom has no hit testing; the plus button's mousemove handler asks for the element under the pointer
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => null });
    const place = async () => {
      const empty = api.editorInstance.getRootElement()?.children[1] as HTMLElement;
      api.editorInstance.getRootElement()?.focus();
      const range = document.createRange();
      range.setStart(empty, 0);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      await act(async () => {
        document.dispatchEvent(new Event("selectionchange"));
        window.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 5 }));
      });
    };
    await place();
    await waitFor(() => expect(document.querySelector("[data-kg-plus-container]")).not.toBeNull());
    await press();
    await waitFor(() => expect(document.querySelector("[data-kg-plus-container]")).toBeNull());
    await place();
    expect(document.querySelector("[data-kg-plus-container]")).toBeNull();
  });

  it("has no slash menu", async () => {
    const { api } = await mount({ composer: { initialEditorState: docWith(blank()) } });
    await press();
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      window.dispatchEvent(new KeyboardEvent("keypress", { key: "/" }));
    });
    expect(document.querySelector("[data-kg-card-menu-item]")).toBeNull();
    await press();
    await openSlashMenu(api);
    expect(document.querySelector("[data-kg-card-menu-item]")).not.toBeNull();
  });

  it("has no selection toolbar when a reader selects text", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello world") } });
    await press();
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.select(0, 5);
      });
    });
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    expect(document.querySelector("[data-kg-floating-toolbar]")).toBeNull();
    expect(document.querySelector("[data-kg-toolbar-button]")).toBeNull();
  });

  it("does not select a card when a reader clicks it, so no card toolbar or outline appears", async () => {
    await mount({ composer: { initialEditorState: docWith(line("a"), callout(), line("b")) } });
    await press();
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card="callout"]') as Element);
    });
    expect(
      document.querySelector('[data-kg-card="callout"]')?.getAttribute("data-kg-card-selected"),
    ).not.toBe("true");
  });

  it("does not let the arrow keys select a card", async () => {
    const { api } = await mount({
      composer: { initialEditorState: docWith(line("a"), callout(), line("b")) },
    });
    await press();
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        $getRoot().getFirstChild()?.selectEnd();
      });
    });
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent("keydown", { key: "ArrowDown" }),
      );
    });
    const selection = api.editorInstance
      .getEditorState()
      .read(() => $isNodeSelection($getSelection()));
    expect(selection).toBe(false);
  });

  it("does not let undo or redo change the document while previewing", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await act(async () => {
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.setTextContent("Edited");
      });
    });
    await press();
    await act(async () => {
      api.editorInstance.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(api.serialize()).toContain("Edited");
  });
});

const file = (extra: Record<string, unknown> = {}) => ({
  fileCaption: "A short description",
  fileName: "report.pdf",
  fileSize: 2048,
  fileTitle: "The report",
  src: "https://example.com/report.pdf",
  type: "file",
  version: 1,
  ...extra,
});
const media = (type: string, extra: Record<string, unknown> = {}) => ({
  caption: "",
  duration: 0,
  fileName: "x",
  mimeType: "",
  src: "",
  title: "",
  trackLabel: "",
  trackLang: "en",
  trackSrc: "",
  transcript: "",
  type,
  version: 1,
  ...extra,
});

describe("each card shows its reader form in preview", () => {
  it("the file card is a download link with text, not title and description inputs", async () => {
    await mount({ composer: { initialEditorState: docWith(line("a"), file(), line("b")) } });
    expect(document.querySelectorAll('[data-kg-card="file"] input').length).toBeGreaterThan(0);
    await press();
    const card = document.querySelector('[data-kg-card="file"]') as HTMLElement;
    expect(card.querySelector("input, textarea")).toBeNull();
    const link = card.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://example.com/report.pdf");
    expect(link.hasAttribute("download")).toBe(true);
    expect(card.textContent).toContain("The report");
    expect(card.textContent).toContain("A short description");
    expect(card.textContent).toContain("report.pdf");
  });

  it("the file card does not link an address a reader should not follow", async () => {
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: docWith(line("a"), file({ src: "javascript:alert(1)" })),
      },
    });
    expect(document.querySelector('[data-kg-card="file"] a')).toBeNull();
  });

  it("the callout's emoji is plain, not a button that opens a picker", async () => {
    await mount({
      composer: {
        initialEditorState: docWith(line("a"), { ...callout(), calloutEmoji: "\u{1F4A1}" }),
      },
    });
    expect(document.querySelector('[data-testid="emoji-picker-button"]')).not.toBeNull();
    await press();
    expect(document.querySelector('[data-testid="emoji-picker-button"]')).toBeNull();
    expect(document.querySelector('[data-kg-card="callout"]')?.textContent).toContain("\u{1F4A1}");
  });

  it("an empty audio, video or image card shows nothing, as in the saved HTML", async () => {
    await mount({
      composer: {
        initialEditorState: docWith(line("a"), media("audio"), media("video"), line("b")),
      },
    });
    expect(document.body.textContent).toContain("Click to upload audio");
    await press();
    expect(document.body.textContent).not.toContain("Click to upload");
    expect(document.body.textContent).not.toContain("Click to select");
  });

  it("an audio card with a file plays it, and shows no upload or caption controls", async () => {
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: docWith(
          line("a"),
          media("audio", {
            fileName: "a.mp3",
            mimeType: "audio/mpeg",
            src: "https://example.com/a.mp3",
            title: "Episode",
          }),
        ),
      },
    });
    const card = document.querySelector('[data-kg-card="audio"]') as HTMLElement;
    expect(card.querySelector("audio")).not.toBeNull();
    expect(card.querySelector("input, textarea")).toBeNull();
    expect(card.textContent).toContain("Episode");
  });

  it("has no outline when a reader hovers a card", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const css = readFileSync(
      path.resolve(import.meta.dirname, "../src/generated/koenig.css"),
      "utf8",
    );
    expect(css).toMatch(
      /\[data-kg-preview\] \[data-kg-card\][^{]*\{[^}]*box-shadow: none !important/,
    );
  });
});

describe("the toggle card opens and closes for a reader without touching the document", () => {
  const toggleCard = {
    content: "<p>The hidden content.</p>",
    heading: "<p>The heading</p>",
    type: "toggle",
    version: 1,
  };

  it("shows both parts in editing, and a closed toggle in preview", async () => {
    await mount({ composer: { initialEditorState: docWith(line("a"), toggleCard, line("b")) } });
    const card = () => document.querySelector('[data-kg-card="toggle"]') as HTMLElement;
    expect(card().textContent).toContain("The hidden content.");
    expect(card().querySelector("[data-kg-toggle-button]")).toBeNull();
    await press();
    const button = card().querySelector("[data-kg-toggle-button]") as HTMLButtonElement;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-label")).toBe("Show content");
    const panel = document.getElementById(
      button.getAttribute("aria-controls") as string,
    ) as HTMLElement;
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(card().querySelector("[data-kg-card-overlay], [data-kg-read-only-overlay]")).toBeNull();
  });

  it("opens and closes from the button, and the document is not changed by it", async () => {
    const { api } = await mount({
      composer: { initialEditorState: docWith(line("a"), toggleCard, line("b")) },
    });
    await press();
    const before = api.serialize();
    const button = () => document.querySelector("[data-kg-toggle-button]") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(button());
    });
    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(button().getAttribute("aria-label")).toBe("Hide content");
    expect(
      document
        .getElementById(button().getAttribute("aria-controls") as string)
        ?.hasAttribute("hidden"),
    ).toBe(false);
    expect(api.serialize()).toBe(before);
    await act(async () => {
      fireEvent.click(button());
    });
    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(api.serialize()).toBe(before);
  });

  it("opens from a click on the heading too", async () => {
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: docWith(line("a"), toggleCard, line("b")),
      },
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-toggle-heading]") as Element);
    });
    expect(document.querySelector("[data-kg-toggle-button]")?.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("goes back to showing both parts when editing resumes", async () => {
    await mount({ composer: { initialEditorState: docWith(line("a"), toggleCard, line("b")) } });
    await press();
    await press();
    expect(document.querySelector("[data-kg-toggle-button]")).toBeNull();
    expect(document.querySelector('[data-kg-card="toggle"]')?.textContent).toContain(
      "The hidden content.",
    );
  });
});

const frame = () => document.querySelector("[data-kg-preview-frame]") as HTMLElement;
const group = (name: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="radiogroup"]')].find(
    (element) => element.getAttribute("aria-label") === name,
  ) as HTMLElement;
const choose = async (name: string, label: string) => {
  const option = [...group(name).querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
    (input) => input.closest("label")?.textContent?.trim() === label,
  ) as HTMLInputElement;
  await act(async () => {
    fireEvent.click(option);
  });
};

describe("the reader simulation: width, theme and text size", () => {
  it("has a frame that is inert when preview is off, so the editor is never remounted", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(frame()).not.toBeNull();
    expect(frame().style.width).toBe("");
    expect(window.getComputedStyle(frame()).display).toBe("contents");
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it("offers width, theme and text size as radio groups in preview, and only there", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await press();
    for (const name of ["Width", "Theme", "Text size"]) {
      expect(group(name), name).toBeDefined();
    }
    const labels = (name: string) =>
      [...group(name).querySelectorAll("label")].map((label) => label.textContent?.trim());
    expect(labels("Width")).toEqual(["Desktop", "Tablet", "Phone"]);
    expect(labels("Theme")).toEqual(["Light", "Dark"]);
    expect(labels("Text size")).toEqual(["12", "14", "16", "18", "20"]);
    await press();
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it("sets the frame's width from the preset", async () => {
    await mount({ composer: { defaultPreview: true, initialEditorState: documentOf("Hello") } });
    expect(frame().style.width).toBe("100%");
    await choose("Width", "Tablet");
    expect(frame().style.width).toBe("768px");
    await choose("Width", "Phone");
    expect(frame().style.width).toBe("390px");
    expect(frame().style.maxWidth).toBe("100%");
    await choose("Width", "Desktop");
    expect(frame().style.width).toBe("100%");
  });

  it("switches the theme in the frame and in the editor itself, whatever the page's darkMode", async () => {
    await mount({
      composer: { darkMode: true, defaultPreview: true, initialEditorState: documentOf("Hello") },
    });
    // the host's dark editor, previewed in the default light theme
    expect(frame().classList.contains("dark")).toBe(false);
    expect(root().classList.contains("dark")).toBe(false);
    await choose("Theme", "Dark");
    expect(frame().classList.contains("dark")).toBe(true);
    expect(root().classList.contains("dark")).toBe(true);
    await press();
    // out of preview the host's own darkMode applies again
    expect(root().classList.contains("dark")).toBe(true);
  });

  it("is light in preview even when the editor was dark, and gives the host's mode back after", async () => {
    await mount({ composer: { darkMode: true, initialEditorState: documentOf("Hello") } });
    expect(root().classList.contains("dark")).toBe(true);
    await press();
    expect(root().classList.contains("dark")).toBe(false);
    await press();
    expect(root().classList.contains("dark")).toBe(true);
  });

  it("sets the text size through --kg-rem", async () => {
    await mount({ composer: { defaultPreview: true, initialEditorState: documentOf("Hello") } });
    expect(frame().style.getPropertyValue("--kg-rem")).toBe("10px");
    await choose("Text size", "20");
    expect(frame().style.getPropertyValue("--kg-rem")).toBe("12.5px");
    await choose("Text size", "12");
    expect(frame().style.getPropertyValue("--kg-rem")).toBe("7.5px");
  });

  it("starts with the host's options and tells it when they change", async () => {
    const seen: unknown[] = [];
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: documentOf("Hello"),
        onPreviewOptionsChange: (options: unknown) => seen.push(options),
        previewOptions: { textSize: 18, width: "tablet" },
      },
    });
    expect(frame().style.width).toBe("768px");
    expect(frame().style.getPropertyValue("--kg-rem")).toBe("11.25px");
    await choose("Theme", "Dark");
    expect(seen).toEqual([{ textSize: 18, theme: "dark", width: "tablet" }]);
  });

  it("keeps the options when preview is turned off and on again", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await press();
    await choose("Width", "Phone");
    await press();
    await press();
    expect(frame().style.width).toBe("390px");
  });

  it("is a labelled region, so a screen reader knows what it is", async () => {
    await mount({ composer: { defaultPreview: true, initialEditorState: documentOf("Hello") } });
    const region = frame().closest("[data-kg-preview-stage]") as HTMLElement;
    expect(region.getAttribute("role")).toBe("region");
    expect(region.getAttribute("aria-label")).toBe("Reader preview");
  });

  it("lets a host place the options panel with its own toggle", async () => {
    await mount({
      composer: {
        defaultPreview: true,
        initialEditorState: documentOf("Hello"),
        showPreviewToggle: false,
      },
      extra: (
        <div data-host-options>
          <KoenigPreviewOptionsPanel />
        </div>
      ),
    });
    expect(document.querySelector("[data-host-options] [role='radiogroup']")).not.toBeNull();
    expect(document.querySelector("[data-kg-preview-bar]")).toBeNull();
  });
});

describe("back where it was: scroll and focus", () => {
  // jsdom has no layout: the scroller, the first block and the frame's extra height are stood in.
  // Previewing adds 19px above the editor, so the scroll offset has to be noted before the flip.
  it("puts the scroll back where it was, though preview shifts the layout", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("One", "Two") } });
    const editorRoot = api.editorInstance.getRootElement() as HTMLElement;
    const scroller = editorRoot.closest(".koenig-lexical")?.parentElement as HTMLElement;
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 5000 });
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 500 });
    scroller.scrollTop = 300;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const make = (top: number, height: number) =>
        ({
          bottom: top + height,
          height,
          left: 0,
          right: 0,
          top,
          width: 0,
          x: 0,
          y: top,
        }) as DOMRect;
      if (this === scroller) return make(0, 500);
      if (this.parentElement === editorRoot) {
        const shift = document.querySelector('[data-kg-preview-stage][role="region"]') ? 19 : 0;
        return make(100 - scroller.scrollTop + shift, 1000);
      }
      return make(0, 0);
    });
    await press();
    await waitFor(() => expect(scroller.scrollTop).toBe(319));
    await press();
    await waitFor(() => expect(scroller.scrollTop).toBe(300));
  });

  it("gives the editor focus back after a mouse press on the toggle", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello world") } });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) text.select(3, 3);
      });
    });
    // a click moves focus to the button first, and a mouse focus shows no focus ring
    const button = toggle() as HTMLButtonElement;
    vi.spyOn(button, "matches").mockImplementation((selector: string) =>
      selector === ":focus-visible" ? false : Element.prototype.matches.call(button, selector),
    );
    await act(async () => {
      button.focus();
    });
    await press();
    await press();
    expect(document.activeElement).toBe(api.editorInstance.getRootElement());
  });
});

describe("where the preview button sits", () => {
  it("is a strip of its own in the normal flow, with its height reserved, never floating over content", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    const bar = document.querySelector("[data-kg-preview-bar]") as HTMLElement;
    expect(bar).not.toBeNull();
    const classes = bar.className.split(/\s+/);
    for (const floating of ["fixed", "absolute", "sticky", "relative"])
      expect(classes).not.toContain(floating);
    expect(classes.some((name) => name.startsWith("z-"))).toBe(false);
    expect(classes.some((name) => name.startsWith("min-h-"))).toBe(true);
    // it comes before the writing area, not inside it
    const root = document.querySelector("[contenteditable]") as HTMLElement;
    expect(bar.contains(root)).toBe(false);
    expect(bar.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("holds Back to editing in the same place while previewing, as a plain button", async () => {
    await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(toggle()?.textContent).toContain("Preview");
    await press();
    const bar = document.querySelector("[data-kg-preview-bar]") as HTMLElement;
    expect(bar.contains(toggle())).toBe(true);
    expect(toggle()?.textContent).toContain("Back to editing");
    expect(toggle()?.hasAttribute("aria-pressed")).toBe(false);
    await press();
    expect(toggle()?.textContent).toContain("Preview");
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
  });
});
