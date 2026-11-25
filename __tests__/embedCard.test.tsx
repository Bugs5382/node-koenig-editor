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
import { $createNodeSelection, $getRoot, $setSelection, KEY_ENTER_COMMAND } from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const ID = "dQw4w9WgXcQ";
const YOUTUBE = `https://www.youtube.com/watch?v=${ID}`;

const documentWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
const embedNode = (url: string, title = "", id?: string) => ({
  type: "embed",
  version: 1,
  url,
  title,
  ...(id ? { $: { id } } : {}),
});

const saved = (api: Api) =>
  (api.editorInstance.getEditorState().toJSON().root.children as Record<string, unknown>[]).filter(
    (child) => child.type === "embed",
  );

const one = (selector: string) => document.querySelector(selector) as HTMLElement | null;

const insertEmbed = async (composer: Parameters<typeof mount>[0] = {}) => {
  const result = await mount({
    ...composer,
    composer: { cards: ["image", "embed"], ...composer?.composer },
  });
  await openSlashMenu(result.api);
  await act(async () => {
    fireEvent.click(one('[data-kg-card-menu-item="Embed"]') as Element);
  });
  await waitFor(() => expect(one("[data-kg-embed-url]")).not.toBeNull());
  return result;
};

const submit = async (value: string) => {
  const input = one("[data-kg-embed-url]") as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
  await act(async () => {
    fireEvent.click(one("[data-kg-embed-submit]") as Element);
  });
};

const select = async (api: Api) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const card = $getRoot()
        .getChildren()
        .find((child) => child.getType() === "embed")!;
      const selection = $createNodeSelection();
      selection.add(card.getKey());
      $setSelection(selection);
    });
  });
};

describe("the embed card is off by default", () => {
  it("is not in the menus unless cards names it", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    expect(labels).not.toContain("Embed");
    cleanup();
    const on = await mount({ composer: { cards: ["image", "embed"] } });
    expect(await openSlashMenu(on.api)).toContain("Embed");
  });

  it("an embed saved in a document still opens, but plays nothing and loads nothing", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(embedNode(YOUTUBE, "A talk", "aaaa")) },
    });
    expect(saved(api)).toHaveLength(1);
    expect(one("iframe")).toBeNull();
    expect(one("[data-kg-embed-play]")).toBeNull();
    expect(saved(api)[0]).toMatchObject({ url: YOUTUBE, title: "A talk", $: { id: "aaaa" } });
  });
});

describe("adding a link", () => {
  it("asks for a link first, with the sites it takes", async () => {
    await insertEmbed();
    const input = one("[data-kg-embed-url]") as HTMLInputElement;
    expect(input.getAttribute("aria-label")).toBe("Video link");
    expect(input.getAttribute("placeholder")).toContain("YouTube");
    expect(one("iframe")).toBeNull();
  });

  it.each([
    "https://example.com/video",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch",
  ])("refuses %s with a plain error and keeps the card empty", async (value) => {
    const { api } = await insertEmbed();
    await submit(value);
    const error = await waitFor(() => {
      const found = one("[data-kg-embed-error]");
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.textContent?.length).toBeGreaterThan(10);
    expect(saved(api)[0]).toMatchObject({ url: "" });
    expect(one("iframe")).toBeNull();
  });

  it("the refusal for another site names the sites that are allowed", async () => {
    await insertEmbed();
    await submit("https://example.com/video");
    const text = (one("[data-kg-embed-error]") as HTMLElement).textContent as string;
    expect(text).toContain("YouTube");
    expect(text).toContain("Vimeo");
    expect(text).toContain("Twitch");
  });

  it("Enter in the field takes the link", async () => {
    const { api } = await insertEmbed();
    const input = one("[data-kg-embed-url]") as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: YOUTUBE } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });
    await waitFor(() => expect(saved(api)[0]).toMatchObject({ url: YOUTUBE }));
  });
});

