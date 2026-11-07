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
import { $unwrapMarkNode, $wrapSelectionInMarkNode, MarkNode } from "@lexical/mark";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getSelection, $isRangeSelection, $nodesOfType } from "lexical";
import { useEffect } from "react";
import type { CommentStore } from "./CommentStore";

const IDS = "data-kg-comment-ids";
const RESOLVED = "data-kg-comment-resolved";
const ACTIVE = "data-kg-comment-active";
const SELECTOR = `mark[${IDS}]`;

// Binds one editor to a CommentStore: wraps and unwraps the anchors, tags each mark element
// with its thread ids (the highlight's styling and click hooks), reports which anchors exist,
// and turns a click on a highlight into "focus this thread". Nothing here depends on the
// editor being editable, so read-only editors keep their highlights and click-to-focus.
export const CommentsPlugin = ({ store }: { store: CommentStore }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const idsByKey = new Map<string, string[]>();
    let reported = false;

    const decorate = () => {
      const active = store.getActiveThreadId();
      for (const [key, ids] of idsByKey) {
        const element = editor.getElementByKey(key);
        if (!element) {
          continue;
        }
        element.setAttribute(IDS, ids.join(" "));
        const known = ids.filter((id) => store.getThread(id));
        const resolved = known.length > 0 && known.every((id) => store.getThread(id)?.resolved);
        element.toggleAttribute(RESOLVED, resolved);
        element.toggleAttribute(ACTIVE, active !== null && ids.includes(active));
      }
    };

    const reportAnchors = () => {
      store.setAnchored(new Set([...idsByKey.values()].flat()), !reported);
      reported = true;
    };

    const unregisterMarks = editor.registerMutationListener(MarkNode, (mutations) => {
      editor.getEditorState().read(() => {
        for (const [key, mutation] of mutations) {
          const node = mutation === "destroyed" ? null : $getNodeByKey(key);
          if (node instanceof MarkNode) {
            idsByKey.set(key, node.getIDs());
          } else {
            idsByKey.delete(key);
          }
        }
      });
      decorate();
      reportAnchors();
    });

    const unsubscribe = store.subscribe(decorate);

    store.bind({
      add: (id) => {
        let quote: null | string = null;
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            quote = selection.getTextContent();
            $wrapSelectionInMarkNode(selection, selection.isBackward(), id);
          }
        });
        return quote;
      },
      remove: (id) => {
        editor.update(() => {
          for (const node of $nodesOfType(MarkNode)) {
            if (node.hasID(id)) {
              node.deleteID(id);
              if (node.getIDs().length === 0) {
                $unwrapMarkNode(node);
              }
            }
          }
        });
      },
      reveal: (id) => {
        for (const [key, ids] of idsByKey) {
          const element = ids.includes(id) ? editor.getElementByKey(key) : null;
          if (element) {
            element.scrollIntoView?.({ block: "center" });
            return;
          }
        }
      },
    });

    const onClick = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest(SELECTOR) : null;
      const ids = target?.getAttribute(IDS)?.split(" ") ?? [];
      const id = ids.find((candidate) => store.getThread(candidate)?.resolved === false) ?? ids[0];
      if (id) {
        store.focusThread(id);
      }
    };

    const unregisterRoot = editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("click", onClick);
      root?.addEventListener("click", onClick);
    });

    return () => {
      unregisterMarks();
      unregisterRoot();
      unsubscribe();
      store.bind(null);
    };
  }, [editor, store]);

  return null;
};
