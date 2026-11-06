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
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const go = (hash: string) =>
  act(() => {
    window.history.replaceState(null, "", `/${window.location.search}${hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
const start = (url: string) => window.history.replaceState(null, "", url);
const bar = () => document.querySelector("header.bar") as HTMLElement;
const editorPage = () => document.querySelector(".page") as HTMLElement;
const editorText = () =>
  (document.querySelector('[contenteditable="true"]') as HTMLElement | null)?.textContent ?? "";

beforeEach(() => start("/"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("guide page", () => {
  it("is a page of its own at #/guide, with the editor kept out of sight", () => {
    start("/#/guide");
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Koenig editor: the default cards" }),
    ).toBeDefined();
    expect(editorPage().hasAttribute("hidden")).toBe(true);
    expect(within(screen.getByRole("main")).getAllByRole("table")[0]).toBeDefined();
  });

  it("has a contents list that links to every section", () => {
    start("/#/guide");
    render(<App />);
    const toc = screen.getByRole("navigation", { name: "Contents" });
    const links = within(toc).getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(18);
    expect(within(toc).getByRole("link", { name: "Gallery" }).getAttribute("href")).toBe(
      "#/guide/gallery",
    );
    expect(within(toc).getByRole("link", { name: "Word count" }).getAttribute("href")).toBe(
      "#/guide/word-count",
    );
  });

  it("scrolls to the section named in the address", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    start("/#/guide/gallery");
    render(<App />);
    const target = scroll.mock.contexts.find((el) => (el as Element).id === "guide-gallery");
    expect(target).toBeDefined();
  });

  it("goes to a section when its contents link is followed", () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    start("/#/guide");
    render(<App />);
    go("#/guide/table");
    expect(scroll.mock.contexts.some((el) => (el as Element).id === "guide-table")).toBe(true);
  });

  it("has Back to the editor and Print", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    start("/#/guide");
    render(<App />);
    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("link", { name: "Back to the editor" }).getAttribute("href"),
    ).toBe("#/");
    fireEvent.click(within(main).getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledOnce();
  });
});

describe("top bar tabs", () => {
  it("shows which page is open", () => {
    render(<App />);
    const tabs = within(bar()).getByRole("navigation", { name: "Pages" });
    expect(within(tabs).getByRole("link", { name: "Editor" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(tabs).getByRole("link", { name: "Guide" }).getAttribute("href")).toBe("#/guide");
    go("#/guide");
    expect(within(tabs).getByRole("link", { name: "Guide" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      within(tabs).getByRole("link", { name: "Editor" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("keeps only what applies to a reading page on the guide", () => {
    start("/#/guide");
    render(<App />);
    expect(within(bar()).getByRole("switch", { name: "Dark" })).toBeDefined();
    expect(within(bar()).queryByRole("button", { name: "Load the kitchen sink" })).toBeNull();
    expect(within(bar()).queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("has no Help button now that the guide is a page", () => {
    render(<App />);
    expect(within(bar()).queryByRole("button", { name: "Help" })).toBeNull();
  });

  it("keeps the document while the guide is open", () => {
    render(<App />);
    fireEvent.click(within(bar()).getByRole("button", { name: "Load the kitchen sink" }));
    expect(editorText()).toContain("Kitchen sink");
    go("#/guide");
    go("#/");
    expect(editorPage().hasAttribute("hidden")).toBe(false);
    expect(editorText()).toContain("Kitchen sink");
  });
});

describe("Try it", () => {
  it("is a link under each card in the guide", () => {
    start("/#/guide");
    render(<App />);
    const main = screen.getByRole("main");
    expect(main.querySelectorAll("a.try-link")).toHaveLength(15);
    expect(main.querySelector('a.try-link[href="#/try/gallery"]')).not.toBeNull();
  });

  it("opens the editor with that card inserted, and leaves a plain address", () => {
    start("/#/guide");
    render(<App />);
    go("#/try/table");
    expect(editorPage().hasAttribute("hidden")).toBe(false);
    expect(editorText()).toContain("Trying the table");
    expect(document.querySelector('[contenteditable="true"] table')).not.toBeNull();
    expect(window.location.hash).toBe("#/");
  });

  it("switches the card on when the settings had it off", () => {
    start("/?cards=image,divider#/try/callout");
    render(<App />);
    expect(window.location.search).toContain("callout");
    expect(document.querySelector('[data-kg-card="callout"]')).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ignores a card that does not exist", () => {
    start("/#/try/nope");
    render(<App />);
    expect(editorText()).toContain("Try the cards below");
  });
});
