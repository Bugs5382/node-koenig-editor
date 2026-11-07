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

import { endsWithEmojiCommand } from "../src/additions/emojiPicker/EmojiCommandPlugin";
import { documentOf, menuLabels, mount, openSlashMenu, typeAtEnd } from "./__utils__/mount";

afterEach(() => cleanup());

describe("the /emoji command", () => {
  it("recognises the command at the start of a word only", () => {
    expect(endsWithEmojiCommand("/emoji")).toBe(true);
    expect(endsWithEmojiCommand("Hello /emoji")).toBe(true);
    expect(endsWithEmojiCommand("http://x.test/emoji")).toBe(false);
    expect(endsWithEmojiCommand("Hello /emoj")).toBe(false);
  });

  it("opens the picker inside a sentence and replaces the typed command with the emoji", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await typeAtEnd(api, " /emoji");
    const options = await screen.findAllByRole("option");
    const chosen = options[3]?.textContent as string;
    await act(async () => {
      fireEvent.click(options[3] as Element);
    });
    const saved = JSON.stringify(api.serialize());
    expect(saved).toContain(chosen);
    expect(saved).not.toContain("/emoji");
    expect(saved).toContain("Hello");
    expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull();
  });

  it("leaves the text as typed when the picker is closed with Escape", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    await typeAtEnd(api, " /emoji");
    await screen.findAllByRole("option");
    await act(async () => {
      fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull());
    expect(JSON.stringify(api.serialize())).toContain("Hello /emoji");
  });

  it("is a menu entry of the slash menu, and the entry opens the picker", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Emoji");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card-menu-item='Emoji']") as Element);
    });
    const options = await screen.findAllByRole("option");
    const chosen = options[2]?.textContent as string;
    await act(async () => {
      fireEvent.click(options[2] as Element);
    });
    expect(JSON.stringify(api.serialize())).toContain(chosen);
  });

  it("is off, entry and command, when the emoji picker tool is off", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), tools: ["imageEditor"] },
    });
    await typeAtEnd(api, " /emoji");
    expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull();
    await act(async () => {
      api.editorInstance.update(() => {});
    });
    expect(menuLabels()).not.toContain("Emoji");
  });
});
