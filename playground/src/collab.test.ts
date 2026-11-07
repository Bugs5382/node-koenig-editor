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
import { describe, expect, it } from "vitest";
import { Doc } from "yjs";

import {
  type Channel,
  type ChannelFactory,
  broadcastProviderFactory,
  collabStatus,
} from "./collab";

// A room of in-memory channels: a message posted on one reaches every other open channel by name.
const hub = (): ChannelFactory => {
  const open = new Map<string, Set<Channel>>();
  return (name) => {
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
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const peer = (room: string, open: ChannelFactory) => {
  const documents = new Map<string, Doc>();
  const provider = broadcastProviderFactory(room, open)("main", documents);
  return { doc: documents.get("main") as Doc, provider };
};

describe("the demo's collaboration transport", () => {
  it("carries an edit from one window to the other, both ways", async () => {
    const open = hub();
    const a = peer("r", open);
    const b = peer("r", open);
    a.provider.connect();
    b.provider.connect();
    await settle();
    a.doc.getText("t").insert(0, "hello");
    await settle();
    expect(b.doc.getText("t").toString()).toBe("hello");
    b.doc.getText("t").insert(5, " world");
    await settle();
    expect(a.doc.getText("t").toString()).toBe("hello world");
  });

  it("brings a window that joins late up to date", async () => {
    const open = hub();
    const a = peer("r", open);
    a.provider.connect();
    a.doc.getText("t").insert(0, "already here");
    await settle();
    const b = peer("r", open);
    b.provider.connect();
    await settle();
    expect(b.doc.getText("t").toString()).toBe("already here");
  });

  it("keeps rooms apart", async () => {
    const open = hub();
    const a = peer("one", open);
    const b = peer("two", open);
    a.provider.connect();
    b.provider.connect();
    a.doc.getText("t").insert(0, "private");
    await settle();
    expect(b.doc.getText("t").toString()).toBe("");
  });

  it("reports synced when alone, and shows a peer's cursor state until it leaves", async () => {
    const open = hub();
    const a = peer("r", open);
    const b = peer("r", open);
    let synced = false;
    a.provider.on("sync", () => (synced = true));
    a.provider.connect();
    b.provider.connect();
    b.provider.awareness.setLocalState({
      anchorPos: null,
      awarenessData: {},
      color: "#f00",
      focusPos: null,
      focusing: true,
      name: "Bea",
    });
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(synced).toBe(true);
    expect([...a.provider.awareness.getStates().values()].map((s) => s.name)).toEqual(["Bea"]);
    b.provider.disconnect();
    await settle();
    expect(a.provider.awareness.getStates().size).toBe(0);
  });

  it("counts the windows in the room and names the room, for the status in each window", async () => {
    const open = hub();
    const state = {
      anchorPos: null,
      awarenessData: {},
      color: "#00f",
      focusPos: null,
      focusing: false,
      name: "x",
    };
    const a = peer("kitchen", open);
    a.provider.connect();
    a.provider.awareness.setLocalState(state);
    expect(collabStatus.snapshot()).toEqual({ room: "kitchen", windows: 1 });
    const b = peer("kitchen", open);
    b.provider.connect();
    b.provider.awareness.setLocalState(state);
    await settle();
    expect(collabStatus.snapshot().windows).toBe(2);
    b.provider.disconnect();
    await settle();
    expect(collabStatus.snapshot().windows).toBe(1);
    a.provider.disconnect();
    expect(collabStatus.snapshot().windows).toBe(0);
  });
});
