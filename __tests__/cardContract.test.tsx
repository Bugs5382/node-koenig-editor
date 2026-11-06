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
import {
  KoenigGalleryCard,
  KoenigHeaderCard,
  type KoenigGalleryRenderProps,
  type KoenigHeaderRenderProps,
} from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const photo = (index: number, extra: Record<string, unknown> = {}) => ({
  alt: `alt ${index}`,
  caption: "",
  fileName: `p${index}.gif`,
  height: 300,
  row: 0,
  src: `${PIXEL}#${index}`,
  title: "",
  width: 400,
  ...extra,
});

const document_ = (...cards: unknown[]) =>
  JSON.stringify({
    root: {
      children: [
        { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
        ...cards,
        { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const gallery = (images: unknown[], extra: Record<string, unknown> = {}) => ({
  caption: "",
  images,
  type: "gallery",
  version: 1,
  ...extra,
});
const header = (extra: Record<string, unknown> = {}) => ({
  buttonEnabled: false,
  header: "Welcome",
  subheader: "Hello",
  type: "header",
  version: 1,
  ...extra,
});

const galleryOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "gallery");
const headerOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "header");

describe("what a custom gallery component receives", () => {
  const capture = async (
    composer: NonNullable<Parameters<typeof mount>[0]>["composer"] = {},
    images = [photo(0, { caption: "A &amp; B", title: "T &lt;1&gt;" }), photo(1)],
  ) => {
    let seen: KoenigGalleryRenderProps | undefined;
    const Replacement = (props: KoenigGalleryRenderProps) => {
      seen = props;
      return <div data-custom-gallery />;
    };
    const mounted = await mount({
      composer: {
        cardRenderers: { gallery: Replacement },
        initialEditorState: document_(gallery(images)),
        ...composer,
      },
    });
    return { ...mounted, props: () => seen as KoenigGalleryRenderProps };
  };

  it("gives each image its alt text, title and caption as plain text", async () => {
    const { props } = await capture();
    expect(props().images[0]).toMatchObject({ alt: "alt 0", caption: "A & B", title: "T <1>" });
    expect(props().images[1]).toMatchObject({ alt: "alt 1", caption: "", title: "" });
  });

  it("gives the settings: the card's limit, the host's ceiling and the accepted types", async () => {
    const { props } = await capture({ gallery: { maxImages: 20 } });
    expect(props().maxImages).toBe(20);
    expect(props().hostMaxImages).toBe(20);
    expect(props().mimeTypes).toEqual([]);
  });

  it("tells it whether the gallery is selected and whether the editor is read-only", async () => {
    const { props } = await capture();
    expect(props().isSelected).toBe(false);
    expect(props().readOnly).toBe(false);
    cleanup();
    const readOnly = await capture({ editable: false });
    expect(readOnly.props().readOnly).toBe(true);
  });

  it("saves a title and caption typed as plain text, and escapes them in the card", async () => {
    const { api, props } = await capture();
    await act(async () => {
      props().updateImage(1, { alt: "New alt", caption: "Fish & chips", title: "<b>" });
    });
    expect(galleryOf(api.serialize()).images[1]).toMatchObject({
      alt: "New alt",
      caption: "Fish &amp; chips",
      title: "&lt;b&gt;",
    });
  });

  it("replaces the whole list, for a custom drag and drop", async () => {
    const { api, props } = await capture();
    await act(async () => {
      props().replaceImages([...props().images].reverse());
    });
    expect(
      galleryOf(api.serialize()).images.map((image: { fileName: string }) => image.fileName),
    ).toEqual(["p1.gif", "p0.gif"]);
    // text typed in plain stays plain in the card's own escaped form
    expect(galleryOf(api.serialize()).images[1].caption).toBe("A &amp; B");
  });

  it("sets the card's own limit within the host's ceiling", async () => {
    const { api, props } = await capture({ gallery: { maxImages: 10 } });
    await act(async () => {
      props().setMaxImages(4);
    });
    expect(galleryOf(api.serialize()).maxImages).toBe(4);
    await act(async () => {
      props().setMaxImages(40);
    });
    expect(galleryOf(api.serialize()).maxImages).toBe(10);
  });

  it("moves and removes images", async () => {
    const { api, props } = await capture();
    await act(async () => {
      props().moveImage(0, 1);
    });
    expect(galleryOf(api.serialize()).images[0].fileName).toBe("p1.gif");
    await act(async () => {
      props().removeImage(0);
    });
    expect(galleryOf(api.serialize()).images).toHaveLength(1);
  });
});

describe("wrapping the default gallery", () => {
  // This is the README's example.
  const WithDownloadLink = (props: KoenigGalleryRenderProps) => (
    <div data-with-link>
      <KoenigGalleryCard {...props} />
      {props.readOnly ? <a href="#all">Download all {props.images.length} photos</a> : null}
    </div>
  );

  it("draws the default gallery inside the host's own element", async () => {
    await mount({
      composer: {
        cardRenderers: { gallery: WithDownloadLink },
        editable: false,
        initialEditorState: document_(gallery([photo(0), photo(1), photo(2)])),
      },
    });
    const wrapper = document.querySelector("[data-with-link]") as HTMLElement;
    expect(wrapper.querySelector("[data-gallery]")).not.toBeNull();
    expect(wrapper.querySelectorAll("[data-gallery] [data-image]")).toHaveLength(3);
    expect(wrapper.querySelector("a")?.textContent).toBe("Download all 3 photos");
    expect(wrapper.querySelector("[data-gallery-fullscreen]")).not.toBeNull();
  });

  it("keeps the default gallery's editing working when wrapped", async () => {
    const { api } = await mount({
      composer: {
        cardRenderers: { gallery: WithDownloadLink },
        initialEditorState: document_(gallery([photo(0), photo(1)])),
      },
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery] [data-image] img") as Element);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-gallery-image-text-edit]")).not.toBeNull(),
    );
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-image-text-edit]") as Element);
    });
    const box = document.querySelector('[role="dialog"]') as HTMLElement;
    await act(async () => {
      fireEvent.change(box.querySelector("[data-gallery-text-title]") as Element, {
        target: { value: "Wrapped" },
      });
      fireEvent.click(box.querySelector("[data-gallery-text-save]") as Element);
    });
    expect(galleryOf(api.serialize()).images[0].title).toBe("Wrapped");
  });
});

