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
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const insertCallout = async (options: Parameters<typeof mount>[0] = {}) => {
  const { api } = await mount(options);
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector("[data-kg-card-menu-item='Callout']") as Element);
  });
  return api;
};

const emojiButton = () => screen.getByTestId("emoji-picker-button");

describe("the callout card's emoji button", () => {
  it("opens the offline picker and sets the chosen emoji", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const api = await insertCallout();
    const before = emojiButton().textContent;
    await act(async () => {
      fireEvent.click(emojiButton());
    });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(10));
    const pick = screen.getAllByRole("option")[5] as HTMLElement;
    const chosen = pick.textContent;
    expect(chosen).not.toBe(before);
    await act(async () => {
      fireEvent.click(pick);
    });
    expect(emojiButton().textContent).toBe(chosen);
    expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull();
    const saved = JSON.stringify(api.serialize());
    expect(saved).toContain(chosen as string);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("closes the picker with Escape", async () => {
    await insertCallout();
    await act(async () => {
      fireEvent.click(emojiButton());
    });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Emoji picker" })).toBeTruthy());
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull());
  });

  it("shows no picker when the host turned the emoji picker off", async () => {
    await insertCallout({ composer: { tools: ["imageEditor"] } });
    await act(async () => {
      fireEvent.click(emojiButton());
    });
    expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull();
  });
});