describe("the placeholder, before play", () => {
  const embedded = async (url = YOUTUBE, title = "", composer: Parameters<typeof mount>[0] = {}) =>
    mount({
      ...composer,
      composer: {
        cards: ["image", "embed"],
        initialEditorState: documentWith(embedNode(url, title)),
        ...composer?.composer,
      },
    });

  it("shows the title, the host's name, a play button and a privacy line, and loads nothing", async () => {
    await embedded(YOUTUBE, "A talk about editors");
    const placeholder = one("[data-kg-embed-placeholder]") as HTMLElement;
    expect(placeholder).not.toBeNull();
    expect(placeholder.textContent).toContain("A talk about editors");
    expect(placeholder.textContent).toContain("YouTube");
    expect((one("[data-kg-embed-privacy]") as HTMLElement).textContent).toContain("YouTube");
    const play = one("[data-kg-embed-play]") as HTMLButtonElement;
    expect(play.tagName).toBe("BUTTON");
    expect(play.getAttribute("type")).toBe("button");
    expect(play.getAttribute("aria-label")).toBe("Play video: A talk about editors (YouTube)");
    // nothing from a third party: no frame, picture, script, link or media element at all
    const card = placeholder.closest('[data-kg-card="embed"]') as HTMLElement;
    expect(
      card.querySelector("iframe, img, script, link, video, audio, object, embed, a"),
    ).toBeNull();
    expect(card.innerHTML).not.toMatch(/youtube\.|youtube-nocookie|youtu\.be|ytimg|googlevideo/i);
  });

  it("uses the host's name as the title when the author typed none", async () => {
    await embedded(YOUTUBE, "");
    expect((one("[data-kg-embed-placeholder]") as HTMLElement).textContent).toContain("YouTube");
    expect((one("[data-kg-embed-play]") as HTMLElement).getAttribute("aria-label")).toBe(
      "Play video: YouTube",
    );
  });

  it("makes no network request: fetch is never called while editing or reading", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const open = vi.spyOn(XMLHttpRequest.prototype, "open");
    try {
      await embedded();
      await insertEmbed();
      await submit(YOUTUBE);
      expect(fetcher).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      open.mockRestore();
    }
  });

  it("the title is the author's to type, and the placeholder follows it", async () => {
    const { api } = await embedded();
    await select(api);
    const field = (await waitFor(() => {
      const found = one("[data-kg-embed-title]");
      expect(found).not.toBeNull();
      return found;
    })) as HTMLInputElement;
    expect(field.getAttribute("aria-label")).toBe("Video title");
    await act(async () => {
      fireEvent.change(field, { target: { value: "My title" } });
    });
    expect(saved(api)[0]).toMatchObject({ title: "My title" });
    expect((one("[data-kg-embed-placeholder]") as HTMLElement).textContent).toContain("My title");
  });

  it("a reader sees the placeholder and no fields", async () => {
    await embedded(YOUTUBE, "A talk", { composer: { editable: false } });
    expect(one("[data-kg-embed-placeholder]")).not.toBeNull();
    expect(one("[data-kg-embed-play]")).not.toBeNull();
    expect(one("[data-kg-embed-url]")).toBeNull();
    expect(one("iframe")).toBeNull();
  });

  it("a saved link the list no longer allows says so, and plays nothing", async () => {
    await embedded("https://example.com/video", "Gone");
    expect(one("[data-kg-embed-play]")).toBeNull();
    expect(one("[data-kg-embed-error]")).not.toBeNull();
    expect(one("iframe")).toBeNull();
  });
});

