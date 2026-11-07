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
import { cleanup, waitFor } from "@testing-library/react";
import type { KoenigCollaboration } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";
import { Doc } from "yjs";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

// A card keeps nested editors (a caption, a heading, ...), and the card node holds each one's
// saved EditorState next to it. Lexical's collaboration copies every node property into the
// shared Yjs document, and Yjs cannot store an EditorState: it throws "Unexpected content type",
// the document never reaches the other window, and the cards come out different in each. The
// composer leaves those properties out of the shared document.

const para = (text = "") => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});
const PIXEL = "https://example.com/p.png";
const cards: Record<string, Record<string, unknown>> = {
  callout: {
    backgroundColor: "blue",
    calloutEmoji: "\u{1F4A1}",
    calloutText: "A callout",
    type: "callout",
    version: 1,
  },
  gallery: {
    caption: "A gallery caption",
    images: [
      { alt: "a", caption: "", fileName: "a.png", height: 3, row: 0, src: PIXEL, title: "", width: 4 },
    ],
    type: "gallery",
    version: 1,
  },
  header: {
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
  image: {
    alt: "alt",
    caption: "An image caption",
    cardWidth: "regular",
    height: 300,
    src: PIXEL,
    type: "image",
    version: 1,
    width: 400,
  },
  "toggle-group": {
    items: [
      { content: "First hidden", heading: "First heading" },
      { content: "Second hidden", heading: "Second heading" },
    ],
    type: "toggle-group",
    version: 1,
  },
  toggle: {
    content: "<p>Hidden words</p>",
    heading: "<p>Toggle heading</p>",
    type: "toggle",
    version: 1,
  },
};

// A provider with no network: it is synced as soon as it connects, and keeps its document.
const localCollaboration = (documents: Map<string, Doc>): KoenigCollaboration => ({
  providerFactory: (id, map) => {
    const doc = map.get(id) ?? new Doc();
    map.set(id, doc);
    documents.set(id, doc);
    const listeners: Record<string, Array<(arg: never) => void>> = {};
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
        for (const listener of listeners.sync ?? []) (listener as (synced: boolean) => void)(true);
      },
      disconnect: () => {},
      off: () => {},
      on: (type: string, listener: (arg: never) => void) => {
        (listeners[type] ??= []).push(listener);
      },
    };
  },
});

describe("a document with cards in a collaborative session", () => {
  for (const [name, card] of Object.entries(cards)) {
    it(`${name}: reaches the shared document without an error`, async () => {
      const errors: string[] = [];
      const onError = (error: unknown) => errors.push(String((error as Error)?.message ?? error));
      process.on("uncaughtException", onError);
      process.on("unhandledRejection", onError);
      const documents = new Map<string, Doc>();
      const doc = JSON.stringify({
        root: {
          children: [para("before"), card, para("after")],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      });
      await mount({
        composer: { collaboration: localCollaboration(documents), initialEditorState: doc },
      });
      await waitFor(() => expect(documents.get("main")).toBeDefined());
      await new Promise((resolve) => setTimeout(resolve, 200));
      process.off("uncaughtException", onError);
      process.off("unhandledRejection", onError);
      expect(errors).toEqual([]);
      expect(document.querySelector(`[data-kg-card="${name}"]`)).not.toBeNull();
    });
  }
});
