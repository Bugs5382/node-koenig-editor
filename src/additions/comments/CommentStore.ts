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
import type {
  KoenigCommentEvent,
  KoenigCommentInput,
  KoenigCommentMessage,
  KoenigCommentsController,
  KoenigCommentsOptions,
  KoenigCommentThread,
} from "node-koenig-editor";

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** What the store needs from the editor side, supplied by the plugin once it is mounted. */
export interface CommentAnchors {
  /** Wraps the current selection in an anchor for `id`; returns its text, or null if none. */
  add: (id: string) => null | string;
  /** Takes the anchor for `id` out of the document, keeping the text. */
  remove: (id: string) => void;
  /** Puts `text` in place of the text under the anchor for `id`, keeping the anchor; false if there is none. */
  replace: (id: string, text: string) => boolean;
  /** Scrolls the anchor for `id` into view. */
  reveal: (id: string) => void;
}

// Framework-free state for the threads. The plugin binds the editor to it; React reads it
// through useSyncExternalStore (see context.ts). Every change swaps the affected thread for a
// new object, so snapshots compare by identity.
export class CommentStore implements KoenigCommentsController {
  private anchors: CommentAnchors | null = null;
  private active: null | string = null;
  private anchored = new Set<string>();
  private listeners = new Set<() => void>();
  private onEvent: KoenigCommentsOptions["onEvent"];
  private snapshot: readonly KoenigCommentThread[] = [];
  private threads = new Map<string, KoenigCommentThread>();
  private threadsSource: KoenigCommentsOptions["threads"];

  constructor(options: KoenigCommentsOptions = {}) {
    this.configure(options);
  }

  /** Applies the host's options; threads are replaced only when the array itself changed. */
  configure(options: KoenigCommentsOptions): void {
    this.onEvent = options.onEvent;
    if (options.threads !== this.threadsSource) {
      this.threadsSource = options.threads;
      this.threads = new Map((options.threads ?? []).map((thread) => [thread.id, thread]));
      if (this.active && !this.threads.has(this.active)) {
        this.active = null;
      }
      this.publish();
    }
  }

  bind(anchors: CommentAnchors | null): void {
    this.anchors = anchors;
  }

  /** The plugin reports which anchors are in the document; transitions become events. */
  setAnchored(ids: ReadonlySet<string>, initial: boolean): void {
    const previous = this.anchored;
    this.anchored = new Set(ids);
    if (!initial) {
      for (const thread of this.threads.values()) {
        const was = previous.has(thread.id);
        const is = ids.has(thread.id);
        if (was && !is) {
          this.emit({ thread, type: "anchor-lost" });
        } else if (!was && is) {
          this.emit({ thread, type: "anchor-restored" });
        }
      }
    }
    this.publish();
  }

  addThread(input: KoenigCommentInput & { id?: string }): KoenigCommentThread | null {
    const id = input.id ?? newId();
    if (!this.anchors || this.threads.has(id)) {
      return null;
    }
    const quote = this.anchors.add(id);
    if (quote === null) {
      return null;
    }
    const now = new Date().toISOString();
    const thread: KoenigCommentThread = {
      createdAt: now,
      id,
      messages: [this.message(input, now)],
      quote,
      resolved: false,
    };
    this.threads.set(id, thread);
    this.anchored.add(id);
    this.publish();
    this.emit({ thread, type: "thread-added" });
    return thread;
  }

  replaceThreadText(id: string, text: string): boolean {
    const thread = this.threads.get(id);
    if (!thread || !this.anchors?.replace(id, text)) {
      return false;
    }
    const next = { ...thread, quote: text };
    this.threads.set(id, next);
    this.publish();
    this.emit({ thread: next, type: "thread-text-replaced" });
    return true;
  }

  removeThread(id: string): boolean {
    const thread = this.threads.get(id);
    if (!thread) {
      return false;
    }
    this.anchors?.remove(id);
    this.threads.delete(id);
    this.anchored.delete(id);
    if (this.active === id) {
      this.active = null;
    }
    this.publish();
    this.emit({ thread, type: "thread-removed" });
    return true;
  }

  resolveThread(id: string, resolved = true): boolean {
    const thread = this.threads.get(id);
    if (!thread) {
      return false;
    }
    if (thread.resolved !== resolved) {
      const next = { ...thread, resolved };
      this.threads.set(id, next);
      this.publish();
      this.emit({ thread: next, type: resolved ? "thread-resolved" : "thread-reopened" });
    }
    return true;
  }

  reply(id: string, input: KoenigCommentInput): KoenigCommentMessage | null {
    const thread = this.threads.get(id);
    if (!thread) {
      return null;
    }
    const message = this.message(input, new Date().toISOString());
    const next = { ...thread, messages: [...thread.messages, message] };
    this.threads.set(id, next);
    this.publish();
    this.emit({ message, thread: next, type: "reply-added" });
    return message;
  }

  focusThread(id: null | string): void {
    if ((id !== null && !this.threads.has(id)) || id === this.active) {
      return;
    }
    this.active = id;
    if (id !== null) {
      this.anchors?.reveal(id);
    }
    this.publish();
    this.emit({
      thread: id === null ? null : (this.threads.get(id) ?? null),
      type: "thread-focused",
    });
  }

  getActiveThreadId = (): null | string => this.active;
  getThread = (id: string): KoenigCommentThread | undefined => this.threads.get(id);
  getThreads = (): readonly KoenigCommentThread[] => this.snapshot;
  isAnchored = (id: string): boolean => this.anchored.has(id);

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private message(input: KoenigCommentInput, createdAt: string): KoenigCommentMessage {
    return {
      ...(input.author === undefined ? {} : { author: input.author }),
      body: input.body,
      createdAt,
      id: newId(),
    };
  }

  private publish(): void {
    this.snapshot = [...this.threads.values()];
    for (const listener of [...this.listeners]) {
      listener();
    }
  }

  private emit(event: KoenigCommentEvent): void {
    try {
      this.onEvent?.(event);
    } catch (error) {
      console.error("node-koenig-editor: a comment event handler threw", event.type, error);
    }
  }
}
