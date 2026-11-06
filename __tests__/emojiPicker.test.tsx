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
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { $getRoot, $setSelection } from "lexical";
import { EmojiPicker, insertEmoji, KoenigComposer } from "node-koenig-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

import { searchEmoji } from "../src/additions/emojiPicker/data";
import { mount, typeAtEnd } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openPicker = async (props: Partial<Parameters<typeof EmojiPicker>[0]> = {}) => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <KoenigComposer>
      <EmojiPicker onClose={onClose} onSelect={onSelect} {...props} />
    </KoenigComposer>,
  );
  await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(10));
  return { onClose, onSelect };
};

describe("emoji search", () => {
  const groups = [
    {
      category: "smileys" as const,
      emojis: [
        { emoji: "a", name: "grinning face", slug: "grinning_face" },
        { emoji: "b", name: "face with tears of joy", slug: "face_with_tears_of_joy" },
      ],
    },
    { category: "food" as const, emojis: [{ emoji: "c", name: "red apple", slug: "red_apple" }] },
  ];

  it("matches every word of the query, in any order, ignoring case", () => {
    expect(searchEmoji(groups, "Face TEARS").map((e) => e.emoji)).toEqual(["b"]);
    expect(searchEmoji(groups, "face").map((e) => e.emoji)).toEqual(["a", "b"]);
    expect(searchEmoji(groups, "  ")).toEqual([]);
    expect(searchEmoji(groups, "zzz")).toEqual([]);
  });
});

describe("the emoji picker", () => {
  it("loads the bundled data and lists it with listbox semantics, without any network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await openPicker();
    expect(screen.getByRole("dialog", { name: "Emoji picker" })).toBeTruthy();
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("names every emoji and every group", async () => {
    await openPicker();
    expect(screen.getAllByRole("option")[0]?.getAttribute("aria-label")).toBe("grinning face");
    const groups = screen.getByRole("group", { name: "Emoji groups" });
    expect(groups.querySelectorAll("button")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Flags" })).toBeTruthy();
  });

  it("switches groups", async () => {
    await openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Flags" }));
    await waitFor(() =>
      expect(
        screen.getAllByRole("option").some((o) => /flag/i.test(o.getAttribute("aria-label") ?? "")),
      ).toBe(true),
    );
  });

  it("searches by name across every group", async () => {
    await openPicker();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search emoji" }), {
      target: { value: "grinning face" },
    });
    const names = screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"));
    expect(names).toContain("grinning face");
    expect(names.every((n) => /grinning|face/.test(n ?? ""))).toBe(true);
  });

  it("says when nothing matches", async () => {
    await openPicker();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "qqqzzzxx" } });
    expect(screen.getByText("No emoji found")).toBeTruthy();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("picks the first match with Enter in the search box", async () => {
    const { onSelect } = await openPicker();
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "grinning face" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0]![0].native).toBe(screen.getAllByRole("option")[0]!.textContent);
  });

  it("walks the grid with the arrow keys, Home and End, and picks with Enter", async () => {
    const { onSelect } = await openPicker();
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "ArrowDown" });
    const options = () => screen.getAllByRole("option");
    expect(document.activeElement).toBe(options()[0]);
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    expect(document.activeElement).toBe(options()[1]);
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    expect(document.activeElement).toBe(options()[9]);
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(options()[8]);
    fireEvent.keyDown(document.activeElement as Element, { key: "End" });
    expect(document.activeElement).toBe(options().at(-1));
    fireEvent.keyDown(document.activeElement as Element, { key: "Home" });
    expect(document.activeElement).toBe(options()[0]);
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith({ native: options()[0]!.textContent });
  });

  it("returns from the top row to the search box with ArrowUp", async () => {
    await openPicker();
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  });

  it("closes on Escape from anywhere in it", async () => {
    const { onClose } = await openPicker();
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    fireEvent.keyDown(screen.getAllByRole("option")[0] as Element, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("takes the host's wording", async () => {
    render(
      <KoenigComposer strings={{ emojiPicker: { label: "Emoji", noResults: "Nichts" } }}>
        <EmojiPicker onSelect={vi.fn()} />
      </KoenigComposer>,
    );
    expect(screen.getByRole("dialog", { name: "Emoji" })).toBeTruthy();
  });
});

describe("inserting an emoji into the text", () => {
  it("puts it at the cursor", async () => {
    const { api } = await mount({ editor: {} });
    await typeAtEnd(api, "Hello ");
    let done = false;
    await act(async () => {
      done = insertEmoji(api.editorInstance, "\u{1F600}");
    });
    expect(done).toBe(true);
    const text = api.editorInstance.getEditorState().read(() => $getRoot().getTextContent());
    expect(text).toBe("Hello \u{1F600}");
  });

  it("returns false when there is no text selection to insert at", async () => {
    const { api } = await mount();
    let done = true;
    await act(async () => {
      api.editorInstance.update(() => {
        $setSelection(null);
      });
      done = insertEmoji(api.editorInstance, "\u{1F600}");
    });
    expect(done).toBe(false);
  });
});
