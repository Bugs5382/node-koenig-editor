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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getRoot, type EditorState } from "lexical";
import { useEffect } from "react";

import { $getBlockId, $setBlockId, generateBlockId } from "./blockId";

// Collaborators' changes arrive tagged; the editor that made the change gives the ids, so two
// editors do not both give one.
const REMOTE_TAGS = ["collaboration", "historic", "skip-collab"];

type Entry = { key: string; id: string };

const readEntries = (state: EditorState): Entry[] =>
  state.read(() =>
    $getRoot()
      .getChildren()
      .map((node) => ({ key: node.getKey(), id: $getBlockId(node) })),
  );

/**
 * Keys of the blocks whose id is missing, or is already held by another block that has a better
 * claim to it. The better claim is the block that already existed before this update, so a
 * pasted copy or the new half of a split gets the new id and the original keeps its own.
 */
const findNeedy = (entries: Entry[], previous: ReadonlySet<string>): string[] => {
  const holders = new Map<string, Entry[]>();
  const needy: string[] = [];
  for (const entry of entries) {
    if (entry.id === "") needy.push(entry.key);
    else holders.set(entry.id, [...(holders.get(entry.id) ?? []), entry]);
  }
  for (const group of holders.values()) {
    if (group.length < 2) continue;
    const keeper = group.find((entry) => previous.has(entry.key)) ?? group[0]!;
    for (const entry of group) if (entry !== keeper) needy.push(entry.key);
  }
  return needy;
};

const describe = (state: EditorState) =>
  state.read(() => {
    const children = $getRoot().getChildren();
    return children.map((node, index) => ({
      key: node.getKey(),
      id: $getBlockId(node),
      type: node.getType(),
      after: index > 0 ? children[index - 1]!.getType() : "",
    }));
  });

/**
 * Gives every top-level block a stable short id, and marks each block's element with
 * `data-kg-block-id`, `data-kg-block-type` and `data-kg-after` (the type of the block above, so a
 * stylesheet can tell what precedes a block without scanning).
 */
export const BlockIdPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor) return undefined;
    const mark = (state: EditorState) => {
      for (const block of describe(state)) {
        const element = editor.getElementByKey(block.key);
        if (!element) continue;
        if (block.id) element.setAttribute("data-kg-block-id", block.id);
        else element.removeAttribute("data-kg-block-id");
        element.setAttribute("data-kg-block-type", block.type);
        if (block.after) element.setAttribute("data-kg-after", block.after);
        else element.removeAttribute("data-kg-after");
      }
    };
    const assign = (state: EditorState, previous: EditorState | null) => {
      if (!editor.isEditable()) return;
      const before = new Set(previous ? readEntries(previous).map((entry) => entry.key) : []);
      const needy = findNeedy(readEntries(state), before);
      if (needy.length === 0) return;
      // "history-merge" keeps the ids in the same undo step as the change that needed them.
      editor.update(
        () => {
          const children = $getRoot().getChildren();
          const used = new Set(children.map($getBlockId).filter((id) => id !== ""));
          for (const key of needy) {
            const node = $getNodeByKey(key);
            if (!node) continue;
            const id = generateBlockId(used);
            used.add(id);
            $setBlockId(node, id);
          }
        },
        { tag: "history-merge" },
      );
    };
    assign(editor.getEditorState(), null);
    mark(editor.getEditorState());
    return editor.registerUpdateListener(({ editorState, prevEditorState, tags }) => {
      if (REMOTE_TAGS.some((tag) => tags.has(tag))) {
        mark(editorState);
        return;
      }
      assign(editorState, prevEditorState);
      mark(editorState);
    });
  }, [editor]);
  return null;
};

export default BlockIdPlugin;
