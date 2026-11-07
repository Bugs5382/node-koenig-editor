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
// A demo-only transport for the package's `collaboration` option: tabs and windows of the same
// browser and address share one room through a BroadcastChannel, so two windows edit the same
// document live with no server. A real host plugs in its own provider (websocket, WebRTC, ...).
import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from "yjs";

type State = Record<string, unknown>;
type Message =
  | { clientId: number; state: null | State; type: "awareness" }
  | { clientId: number; type: "awareness-request" }
  | { reply?: boolean; state: Uint8Array; type: "sync-request" }
  | { type: "update"; update: Uint8Array };

/** What the provider needs from a channel; a BroadcastChannel has it, a test can stand in. */
export interface Channel {
  close: () => void;
  onmessage: ((event: { data: Message }) => void) | null;
  postMessage: (message: Message) => void;
}

export type ChannelFactory = (name: string) => Channel;

export const broadcastChannel: ChannelFactory = (name) =>
  new BroadcastChannel(name) as unknown as Channel;

const SYNC_WAIT_MS = 150;

class Awareness {
  private readonly listeners = new Set<() => void>();
  private local: null | State = null;
  readonly states = new Map<number, State>();

  constructor(
    readonly clientId: number,
    private readonly send: (state: null | State) => void,
  ) {}

  getLocalState = () => this.local;
  getStates = () => this.states;
  off = (_type: "update", listener: () => void) => void this.listeners.delete(listener);
  on = (_type: "update", listener: () => void) => void this.listeners.add(listener);

  setLocalState = (state: null | State) => {
    this.local = state;
    if (state) this.states.set(this.clientId, state);
    else this.states.delete(this.clientId);
    this.send(state);
    this.emit();
  };

  setLocalStateField = (field: string, value: unknown) => {
    this.setLocalState({ ...this.local, [field]: value });
  };

  /** A peer's state arrived (null when it left). */
  remote(clientId: number, state: null | State) {
    if (state) this.states.set(clientId, state);
    else this.states.delete(clientId);
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

class BroadcastProvider {
  readonly awareness: Awareness;
  private channel: Channel | null = null;
  private readonly listeners: Record<string, Set<(arg: never) => void>> = {};
  private synced = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly name: string,
    private readonly doc: Doc,
    private readonly open: ChannelFactory,
  ) {
    this.awareness = new Awareness(doc.clientID, (state) =>
      this.post({ clientId: doc.clientID, state, type: "awareness" }),
    );
  }

  private readonly onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== this) this.post({ type: "update", update });
  };

  private emit(type: string, arg: unknown) {
    for (const listener of this.listeners[type] ?? []) (listener as (a: unknown) => void)(arg);
  }

  private post(message: Message) {
    this.channel?.postMessage(message);
  }

  private readonly onMessage = ({ data }: { data: Message }) => {
    switch (data.type) {
      case "sync-request": {
        // a newcomer sends what it has; answer with what it lacks, and ask for the same back
        this.post({ type: "update", update: encodeStateAsUpdate(this.doc, data.state) });
        // (a request that is itself an answer is not answered with another, or two windows would
        // ask each other for ever)
        if (!data.reply) {
          this.post({ reply: true, state: encodeStateVector(this.doc), type: "sync-request" });
        }
        break;
      }
      case "update": {
        applyUpdate(this.doc, data.update, this);
        this.markSynced();
        this.emit("update", data.update);
        break;
      }
      case "awareness": {
        this.awareness.remote(data.clientId, data.state);
        break;
      }
      case "awareness-request": {
        const local = this.awareness.getLocalState();
        if (local) this.post({ clientId: this.doc.clientID, state: local, type: "awareness" });
        break;
      }
    }
  };

  private markSynced() {
    if (this.synced) return;
    this.synced = true;
    clearTimeout(this.timer);
    this.emit("sync", true);
  }

  connect = () => {
    if (this.channel) return;
    this.channel = this.open(this.name);
    this.channel.onmessage = this.onMessage;
    this.doc.on("update", this.onDocUpdate);
    this.emit("status", { status: "connected" });
    this.post({ state: encodeStateVector(this.doc), type: "sync-request" });
    this.post({ clientId: this.doc.clientID, type: "awareness-request" });
    const local = this.awareness.getLocalState();
    if (local) this.post({ clientId: this.doc.clientID, state: local, type: "awareness" });
    // alone in the room: nobody answers, so the document is synced after a short wait
    this.timer = setTimeout(() => this.markSynced(), SYNC_WAIT_MS);
  };

  disconnect = () => {
    if (!this.channel) return;
    clearTimeout(this.timer);
    this.post({ clientId: this.doc.clientID, state: null, type: "awareness" });
    this.doc.off("update", this.onDocUpdate);
    this.channel.close();
    this.channel = null;
    this.synced = false;
    this.emit("status", { status: "disconnected" });
  };

  on = (type: string, listener: (arg: never) => void) => {
    (this.listeners[type] ??= new Set()).add(listener);
  };

  off = (type: string, listener: (arg: never) => void) => {
    this.listeners[type]?.delete(listener);
  };
}

/** The composer's `collaboration.providerFactory`: one provider per document id, one room name. */
export function broadcastProviderFactory(room: string, open: ChannelFactory = broadcastChannel) {
  return (id: string, documents: Map<string, Doc>) => {
    let doc = documents.get(id);
    if (!doc) {
      doc = new Doc();
      documents.set(id, doc);
    }
    return new BroadcastProvider(`koenig-demo:${room}:${id}`, doc, open);
  };
}