describe("what a custom header component receives, and wrapping the default", () => {
  it("gives the placed title and subtitle fields, the settings and the read-only state", async () => {
    let seen: KoenigHeaderRenderProps | undefined;
    const Replacement = (props: KoenigHeaderRenderProps) => {
      seen = props;
      return <div data-custom-header>{props.titleField}</div>;
    };
    await mount({
      composer: { cardRenderers: { header: Replacement }, initialEditorState: document_(header()) },
    });
    expect(seen?.title).toBe("Welcome");
    expect(seen?.subtitle).toBe("Hello");
    expect(seen?.titleField).toBeDefined();
    expect(seen?.subtitleField).toBeDefined();
    expect(seen?.readOnly).toBe(false);
    expect(typeof seen?.update).toBe("function");
  });

  it("draws the default header inside the host's element", async () => {
    const WithBanner = (props: KoenigHeaderRenderProps) => (
      <div data-with-banner>
        <KoenigHeaderCard {...props} />
      </div>
    );
    const { api } = await mount({
      composer: {
        cardRenderers: { header: WithBanner },
        initialEditorState: document_(header()),
      },
    });
    const wrapper = document.querySelector("[data-with-banner]") as HTMLElement;
    expect(wrapper.querySelector('[data-testid="header-card"]')).not.toBeNull();
    expect(wrapper.querySelector("[data-header-title]")).not.toBeNull();
    expect(headerOf(api.serialize()).header).toContain("Welcome");
  });

  it("shows no settings to a read-only viewer", async () => {
    await mount({
      composer: { editable: false, initialEditorState: document_(header()) },
    });
    expect(document.querySelector('[data-testid="header-card"]')).not.toBeNull();
    expect(document.querySelector("[data-kg-settings-panel]")).toBeNull();
  });
});
