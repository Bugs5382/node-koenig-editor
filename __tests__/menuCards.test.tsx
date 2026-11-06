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
import { act, cleanup, fireEvent } from "@testing-library/react";
import type { KoenigCollaboration } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";
import { Doc, XmlText } from "yjs";

import { mount, openSlashMenu, uploader } from "./__utils__/mount";

afterEach(() => cleanup());

// A provider that reports itself synced as soon as the editor listens, like a room that is ready.
const quiet = () => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
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
      queueMicrotask(() => listeners.get("sync")?.forEach((listener) => listener(true)));
    },
    disconnect: () => {},
    off: (type: string, listener: (...args: unknown[]) => void) =>
      listeners.get(type)?.delete(listener),
    on: (type: string, listener: (...args: unknown[]) => void) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
    },
  };
};

/** One Y.Doc for every editor, nested ones in named top-level types: how a one-room host wires it. */
const sharedRoom = (): KoenigCollaboration => {
  const room = new Doc();
  return {
    getNestedXmlText: (_doc, id) => room.get(`nested-${id}`, XmlText),
    providerFactory: (id, docs) => {
      docs.set(id, room);
      return quiet() as never;
    },
    shouldBootstrap: true,
  } as KoenigCollaboration;
};

const configs: Record<string, () => Parameters<typeof mount>[0]> = {
  default: () => ({}),
  "fileUploader without fileTypes": () => ({ composer: { fileUploader: uploader } }),
  "one-room collaboration": () => ({ composer: { collaboration: sharedRoom() } }),
};

describe.each(Object.keys(configs))("every card the slash menu offers (%s)", (name) => {
  it("inserts each one without the error card", async () => {
    const { api } = await mount(configs[name]!());
    const labels = await openSlashMenu(api);
    cleanup();
    expect(labels).toEqual(
      expect.arrayContaining(["Image", "Divider", "Table", "Callout", "Toggle"]),
    );
    for (const label of labels) {
      const { api: fresh } = await mount(configs[name]!());
      await openSlashMenu(fresh);
      const item = document.querySelector(`[data-kg-card-menu-item="${label}"]`);
      await act(async () => {
        fireEvent.click(item as Element);
      });
      const failed = document.querySelector("[data-kg-card-error]");
      expect(failed, `${label} failed: ${failed?.textContent}`).toBeNull();
      cleanup();
    }
  });
});
