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
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

const load = async (composer: Record<string, unknown> = {}) =>
  (await mount({ composer: { initialEditorState: documentOf("Hello"), ...composer } })).api;

const press = async (root: Element, init: KeyboardEventInit) => {
  await act(async () => {
    fireEvent.keyDown(root, init);
  });
};
const SLASH = { code: "Slash", ctrlKey: true, key: "/" };

describe("the keyboard shortcuts list", () => {
  it("opens with Ctrl or Cmd+slash, named for a screen reader", async () => {
    const api = await load();
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
  });

  it("lists the shortcuts in groups, each with its keys", async () => {
    const api = await load();
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    const dialog = screen.getByRole("dialog");
    const rows = [...dialog.querySelectorAll("[data-kg-shortcut]")] as HTMLElement[];
    const row = (id: string) => rows.find((r) => r.dataset.kgShortcut === id);
    expect(row("bold")?.textContent).toContain("Bold");
    expect(row("bold")?.textContent).toMatch(/Ctrl|⌘/);
    expect(row("strikethrough")?.textContent).toContain("Strikethrough");
    expect(row("toolbar")?.textContent).toContain("Alt");
    expect(row("shortcuts")).toBeTruthy();
    expect(dialog.querySelectorAll("h3, [role='heading']").length).toBeGreaterThan(2);
  });

  it("leaves out the shortcut of a button the host's toolbar option leaves out", async () => {
    const api = await load({ toolbar: ["bold", "italic"] });
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    const ids = [...screen.getByRole("dialog").querySelectorAll("[data-kg-shortcut]")].map(
      (r) => (r as HTMLElement).dataset.kgShortcut,
    );
    expect(ids).toContain("bold");
    expect(ids).not.toContain("strikethrough");
    expect(ids).not.toContain("alignLeft");
  });

  it("closes with Escape and puts focus back in the text", async () => {
    const api = await load();
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    await press(document.activeElement as Element, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(api.editorInstance.getRootElement()));
  });

  it("closes with its button", async () => {
    const api = await load();
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is off when the host's tools option leaves it out", async () => {
    const api = await load({ tools: ["preview"] });
    await press(api.editorInstance.getRootElement() as Element, SLASH);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
