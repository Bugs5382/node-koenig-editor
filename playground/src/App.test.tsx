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
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

const snippet = () => document.querySelector("pre.code")?.textContent ?? "";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  window.localStorage.removeItem("koenig-demo-panel");
});
afterEach(cleanup);

describe("playground", () => {
  it("shows the editor, the settings and the code for the defaults", () => {
    render(<App />);
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
    expect(screen.getByLabelText("callout")).toBeDefined();
    expect(snippet()).toContain("<KoenigComposer");
    expect(snippet()).not.toContain("cards=");
    expect(document.querySelector("header.bar")).not.toBeNull();
  });

  it("rebuilds with the card off, updates the code and puts it in the address", () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("callout"));
    expect((screen.getByLabelText("callout") as HTMLInputElement).checked).toBe(false);
    expect(snippet()).toContain("cards={[");
    expect(snippet()).not.toContain('"callout"');
    expect(window.location.search).toContain("cards=");
    expect(window.location.search).not.toContain("callout");
  });

  it("starts from the setup in the address", () => {
    window.history.replaceState(null, "", "/?comments=0&readOnly=1&size=20");
    render(<App />);
    expect(screen.getByText("Comments are off.")).toBeDefined();
    expect(snippet()).toContain("editable={false}");
    expect(snippet()).not.toContain("comments=");
    expect(document.documentElement.style.fontSize).toBe("20px");
  });

  it("goes back to the defaults with Reset", () => {
    window.history.replaceState(null, "", "/?comments=0");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Reset" }));
    expect(window.location.search).toBe("");
    expect(snippet()).toContain("comments={comments}");
  });

  it("Reset brings back the quick brown fox text and Clear leaves an empty document", () => {
    render(<App />);
    const text = () =>
      (document.querySelector('[contenteditable="true"]') as HTMLElement).textContent;
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Clear" }));
    expect(text()).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Reset" }));
    expect(text()).toBe("The quick brown fox jumps over the lazy dog");
  });

  it("starts with a header and a gallery made of the sample pictures", () => {
    render(<App />);
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor.querySelectorAll('img[src*="/samples/"]').length).toBeGreaterThanOrEqual(9);
  });

  it("Load sample images adds another gallery at the end", async () => {
    render(<App />);
    const count = () => document.querySelectorAll('[data-kg-card="gallery"]').length;
    const before = count();
    fireEvent.click(screen.getByRole("button", { name: "Load sample images" }));
    await waitFor(() => expect(count()).toBe(before + 1));
  });

  it("adds one sample as an image card when its thumbnail is clicked", async () => {
    render(<App />);
    const count = () => document.querySelectorAll('[data-kg-card="image"]').length;
    const before = count();
    fireEvent.click(screen.getByTitle(/Add sample 3 /));
    await waitFor(() => expect(count()).toBe(before + 1));
  });

  it("drops the gallery and the header from the document when their cards go off", () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("gallery"));
    fireEvent.click(screen.getByLabelText("header"));
    expect(document.querySelectorAll('[data-kg-card="gallery"]')).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Load sample images" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("sample images for uploads")).toBeDefined();
  });
});

describe("the side panel", () => {
  const aside = () => document.querySelector("aside") as HTMLElement;
  const page = () => document.querySelector(".page") as HTMLElement;

  it("is shown at first, with a button to hide it", () => {
    render(<App />);
    expect(aside().hidden).toBe(false);
    const toggle = screen.getByRole("button", { name: "Hide side panel" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(page().classList.contains("panel-hidden")).toBe(false);
  });

  it("hides, so the editor takes the whole width, and brings it back", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hide side panel" }));
    expect(aside().hidden).toBe(true);
    expect(page().classList.contains("panel-hidden")).toBe(true);
    const toggle = screen.getByRole("button", { name: "Show side panel" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // the editor is still there
    expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
    fireEvent.click(toggle);
    expect(aside().hidden).toBe(false);
    expect(page().classList.contains("panel-hidden")).toBe(false);
  });

  it("remembers the choice for the next visit", () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hide side panel" }));
    expect(window.localStorage.getItem("koenig-demo-panel")).toBe("hidden");
    first.unmount();
    render(<App />);
    expect(aside().hidden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Show side panel" }));
    expect(window.localStorage.getItem("koenig-demo-panel")).toBe("shown");
  });

  it("keeps the settings working while the panel is hidden", () => {
    window.localStorage.setItem("koenig-demo-panel", "hidden");
    window.history.replaceState(null, "", "/?comments=0");
    render(<App />);
    expect(snippet()).not.toContain("comments=");
    expect(aside().hidden).toBe(true);
  });
});
