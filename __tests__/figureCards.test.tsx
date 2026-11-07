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
import { $generateHtmlFromNodes } from "@lexical/html";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

beforeAll(() => {
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

const image = (src: string, extra: Record<string, unknown> = {}) => ({
  alt: "",
  caption: "",
  cardWidth: "regular",
  height: 100,
  href: "",
  src,
  title: "",
  type: "image",
  version: 1,
  width: 100,
  ...extra,
});
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
const cardAt = (n: number) => document.querySelectorAll('[data-kg-card="image"]')[n] as HTMLElement;
const select = async (n: number) => {
  await act(async () => {
    fireEvent.click(cardAt(n).querySelector("img") as Element);
  });
};
const fillFigure = async (label: string, title: string, position?: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: label } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: title } });
    if (position)
      fireEvent.change(screen.getByLabelText("Position"), { target: { value: position } });
  });
  await act(async () => {
    fireEvent.click(document.querySelector("[data-kg-figure-done]") as Element);
  });
};
const htmlOf = (api: KoenigEditorAPI) =>
  new DOMParser().parseFromString(
    api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null)),
    "text/html",
  );

describe("the figure entry on an image card", () => {
  it("is offered when the card is selected and shown under the picture once set", async () => {
    const api = await load(image("https://x.test/a.png"));
    expect(document.querySelector("[data-kg-figure-open]")).toBeNull();
    await select(0);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-figure-open]") as Element);
    });
    await fillFigure("Figure", "Sunrise");
    const line = document.querySelector("[data-kg-figure-line]") as HTMLElement;
    expect(line.textContent).toBe("Figure 1: Sunrise");
    expect(line.getAttribute("data-kg-figure-line")).toBe("below");
    expect(api.serialize()).toContain("Sunrise");
  });

  it("numbers pictures in reading order", async () => {
    await load(image("https://x.test/a.png"), image("https://x.test/b.png"));
    await select(1);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-figure-open]") as Element);
    });
    await fillFigure("Figure", "Second");
    expect(document.querySelector("[data-kg-figure-line]")?.textContent).toBe("Figure 1: Second");
    await select(0);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-figure-open]") as Element);
    });
    await fillFigure("Figure", "First");
    const lines = [...document.querySelectorAll("[data-kg-figure-line]")].map((l) => l.textContent);
    expect(lines).toEqual(["Figure 1: First", "Figure 2: Second"]);
  });

  it("can sit above the picture", async () => {
    await load(image("https://x.test/a.png"));
    await select(0);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-figure-open]") as Element);
    });
    await fillFigure("Figure", "Top", "above");
    expect(
      document.querySelector("[data-kg-figure-line]")?.getAttribute("data-kg-figure-line"),
    ).toBe("above");
  });

  it("is carried to the saved HTML as a figcaption", async () => {
    const api = await load(
      image("https://x.test/a.png", {
        figure: { above: false, label: "Figure", numbered: true, title: "Sunrise" },
      }),
    );
    const dom = htmlOf(api);
    expect(dom.querySelector("figure figcaption")?.textContent).toContain("Figure 1: Sunrise");
  });

  it("stays visible in the reader's view but cannot be edited there", async () => {
    const api = await load(
      image("https://x.test/a.png", {
        figure: { above: false, label: "Figure", numbered: true, title: "Sunrise" },
      }),
    );
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    await select(0);
    expect(document.querySelector("[data-kg-figure-line]")?.textContent).toBe("Figure 1: Sunrise");
    expect(document.querySelector("[data-kg-figure-open]")).toBeNull();
  });
});
