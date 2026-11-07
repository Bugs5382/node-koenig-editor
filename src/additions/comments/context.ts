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
import type { KoenigCommentsController, KoenigCommentThread } from "node-koenig-editor";
import { createContext, useContext, useSyncExternalStore } from "react";
import type { CommentStore } from "./CommentStore";

export const KoenigCommentsContext = createContext<CommentStore | null>(null);

/** The store the composer made, or null when comments are off. */
export const useCommentStore = (): CommentStore | null => useContext(KoenigCommentsContext);

const noSubscription = (): (() => void) => () => undefined;

/** The controller plus live threads and active thread; re-renders the caller on any change. */
export const useKoenigComments = (): {
  activeThreadId: null | string;
  controller: KoenigCommentsController;
  threads: readonly KoenigCommentThread[];
} | null => {
  const store = useCommentStore();
  const subscribe = store ? store.subscribe : noSubscription;
  const threads = useSyncExternalStore(subscribe, () => store?.getThreads() ?? null);
  const activeThreadId = useSyncExternalStore(subscribe, () => store?.getActiveThreadId() ?? null);
  return store && threads ? { activeThreadId, controller: store, threads } : null;
};
