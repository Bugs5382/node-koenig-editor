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
import type { Provider, ProviderAwareness, UserState } from "@lexical/yjs";
import { screen, waitFor } from "@testing-library/react";
import { DEFAULT_NODES, type KoenigCollaboration } from "node-koenig-editor";
import { describe, expect, it } from "vitest";
import { Doc, XmlText } from "yjs";

import { documentOf, mount, typeAtEnd } from "./__utils__/mount";

const START = documentOf("Hello");

const mountWith = (collaboration: KoenigCollaboration | null = null) =>
  mount({ composer: { collaboration, initialEditorState: START, nodes: DEFAULT_NODES } });

describe("KoenigEditor", () => {
  it("shows the initial document in an editable text box", async () => {
    await mountWith();
    expect(await screen.findByText("Hello")).toBeDefined();
    const box = screen.getByRole("textbox");
    expect(box.getAttribute("contenteditable")).toBe("true");
  });

  it("reports what was typed through onChange and serialize", async () => {
    const { api, changes } = await mountWith();
    await typeAtEnd(api, " world");
    expect(await screen.findByText("Hello world")).toBeDefined();
    await waitFor(() => expect(JSON.stringify(changes.at(-1))).toContain("Hello world"));
    expect(api.serialize()).toContain("Hello world");
    expect(api.editorIsEmpty()).toBe(false);
  });
});

/** An in-memory stand-in for a host's Yjs provider: syncs as soon as it connects. */
class FakeProvider implements Provider {
  readonly awareness: ProviderAwareness;
  connected = false;
  private readonly listeners = new Map<string, Set<(...arguments_: never[]) => void>>();
  private readonly states = new Map<number, UserState>();

  constructor() {
    const states = this.states;
    this.awareness = {
      getLocalState: () => states.get(0) ?? null,
      getStates: () => states,
      off: () => {},
      on: () => {},
      setLocalState: (state) => {
        states.set(0, state as UserState);
      },
      setLocalStateField: (field, value) => {
        states.set(0, { ...(states.get(0) as UserState), [field]: value });
      },
    };
  }

  connect(): void {
    this.connected = true;
    queueMicrotask(() => {
      this.emit("status", { status: "connected" });
      this.emit("sync", true);
    });
  }

  disconnect(): void {
    this.connected = false;
  }

  off(type: string, listener: (...arguments_: never[]) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  on(type: string, listener: (...arguments_: never[]) => void): void {
    this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener));
  }

  private emit(type: string, ...arguments_: unknown[]): void {
    for (const listener of this.listeners.get(type) ?? []) {
      (listener as (...values: unknown[]) => void)(...arguments_);
    }
  }
}

describe("KoenigComposer collaboration", () => {
  it("binds the editor to the host's provider and writes edits into its document", async () => {
    const documents = new Map<string, Doc>();
    const providers = new Map<string, FakeProvider>();
    const collaboration: KoenigCollaboration = {
      providerFactory: (id, yjsDocumentMap) => {
        const document = new Doc();
        yjsDocumentMap.set(id, document);
        documents.set(id, document);
        const provider = new FakeProvider();
        providers.set(id, provider);
        return provider;
      },
      username: "Tester",
    };

    const { api } = await mountWith(collaboration);
    await waitFor(() => expect(providers.get("main")?.connected).toBe(true));
    const root = () => documents.get("main")?.get("root", XmlText).toString() ?? "";
    // The room was empty, so the editor seeds it from the initial document.
    await waitFor(() => expect(root()).toContain("Hello"));

    await typeAtEnd(api, " together");
    await waitFor(() => expect(root()).toContain("Hello together"));
    expect(await screen.findByText("Hello together")).toBeDefined();
  });
});
