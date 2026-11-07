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
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const paragraph = {
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
};
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const load = async (...cards: unknown[]) =>
  (await mount({ composer: { initialEditorState: doc(paragraph, ...cards, paragraph) } })).api;

const htmlOf = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => $generateHtmlFromNodes(api.editorInstance, null));

const cardOf = (api: KoenigEditorAPI, type: string) =>
  JSON.parse(api.serialize()).root.children.find((node: { type: string }) => node.type === type);

// what a saved page hands back to the editor: the HTML parsed into nodes
const importHtml = async (api: KoenigEditorAPI, html: string, type: string) => {
  await act(async () => {
    api.editorInstance.update(
      () => {
        const dom = new DOMParser().parseFromString(html, "text/html");
        const nodes = $generateNodesFromDOM(api.editorInstance, dom);
        $getRoot()
          .clear()
          .append(...nodes);
      },
      { discrete: true },
    );
  });
  return cardOf(api, type);
};

const callout = (extra: Record<string, unknown> = {}) => ({
  backgroundColor: "green",
  calloutEmoji: "\u{1F4A1}",
  calloutText: "Look here",
  type: "callout",
  version: 1,
  ...extra,
});

describe("callout colours", () => {
  it("keeps a named background as a class, as before", async () => {
    const api = await load(callout());
    const html = htmlOf(api);
    expect(html).toContain("kg-callout-card-green");
    expect(html).not.toContain("background-color");
  });

  it("writes a picked background and text colour as inline style, and reads them back", async () => {
    const api = await load(callout({ backgroundColor: "#112233", textColor: "#ffffff" }));
    const html = htmlOf(api);
    expect(html).toContain("kg-callout-card-custom");
    expect(html).toContain("background-color: #112233");
    expect(html).toContain("color: #ffffff");
    const back = await importHtml(api, html, "callout");
    expect(back?.backgroundColor).toBe("#112233");
    expect(back?.textColor).toBe("#ffffff");
  });

  it("sets both colours from the card's settings with the shared colour control", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card-menu-item='Callout']") as Element);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='callout-color-picker']")).not.toBeNull(),
    );
    const background = document.querySelector(
      "[data-testid='callout-color-picker']",
    ) as HTMLElement;
    const swatch = background.querySelector("[data-kg-color-swatch]") as HTMLElement;
    await act(async () => {
      fireEvent.click(swatch);
    });
    expect(cardOf(api, "callout").backgroundColor).toBe(
      swatch.getAttribute("data-kg-color-swatch"),
    );
    const text = document.querySelector("[data-testid='callout-text-color-picker']") as HTMLElement;
    const input = text.querySelector("[data-kg-color-picker] input") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: "#0000ff" } });
    });
    expect(cardOf(api, "callout").textColor).toBe("#0000ff");
  });

  it("follows the host's palette and limits", async () => {
    const { api } = await mount({
      composer: {
        colors: {
          calloutBackground: { palette: [{ label: "Brand", value: "#FFEEAA" }], picker: false },
        },
      },
    });
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card-menu-item='Callout']") as Element);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-testid='callout-color-picker']")).not.toBeNull(),
    );
    const background = document.querySelector(
      "[data-testid='callout-color-picker']",
    ) as HTMLElement;
    expect(background.querySelectorAll("[data-kg-color-swatch]")).toHaveLength(1);
    expect(background.querySelector("[data-kg-color-picker]")).toBeNull();
  });
});

const header = (extra: Record<string, unknown> = {}) => ({
  alignment: "center",
  backgroundColor: "#000000",
  buttonColor: "#ffffff",
  buttonEnabled: true,
  buttonText: "Read",
  buttonTextColor: "#000000",
  buttonUrl: "https://example.test/",
  header: "Title",
  subheader: "Sub",
  textColor: "#FFFFFF",
  type: "header",
  version: 2,
  ...extra,
});

describe("the header card", () => {
  it("aligns to the right and writes it in the saved HTML", async () => {
    const api = await load(header({ alignment: "right" }));
    const html = htmlOf(api);
    expect(html).toContain("kg-align-right");
    const back = await importHtml(api, html, "header");
    expect(back?.alignment).toBe("right");
  });

  it("shows an emoji, text or both on the button, and reads them back", async () => {
    const api = await load(header({ buttonEmoji: "\u{1F680}" }));
    const html = htmlOf(api);
    expect(html).toContain("\u{1F680} Read");
    const back = await importHtml(api, html, "header");
    expect(back?.buttonEmoji).toBe("\u{1F680}");
    expect(back?.buttonText).toBe("Read");
    const emojiOnly = await load(header({ buttonEmoji: "\u{1F680}", buttonText: "" }));
    expect(htmlOf(emojiOnly)).toContain(">\u{1F680}</a>");
  });

  it("uses the shared colour control for its four colours", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card-menu-item='Header']") as Element);
    });
    await waitFor(() => expect(document.querySelector("[data-kg-settings-panel]")).not.toBeNull());
    await act(async () => {
      fireEvent.click(document.querySelector("[data-header-button-toggle]") as Element);
    });
    const slots = [
      ...document.querySelectorAll("[data-kg-settings-panel] [data-kg-color-control]"),
    ].map((control) => control.getAttribute("data-kg-color-control"));
    expect(slots).toEqual(["headerBackground", "headerText", "headerButton", "headerButtonText"]);
    expect(document.querySelector("[data-header-background-color]")).toBeNull();
    const first = document.querySelector("[data-kg-settings-panel] [data-kg-color-picker] input");
    await act(async () => {
      fireEvent.change(first as Element, { target: { value: "#336699" } });
    });
    expect(cardOf(api, "header").backgroundColor).toBe("#336699");
    await act(async () => {
      fireEvent.click(document.querySelector("[data-header-button-text]") as Element);
    });
  });
});

const button = (extra: Record<string, unknown> = {}) => ({
  alignment: "center",
  buttonText: "Go",
  buttonUrl: "https://example.test/",
  type: "button",
  version: 1,
  ...extra,
});

describe("the button card", () => {
  it("aligns to the right in the saved HTML and reads it back", async () => {
    const api = await load(button({ alignment: "right" }));
    const html = htmlOf(api);
    expect(html).toContain("kg-align-right");
    expect((await importHtml(api, html, "button"))?.alignment).toBe("right");
  });

  it("writes an emoji in the label and its colours as inline style, and reads them back", async () => {
    const api = await load(
      button({ backgroundColor: "#112233", buttonEmoji: "\u{1F680}", textColor: "#fafafa" }),
    );
    const html = htmlOf(api);
    expect(html).toContain("\u{1F680} Go");
    expect(html).toContain("background-color: #112233");
    expect(html).toContain("color: #fafafa");
    const back = await importHtml(api, html, "button");
    expect(back?.buttonEmoji).toBe("\u{1F680}");
    expect(back?.buttonText).toBe("Go");
    expect(back?.backgroundColor).toBe("#112233");
    expect(back?.textColor).toBe("#fafafa");
  });

  it("keeps an unstyled button as it was", async () => {
    const api = await load(button());
    const html = htmlOf(api);
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-button-emoji");
  });
});
