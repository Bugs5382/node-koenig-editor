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
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

beforeEach(() => window.history.replaceState(null, "", "/"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const openHelp = () => {
  const button = screen.getByRole("button", { name: "Help" });
  button.focus();
  fireEvent.click(button);
  return button;
};

describe("help sheet", () => {
  it("is closed until the Help button is pressed", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
    openHelp();
    expect(screen.getByRole("dialog", { name: "Help: the default cards" })).toBeDefined();
  });

  it("shows the guide, rendered: a title, the quick-reference table and a section per card", () => {
    render(<App />);
    openHelp();
    const sheet = screen.getByRole("dialog");
    expect(
      within(sheet).getByRole("heading", { level: 1, name: "Koenig editor: the default cards" }),
    ).toBeDefined();
    const table = within(sheet).getAllByRole("table")[0] as HTMLElement;
    expect(within(table).getAllByRole("row")).toHaveLength(13); // header row and twelve cards
    for (const name of ["Gallery", "Video", "Markdown", "Word count"]) {
      expect(within(sheet).getByRole("heading", { level: 2, name })).toBeDefined();
    }
  });

  it("never runs HTML from the guide", () => {
    render(<App />);
    openHelp();
    expect(document.querySelector(".sheet script, .sheet iframe")).toBeNull();
  });

  it("closes with Escape, the Close button and a press on the backdrop, and gives focus back", () => {
    render(<App />);
    const button = openHelp();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close help" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);

    openHelp();
    fireEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    openHelp();
    fireEvent.mouseDown(document.querySelector(".sheet-backdrop") as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Tab inside the sheet", () => {
    render(<App />);
    openHelp();
    const sheet = screen.getByRole("dialog");
    const buttons = within(sheet).getAllByRole("button");
    const last = buttons[buttons.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(sheet.contains(document.activeElement)).toBe(true);
    (buttons[0] as HTMLElement).focus();
    fireEvent.keyDown(buttons[0] as HTMLElement, { key: "Tab", shiftKey: true });
    expect(sheet.contains(document.activeElement)).toBe(true);
  });

  it("prints", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<App />);
    openHelp();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledOnce();
  });
});
