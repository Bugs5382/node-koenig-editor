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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $createNodeSelection, $getRoot, $setSelection } from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseVideoNode } from "../src/kg-default-nodes/nodes/video/video-parser";
import { renderVideoNode } from "../src/kg-default-nodes/nodes/video/video-renderer";
import { mediaDocument } from "./__utils__/mediaDocument";
import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const load = async (api: Api, overrides: Record<string, unknown> = {}) => {
  const state = api.editorInstance.parseEditorState(mediaDocument("video", overrides));
  await act(async () => {
    api.editorInstance.setEditorState(state);
  });
  await waitFor(() => expect(document.querySelector("video")).not.toBeNull());
};

const select = async (api: Api) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const card = $getRoot()
        .getChildren()
        .find((child) => child.getType() === "video")!;
      const selection = $createNodeSelection();
      selection.add(card.getKey());
      $setSelection(selection);
    });
  });
};

const savedVideo = (api: Api) =>
  (api.editorInstance.getEditorState().toJSON().root.children as { type: string }[]).find(
    (child) => child.type === "video",
  ) as Record<string, unknown>;

const withDoc = { createDocument: () => document.implementation.createHTMLDocument() } as never;
const base = { caption: "", cardWidth: "regular", height: null, src: "/a.mp4", width: null };

describe("the video card's poster", () => {
  it("draws the poster before play, in the exported HTML", () => {
    const out = renderVideoNode({ ...base, poster: "/content/images/p.png" }, withDoc)
      .element as HTMLElement;
    expect(out.querySelector("video")?.getAttribute("poster")).toBe("/content/images/p.png");
  });

  it("has no poster attribute when none is set, and drops an unsafe one", () => {
    const none = renderVideoNode(base, withDoc).element as HTMLElement;
    expect(none.querySelector("video")?.hasAttribute("poster")).toBe(false);
    const bad = renderVideoNode({ ...base, poster: "javascript:alert(1)" }, withDoc)
      .element as HTMLElement;
    expect(bad.outerHTML).not.toContain("javascript:");
    expect(bad.querySelector("video")?.hasAttribute("poster")).toBe(false);
  });

  it("reads the poster back from exported HTML", () => {
    const Node = vi.fn(function (this: Record<string, unknown>, data: Record<string, unknown>) {
      Object.assign(this, data);
    }) as never;
    const figure = document.createElement("figure");
    figure.className = "kg-card kg-video-card";
    figure.innerHTML = '<video src="/a.mp4" poster="/p.png" controls></video>';
    const conversion = (
      parseVideoNode(Node).figure(figure) as { conversion: (e: HTMLElement) => { node: unknown } }
    ).conversion(figure);
    expect(conversion.node).toMatchObject({ poster: "/p.png" });
  });

  it("round trips: the poster is kept, and an old card has none", async () => {
    const one = await mount();
    await load(one.api, { poster: "https://example.com/p.png" });
    expect(savedVideo(one.api)).toMatchObject({ poster: "https://example.com/p.png" });
    expect(document.querySelector("video")?.getAttribute("poster")).toBe(
      "https://example.com/p.png",
    );
    cleanup();
    const two = await mount();
    await load(two.api);
    expect(savedVideo(two.api)).toMatchObject({ poster: "" });
    expect(document.querySelector("video")?.hasAttribute("poster")).toBe(false);
  });

  it("is a field in the card's settings when the card is selected", async () => {
    const { api } = await mount();
    await load(api);
    expect(document.querySelector('[data-kg-media-field="poster"]')).toBeNull();
    await select(api);
    const field = (await waitFor(() => {
      const found = document.querySelector('[data-kg-media-field="poster"]');
      expect(found).not.toBeNull();
      return found;
    })) as HTMLInputElement;
    expect(field.getAttribute("aria-label")).toBe("Poster image address");
    await act(async () => {
      fireEvent.change(field, { target: { value: "https://example.com/new.png" } });
    });
    expect(savedVideo(api)).toMatchObject({ poster: "https://example.com/new.png" });
    expect(document.querySelector("video")?.getAttribute("poster")).toBe(
      "https://example.com/new.png",
    );
  });

  it("does not take an unsafe address", async () => {
    const { api } = await mount();
    await load(api);
    await select(api);
    const field = (await waitFor(() =>
      document.querySelector('[data-kg-media-field="poster"]'),
    )) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(field, { target: { value: "javascript:alert(1)" } });
    });
    expect(document.querySelector("video")?.hasAttribute("poster")).toBe(false);
    expect(document.querySelector("[data-kg-poster-error]")).not.toBeNull();
  });

  it("uploads a picture through the host's image uploader and removes it again", async () => {
    const upload = vi.fn(async () => [{ url: "https://cdn.example.com/poster.png" }]);
    const requested: string[] = [];
    const { api } = await mount({
      composer: {
        fileUploader: {
          useFileUpload: (type: string) => {
            requested.push(type);
            return { errors: [], isLoading: false, progress: 0, upload };
          },
        } as never,
      },
    });
    await load(api);
    await select(api);
    const input = (await waitFor(() =>
      document.querySelector('input[name="poster-input"]'),
    )) as HTMLInputElement;
    expect(requested).toContain("image");
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "p.png", { type: "image/png" })] },
      });
    });
    await waitFor(() =>
      expect(savedVideo(api)).toMatchObject({ poster: "https://cdn.example.com/poster.png" }),
    );
    const remove = document.querySelector("[data-kg-poster-remove]") as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(remove);
    });
    expect(savedVideo(api)).toMatchObject({ poster: "" });
  });
});
