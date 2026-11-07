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
import { act, cleanup, render, waitFor } from "@testing-library/react";
import {
  KoenigComposer,
  KoenigEditor,
  type KoenigCollaboration,
  type KoenigEditorAPI,
} from "node-koenig-editor";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isTextNode,
  isLexicalEditor,
  type LexicalEditor,
} from "lexical";
import { $dfs } from "@lexical/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  broadcastProviderFactory,
  type Channel,
  type ChannelFactory,
} from "../playground/src/collab";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";

afterEach(() => cleanup());

// Two editors in one room: every document id has one Y.Doc per peer, and an update to one is
// applied to the others, as a websocket server would.
export let PEERS: Array<Map<string, Doc>> = [];
const room = (syncDelay = 0) => {
  const peers: Array<Map<string, Doc>> = (PEERS = []);
  const join = (): KoenigCollaboration => {
    const docs = new Map<string, Doc>();
    peers.push(docs);
    return {
      providerFactory: (id, map) => {
        const doc = map.get(id) ?? new Doc();
        map.set(id, doc);
        docs.set(id, doc);
        const listeners: Record<string, Array<(arg: never) => void>> = {};
        doc.on("update", (update: Uint8Array, origin: unknown) => {
          if (origin === "remote") return;
          for (const other of peers) {
            const twin = other.get(id);
            if (twin && twin !== doc) applyUpdate(twin, update, "remote");
          }
        });
        return {
          awareness: {
            getLocalState: () => null,
            getStates: () => new Map(),
            off: () => {},
            on: () => {},
            setLocalState: () => {},
            setLocalStateField: () => {},
          },
          connect: () => {
            for (const other of peers) {
              const twin = other.get(id);
              if (twin && twin !== doc) applyUpdate(doc, encodeStateAsUpdate(twin), "remote");
            }
            const report = () => {
              for (const l of listeners.sync ?? []) (l as (s: boolean) => void)(true);
            };
            if (syncDelay) setTimeout(report, syncDelay);
            else report();
          },
          disconnect: () => {},
          off: () => {},
          on: (type: string, l: (arg: never) => void) => void (listeners[type] ??= []).push(l),
        } as never;
      },
    };
  };
  return { join };
};

