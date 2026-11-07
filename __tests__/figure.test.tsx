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
import { $dfs } from "@lexical/utils";
import { act, cleanup } from "@testing-library/react";
import type { LexicalNode } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { $figureNumber, $figureText, $getFigure, $setFigure } from "../src/additions/figure/figure";
import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const image = (src: string) => ({
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

const load = async (
  serialized = doc(
    paragraph,
    image("https://x.test/a.png"),
    image("https://x.test/b.png"),
    image("https://x.test/c.png"),
  ),
) => (await mount({ composer: { initialEditorState: serialized } })).api;
const $images = () =>
  $dfs()
    .map((entry) => entry.node)
    .filter((node: LexicalNode) => node.getType() === "image");
const update = async (api: KoenigEditorAPI, fn: () => void) => {
  await act(async () => {
    api.editorInstance.update(fn, { discrete: true });
  });
};
const read = <T,>(api: KoenigEditorAPI, fn: () => T) =>
  api.editorInstance.getEditorState().read(fn);

describe("the figure entry", () => {
  it("is empty until set, and reads back what was set", async () => {
    const api = await load();
    expect(read(api, () => $getFigure($images()[0]!))).toBeNull();
    await update(api, () =>
      $setFigure($images()[0]!, { above: true, label: "Figure", numbered: true, title: "Sunrise" }),
    );
    expect(read(api, () => $getFigure($images()[0]!))).toEqual({
      above: true,
      label: "Figure",
      numbered: true,
      title: "Sunrise",
    });
  });

  it("builds the text from label, number and title", async () => {
    const api = await load();
    await update(api, () =>
      $setFigure($images()[0]!, {
        above: false,
        label: "Figure",
        numbered: true,
        title: "Sunrise",
      }),
    );
    expect(read(api, () => $figureText($images()[0]!))).toBe("Figure 1: Sunrise");
  });

  it("numbers figures with the same label in document order and skips unnumbered ones", async () => {
    const api = await load();
    await update(api, () => {
      const [a, b, c] = $images();
      $setFigure(a!, { above: false, label: "Figure", numbered: true, title: "One" });
      $setFigure(b!, { above: false, label: "Figure", numbered: false, title: "Two" });
      $setFigure(c!, { above: false, label: "Figure", numbered: true, title: "Three" });
    });
    expect(read(api, () => $figureNumber($images()[0]!))).toBe(1);
    expect(read(api, () => $figureText($images()[1]!))).toBe("Figure: Two");
    expect(read(api, () => $figureNumber($images()[2]!))).toBe(2);
    expect(read(api, () => $figureText($images()[2]!))).toBe("Figure 2: Three");
  });

  it("keeps separate counts per label", async () => {
    const api = await load();
    await update(api, () => {
      const [a, b, c] = $images();
      $setFigure(a!, { above: false, label: "Figure", numbered: true, title: "" });
      $setFigure(b!, { above: false, label: "Chart", numbered: true, title: "" });
      $setFigure(c!, { above: false, label: "Figure", numbered: true, title: "" });
    });
    expect(read(api, () => $figureText($images()[1]!))).toBe("Chart 1");
    expect(read(api, () => $figureText($images()[2]!))).toBe("Figure 2");
  });

  it("is just the title when there is no label, and nothing when there is neither", async () => {
    const api = await load();
    await update(api, () =>
      $setFigure($images()[0]!, { above: false, label: "", numbered: true, title: "Plain" }),
    );
    expect(read(api, () => $figureText($images()[0]!))).toBe("Plain");
    await update(api, () =>
      $setFigure($images()[0]!, { above: false, label: "", numbered: true, title: "" }),
    );
    expect(read(api, () => $figureText($images()[0]!))).toBe("");
  });

  it("is removed with null", async () => {
    const api = await load();
    await update(api, () =>
      $setFigure($images()[0]!, { above: false, label: "Figure", numbered: true, title: "x" }),
    );
    await update(api, () => $setFigure($images()[0]!, null));
    expect(read(api, () => $getFigure($images()[0]!))).toBeNull();
  });

  it("is saved in the document and comes back when it is loaded again", async () => {
    const api = await load();
    await update(api, () =>
      $setFigure($images()[1]!, { above: true, label: "Figure", numbered: true, title: "Kept" }),
    );
    const saved = api.serialize();
    expect(saved).toContain("Kept");
    cleanup();
    const again = await load(saved);
    expect(read(again, () => $figureText($images()[1]!))).toBe("Figure 1: Kept");
    expect(read(again, () => $getFigure($images()[1]!)?.above)).toBe(true);
  });
});