describe("pressing play", () => {
  const play = async (url: string, composer: Parameters<typeof mount>[0] = {}) => {
    await mount({
      ...composer,
      composer: {
        cards: ["image", "embed"],
        initialEditorState: documentWith(embedNode(url, "A talk")),
        ...composer?.composer,
      },
    });
    expect(one("iframe")).toBeNull();
    await act(async () => {
      fireEvent.click(one("[data-kg-embed-play]") as Element);
    });
    return await waitFor(() => {
      const found = one("iframe[data-kg-embed-frame]");
      expect(found).not.toBeNull();
      return found as HTMLIFrameElement;
    });
  };

  it("swaps the placeholder for the YouTube privacy-enhanced player, sandboxed", async () => {
    const frame = await play(YOUTUBE);
    const src = new URL(frame.getAttribute("src") as string);
    expect(src.protocol).toBe("https:");
    expect(src.hostname).toBe("www.youtube-nocookie.com");
    expect(src.pathname).toBe(`/embed/${ID}`);
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame.getAttribute("loading")).toBe("lazy");
    const sandbox = (frame.getAttribute("sandbox") as string).split(/\s+/);
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-top-navigation");
    expect(sandbox).not.toContain("allow-top-navigation-by-user-activation");
    expect(sandbox).not.toContain("allow-forms");
    expect(sandbox).not.toContain("allow-modals");
    expect(frame.getAttribute("allow")).toBe("autoplay; fullscreen");
    expect(frame.hasAttribute("allowfullscreen")).toBe(true);
    expect(frame.getAttribute("title")).toBe("A talk (YouTube)");
    expect(one("[data-kg-embed-placeholder]")).toBeNull();
  });

  it("plays Vimeo with do-not-track on", async () => {
    const frame = await play("https://vimeo.com/76979871");
    const src = new URL(frame.getAttribute("src") as string);
    expect(src.hostname).toBe("player.vimeo.com");
    expect(src.searchParams.get("dnt")).toBe("1");
  });

  it("plays Twitch with the parent the host app set", async () => {
    const frame = await play("https://www.twitch.tv/somechannel", {
      composer: { embedParent: "blog.example.com" },
    });
    const src = new URL(frame.getAttribute("src") as string);
    expect(src.hostname).toBe("player.twitch.tv");
    expect(src.searchParams.get("parent")).toBe("blog.example.com");
  });

  it("the play button works from the keyboard: it is a real button that is focusable", async () => {
    await mount({
      composer: {
        cards: ["image", "embed"],
        initialEditorState: documentWith(embedNode(YOUTUBE, "A talk")),
      },
    });
    const button = one("[data-kg-embed-play]") as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it("Enter on the play button plays and is not taken by the editor's Enter", async () => {
    const { api } = await mount({
      composer: {
        cards: ["image", "embed"],
        initialEditorState: documentWith(embedNode(YOUTUBE, "A talk")),
      },
    });
    const button = one("[data-kg-embed-play]") as HTMLButtonElement;
    button.focus();
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_ENTER_COMMAND,
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      fireEvent.click(button);
    });
    expect(one("iframe[data-kg-embed-frame]")).not.toBeNull();
  });
});

describe("the host's own list", () => {
  it("uses embedHosts, so a site that is not on it is refused", async () => {
    const hosts = [
      {
        id: "demo",
        label: "Demo Video",
        hostnames: ["video.example.org"],
        parse: (url: URL) => `https://player.example.org${url.pathname}`,
      },
    ];
    await insertEmbed({ composer: { embedHosts: hosts } });
    await submit(YOUTUBE);
    expect((one("[data-kg-embed-error]") as HTMLElement).textContent).toContain("Demo Video");
    await submit("https://video.example.org/v/42");
    await waitFor(() => expect(one("[data-kg-embed-placeholder]")).not.toBeNull());
    expect((one("[data-kg-embed-placeholder]") as HTMLElement).textContent).toContain("Demo Video");
  });
});

describe("saving and the exported page", () => {
  it("round trips the link, the title and the block id, and saving again gives the same document", async () => {
    const source = documentWith(embedNode(YOUTUBE, "A talk", "aaaa"));
    const first = await mount({
      composer: { cards: ["embed"], initialEditorState: source },
    });
    const state = first.api.editorInstance.getEditorState().toJSON();
    expect(saved(first.api)[0]).toMatchObject({ url: YOUTUBE, title: "A talk", $: { id: "aaaa" } });
    cleanup();
    const second = await mount({
      composer: { cards: ["embed"], initialEditorState: JSON.stringify(state) },
    });
    expect(second.api.editorInstance.getEditorState().toJSON()).toEqual(state);
  });

  it("exports a plain link with nothing to load, never an iframe", async () => {
    const { api } = await mount({
      composer: {
        cards: ["embed"],
        initialEditorState: documentWith(embedNode(YOUTUBE, "A talk <b>x</b>")),
      },
    });
    const html = api.editorInstance.read(() => {
      const node = $getRoot()
        .getChildren()
        .find((child) => child.getType() === "embed") as unknown as {
        exportDOM: (editor: unknown) => { element: HTMLElement };
      };
      return node.exportDOM(api.editorInstance).element.outerHTML;
    });
    expect(html).toContain("kg-embed-card");
    expect(html).toContain(`href="${YOUTUBE}"`);
    expect(html).not.toMatch(/<iframe|<script|<img|src=/i);
    expect(html).not.toContain("<b>");
  });

  it("exports nothing for an address that is not https", async () => {
    const { api } = await mount({
      composer: {
        cards: ["embed"],
        initialEditorState: documentWith(embedNode("javascript:alert(1)", "x")),
      },
    });
    const html = api.editorInstance.read(() => {
      const node = $getRoot()
        .getChildren()
        .find((child) => child.getType() === "embed") as unknown as {
        exportDOM: (editor: unknown) => { element: HTMLElement };
      };
      return node.exportDOM(api.editorInstance).element.outerHTML;
    });
    expect(html).not.toContain("javascript:");
  });
});