const state = (card: object) =>
  JSON.stringify({
    root: { children: [card], direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const mountPeer = async (
  collaboration: KoenigCollaboration,
  initial?: string,
  changes?: unknown[],
) => {
  let api: KoenigEditorAPI | undefined;
  const view = render(
    <KoenigComposer collaboration={collaboration} initialEditorState={initial}>
      <KoenigEditor onChange={(next) => changes?.push(next)} registerAPI={(a) => (api = a)} />
    </KoenigComposer>,
  );
  await waitFor(() => expect(api).toBeDefined());
  return { api: api as KoenigEditorAPI, view };
};

const PIXEL = "https://example.com/p.png";
// The demo's own transport, over in-memory channels: what two browser tabs do, without a browser.
const demoRoom = () => {
  const open = new Map<string, Set<Channel>>();
  const channels: ChannelFactory = (name) => {
    const group = open.get(name) ?? new Set<Channel>();
    open.set(name, group);
    const channel: Channel = {
      close: () => void group.delete(channel),
      onmessage: null,
      postMessage: (message) => {
        for (const other of group) {
          if (other !== channel) queueMicrotask(() => other.onmessage?.({ data: message }));
        }
      },
    };
    group.add(channel);
    return channel;
  };
  const factory = broadcastProviderFactory("test", channels);
  return { join: (): KoenigCollaboration => ({ providerFactory: factory as never }) };
};

const T = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});
const P = (value: string) => ({
  children: [T(value)],
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph",
  version: 1,
});
const cell = (value: string) => ({
  backgroundColor: null,
  children: [P(value)],
  colSpan: 1,
  direction: null,
  format: "",
  headerState: 0,
  indent: 0,
  rowSpan: 1,
  type: "tablecell",
  version: 1,
});

interface Case {
  /** the edit made on the first window after the second has joined */
  edit?: (node: Record<string, unknown>) => void;
  seed: Record<string, unknown>;
}

const cases: Record<string, Case> = {
  paragraph: { seed: P("A paragraph") },
  heading: {
    seed: {
      children: [T("A heading")],
      direction: null,
      format: "",
      indent: 0,
      tag: "h2",
      type: "heading",
      version: 1,
    },
  },
  quote: {
    seed: {
      children: [T("A quote")],
      direction: null,
      format: "",
      indent: 0,
      type: "quote",
      version: 1,
    },
  },
  list: {
    seed: {
      children: [
        {
          checked: undefined,
          children: [T("One")],
          direction: null,
          format: "",
          indent: 0,
          type: "listitem",
          value: 1,
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      listType: "bullet",
      start: 1,
      tag: "ul",
      type: "list",
      version: 1,
    },
  },
  link: {
    seed: {
      children: [
        {
          children: [T("A link")],
          direction: null,
          format: "",
          indent: 0,
          rel: null,
          target: null,
          title: null,
          type: "link",
          url: "https://example.com",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      textFormat: 0,
      textStyle: "",
      type: "paragraph",
      version: 1,
    },
  },
  code: {
    seed: {
      children: [T("const a = 1;")],
      direction: null,
      format: "",
      indent: 0,
      language: "js",
      type: "code",
      version: 1,
    },
    edit: (node) => void (node as { setLanguage: (l: string) => void }).setLanguage("ts"),
  },
  table: {
    seed: {
      children: [
        {
          children: [cell("a"), cell("b")],
          direction: null,
          format: "",
          indent: 0,
          type: "tablerow",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "table",
      version: 1,
    },
  },
  aside: {
    seed: {
      children: [T("An aside")],
      direction: null,
      format: "",
      indent: 0,
      type: "aside",
      version: 1,
    },
  },
  horizontalrule: { seed: { type: "horizontalrule", version: 1 } },
  image: {
    seed: {
      alt: "alt",
      caption: "An image caption",
      cardWidth: "regular",
      height: 300,
      src: PIXEL,
      type: "image",
      version: 1,
      width: 400,
    },
    edit: (node) => {
      node.alt = "new alt";
      node.cardWidth = "wide";
      node.href = "https://example.com/h";
    },
  },
  callout: {
    seed: {
      backgroundColor: "blue",
      calloutEmoji: "\u{1F4A1}",
      calloutText: "A callout",
      type: "callout",
      version: 1,
    },
    edit: (node) => {
      node.backgroundColor = "green";
      node.calloutEmoji = "\u{1F680}";
    },
  },
  toggle: {
    seed: {
      content: "<p>Hidden words</p>",
      heading: "<p>Toggle heading</p>",
      type: "toggle",
      version: 1,
    },
  },
  "toggle-group": {
    edit: (node) => (node as { addItem: () => void }).addItem(),
    seed: {
      items: [
        { content: "First hidden", heading: "First heading" },
        { content: "Second hidden", heading: "Second heading" },
      ],
      type: "toggle-group",
      version: 1,
    },
  },
  gallery: {
    seed: {
      caption: "A gallery caption",
      images: [
        {
          alt: "a",
          caption: "",
          fileName: "a.png",
          height: 3,
          row: 0,
          src: PIXEL,
          title: "",
          width: 4,
        },
      ],
      type: "gallery",
      version: 1,
    },
    edit: (node) => {
      node.images = [
        ...(node.images as unknown[]),
        {
          alt: "b",
          caption: "",
          fileName: "b.png",
          height: 3,
          row: 0,
          src: PIXEL,
          title: "",
          width: 4,
        },
      ];
      node.shuffle = true;
    },
  },
  header: {
    seed: {
      alignment: "center",
      backgroundColor: "#123456",
      buttonEnabled: false,
      header: "Header title",
      layout: "full",
      size: "small",
      style: "dark",
      subheader: "Header subtitle",
      textColor: "#ffffff",
      type: "header",
      version: 2,
    },
    edit: (node) => {
      node.backgroundColor = "#654321";
      node.size = "large";
      node.alignment = "left";
    },
  },
  button: {
    seed: {
      alignment: "center",
      backgroundColor: "#111111",
      buttonEmoji: "",
      buttonText: "Click",
      buttonUrl: "https://example.com",
      textColor: "#ffffff",
      type: "button",
      version: 1,
    },
    edit: (node) => {
      node.buttonText = "Press";
      node.buttonUrl = "https://example.com/2";
      node.alignment = "left";
      node.buttonEmoji = "\u{1F680}";
    },
  },
  markdown: {
    seed: { markdown: "# Title", type: "markdown", version: 1 },
    edit: (node) => {
      node.markdown = "# Changed";
    },
  },
  file: {
    seed: {
      fileCaption: "cap",
      fileName: "a.pdf",
      fileSize: 10,
      fileTitle: "Title",
      showIcon: true,
      src: "https://example.com/a.pdf",
      type: "file",
      version: 1,
    },
    edit: (node) => {
      node.fileTitle = "New title";
      node.fileCaption = "new cap";
      node.showIcon = false;
    },
  },
  video: {
    seed: {
      caption: "cap",
      cardWidth: "regular",
      duration: 3,
      fileName: "a.mp4",
      height: 9,
      mimeType: "video/mp4",
      src: "https://example.com/a.mp4",
      transcript: "",
      type: "video",
      version: 1,
      width: 16,
    },
    edit: (node) => {
      node.caption = "new cap";
      node.cardWidth = "wide";
      node.transcript = "words";
    },
  },
  audio: {
    seed: {
      duration: 3,
      fileName: "a.mp3",
      mimeType: "audio/mpeg",
      src: "https://example.com/a.mp3",
      title: "Song",
      transcript: "",
      type: "audio",
      version: 1,
    },
    edit: (node) => {
      node.title = "New song";
      node.transcript = "words";
    },
  },
};

// every nested editor a card holds, with the path it sits at
const nestedOf = (api: KoenigEditorAPI) => {
  const found: Array<[string, LexicalEditor]> = [];
  const walk = (value: unknown, path: string, depth: number) => {
    if (isLexicalEditor(value)) found.push([path, value]);
    else if (
      depth < 3 &&
      value &&
      typeof value === "object" &&
      !(value as { constructor?: { name?: string } }).constructor?.name?.includes("EditorState")
    ) {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`, depth + 1);
    }
  };
  api.editorInstance.getEditorState().read(() => {
    $getRoot()
      .getChildren()
      .forEach((child, index) => {
        if ($isDecoratorNode(child))
          for (const [name, value] of Object.entries(child)) {
            if (name.startsWith("__")) walk(value, `${index}.${name}`, 0);
          }
      });
  });
  return found;
};
const typeInto = (editor: LexicalEditor, value: string) =>
  act(async () => {
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode().append($createTextNode(value)));
    });
  });
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 500))));
const snapshot = (api: KoenigEditorAPI) =>
  structuredClone(api.editorInstance.getEditorState().toJSON().root.children);

describe.each([
  ["a synchronous provider", room],
  ["the demo transport", demoRoom],
])("%s", (_label, makeRoom) =>
  describe.each(Object.keys(cases))("%s between two windows", (name) => {
    const { edit, seed } = cases[name]!;
    it("matches when the second window joins, after an edit, and after a reload", async () => {
      const r = makeRoom();
      const a = await mountPeer(r.join(), state(seed));
      await settle();
      const b = await mountPeer(r.join());
      await settle();
      expect(snapshot(b.api)).toEqual(snapshot(a.api));

      // an edit on the first window once the second is there
      await act(async () => {
        a.api.editorInstance.update(() => {
          const node = $getRoot()
            .getChildren()
            .find((child) => child.getType() === name) as unknown as Record<string, unknown>;
          edit?.(node);
          // and the text of the first text node anywhere under the card
          const card = $getRoot()
            .getChildren()
            .find((child) => child.getType() === name)!;
          $dfs(card)
            .map(({ node: found }) => found)
            .find($isTextNode)
            ?.setTextContent("edited");
        });
      });
      for (const [path, editor] of nestedOf(a.api)) await typeInto(editor, `edited ${path}`);
      await settle();
      expect(nestedOf(b.api).map(([path]) => path)).toEqual(nestedOf(a.api).map(([path]) => path));
      expect(snapshot(b.api)).toEqual(snapshot(a.api));

      // a reload: a window that has nothing, joining the same room
      b.view.unmount();
      const c = await mountPeer(r.join());
      await settle();
      expect(snapshot(c.api)).toEqual(snapshot(a.api));
    });
  }),
);

// A provider that reports synced late: the nested editors wait for it, and what the host is told
// about the document in the meantime must still carry their text.
describe("a provider that syncs late", () => {
  const withText = ["callout", "image", "toggle", "toggle-group", "header", "gallery"];
  it.each(withText)("%s: no change event carries its text blank", async (name) => {
    const changes: unknown[] = [];
    const r = room(300);
    const a = await mountPeer(r.join(), state(cases[name]!.seed), changes);
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 900))));
    const blank = changes.filter((change) => {
      const card = (
        change as { root: { children: Array<Record<string, unknown>> } }
      ).root.children.find((child) => child.type === name);
      return card !== undefined && !JSON.stringify(card).includes("<");
    });
    expect(blank.length).toBe(0);
    expect(a.api).toBeDefined();
  });
});

// The demo's own kitchen sink: every card in one document, through the demo's transport.
describe("the demo's kitchen sink between two windows", () => {
  it("matches on join and after a reload", async () => {
    // loaded by a variable path: the playground's sources are not part of the package type check
    const sinkPath: string = "../playground/src/kitchenSink";
    const { kitchenSink } = (await import(/* @vite-ignore */ sinkPath)) as {
      kitchenSink: (available: readonly string[], enabled: readonly string[] | null) => string;
    };
    const r = demoRoom();
    const a = await mountPeer(r.join(), kitchenSink([], null));
    await settle();
    const b = await mountPeer(r.join());
    await settle();
    expect(snapshot(b.api)).toEqual(snapshot(a.api));
    for (const [, editor] of nestedOf(a.api)) await typeInto(editor, "everywhere");
    await settle();
    expect(snapshot(b.api)).toEqual(snapshot(a.api));
    b.view.unmount();
    const c = await mountPeer(r.join());
    await settle();
    expect(snapshot(c.api)).toEqual(snapshot(a.api));
  });
});

// What the second window shows, not only what its card holds: a gallery keeps its pictures in the
// screen's own state, which a change from another window has to refresh.
describe.each([
  ["a synchronous provider", room],
  ["the demo transport", demoRoom],
])("%s: a gallery on screen", (_label, makeRoom) => {
  const picture = (name: string, row: number) => ({
    alt: name,
    caption: "",
    fileName: `${name}.png`,
    height: 3,
    row,
    src: `https://example.com/${name}.png`,
    title: "",
    width: 4,
  });
  const order = (view: { container: HTMLElement }) =>
    [...view.container.querySelectorAll('[data-kg-card="gallery"] img')].map((img) =>
      (img.getAttribute("src") ?? "").replace(/.*\/(\w+)\.png.*/, "$1"),
    );

  it("follows pictures that another window moves, adds and removes", async () => {
    const r = makeRoom();
    const seed = {
      caption: "",
      images: [picture("one", 0), picture("two", 0), picture("three", 0)],
      type: "gallery",
      version: 1,
    };
    const a = await mountPeer(r.join(), state(seed));
    await settle();
    const b = await mountPeer(r.join());
    await settle();
    expect(order(b.view)).toEqual(["one", "two", "three"]);

    const set = async (names: string[]) => {
      await act(async () => {
        a.api.editorInstance.update(() => {
          const card = $getRoot()
            .getChildren()
            .find((child) => child.getType() === "gallery") as unknown as {
            images: unknown[];
          };
          card.images = names.map((name, i) => picture(name, i));
        });
      });
      await settle();
    };
    await set(["three", "one", "two"]);
    expect(order(b.view)).toEqual(["three", "one", "two"]);
    await set(["three", "four", "one", "two"]);
    expect(order(b.view)).toEqual(["three", "four", "one", "two"]);
    await set(["four"]);
    expect(order(b.view)).toEqual(["four"]);
  });
});
