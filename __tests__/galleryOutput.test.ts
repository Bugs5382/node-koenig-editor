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
import { cleanup } from "@testing-library/react";
import { $getRoot } from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const image = (name: string, extra: Record<string, unknown> = {}) => ({
  alt: name,
  fileName: `${name}.jpg`,
  height: 300,
  row: 0,
  src: `https://example.com/${name}.jpg`,
  width: 400,
  ...extra,
});

const documentWith = (images: unknown[], caption = "") =>
  JSON.stringify({
    root: {
      children: [{ caption, images, type: "gallery", version: 1 }],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

/** The gallery as the HTML output writes it. */
const render = async (images: unknown[], caption = "") => {
  const { api } = await mount({ composer: { initialEditorState: documentWith(images, caption) } });
  const editor = api.editorInstance;
  const html = editor.getEditorState().read(() => $generateHtmlFromNodes(editor, null));
  const holder = document.createElement("div");
  holder.innerHTML = html;
  return holder.querySelector("figure.kg-gallery-card") as HTMLElement;
};

describe("a gallery's per-image title and caption in the output", () => {
  it("prints them under the image, inside the image's own block", async () => {
    const figure = await render([
      image("one", { caption: "A &amp; B", title: "Alpha" }),
      image("two"),
    ]);
    const first = figure.querySelectorAll(".kg-gallery-image")[0] as HTMLElement;
    expect([...first.children].map((child) => child.tagName)).toEqual(["IMG", "DIV"]);
    const text = first.querySelector(".kg-gallery-image-text") as HTMLElement;
    expect(text.querySelector(".kg-gallery-image-title")?.textContent).toBe("Alpha");
    expect(text.querySelector(".kg-gallery-image-caption")?.textContent).toBe("A & B");
  });

  it("adds nothing for an image with no title or caption", async () => {
    const figure = await render([image("one"), image("two")]);
    expect(figure.querySelector(".kg-gallery-image-text")).toBeNull();
  });

  it("writes the text as text, never as markup", async () => {
    const figure = await render([
      image("one", { caption: "&lt;img src=x onerror=alert(1)&gt;", title: "&lt;script&gt;" }),
    ]);
    expect(figure.querySelector("script")).toBeNull();
    expect(figure.querySelector(".kg-gallery-image-text img")).toBeNull();
    expect(figure.querySelector(".kg-gallery-image-title")?.textContent).toBe("<script>");
  });

  it("does not use figcaption for the image text, so the gallery caption stays its own", async () => {
    const figure = await render(
      [image("one", { caption: "Image caption", title: "T" })],
      "Gallery caption",
    );
    const figcaptions = figure.querySelectorAll("figcaption");
    expect(figcaptions).toHaveLength(1);
    expect(figcaptions[0]?.textContent).toBe("Gallery caption");
  });
});

describe("reading the output back", () => {
  const roundTrip = async (images: unknown[], caption = "") => {
    const figure = await render(images, caption);
    const { api } = await mount();
    const editor = api.editorInstance;
    const doc = new DOMParser().parseFromString(figure.outerHTML, "text/html");
    editor.update(
      () => {
        $getRoot().clear();
        $getRoot().append(...$generateNodesFromDOM(editor, doc));
      },
      { discrete: true },
    );
    const galleries = JSON.parse(api.serialize()).root.children.filter(
      (node: { type: string }) => node.type === "gallery",
    );
    return galleries[0] as {
      caption?: string;
      images: { caption?: string; title?: string }[];
    };
  };

  it("round-trips the title and caption of each image", async () => {
    const payload = await roundTrip(
      [
        image("one", { caption: "A &amp; B", title: "Alpha" }),
        image("two"),
        image("three", { title: "Gamma" }),
      ],
      "Gallery caption",
    );
    expect(payload.caption).toContain("Gallery caption");
    expect(payload.images[0]).toMatchObject({ caption: "A &amp; B", title: "Alpha" });
    expect(payload.images[1]?.caption ?? "").toBe("");
    expect(payload.images[1]?.title ?? "").toBe("");
    expect(payload.images[2]).toMatchObject({ title: "Gamma" });
  });

  it("does not turn an image's caption into the gallery's caption", async () => {
    const payload = await roundTrip([image("one", { caption: "Only on the image" })]);
    expect(payload.caption ?? "").toBe("");
  });
});
