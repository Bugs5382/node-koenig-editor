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
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  type LexicalNode,
} from "lexical";
import { useEffect } from "react";

// Koenig cards mark themselves with `isKoenigCard()`; stock nodes do not have it.
const isCard = (node: LexicalNode | null): boolean =>
  !!node && (node as { isKoenigCard?: () => boolean }).isKoenigCard?.() === true;

/**
 * A card at the very start or end of the document has no line beside it, so the cursor cannot
 * go above or below it. This adds an empty paragraph there, only when there is none, and returns
 * how many it added. Between two cards it adds nothing: a gap there is the person's to keep or
 * delete, and one that was deleted is never put back.
 */
export const $ensureCardSpace = (): number => {
  const root = $getRoot();
  let added = 0;
  if (isCard(root.getFirstChild())) {
    root.getFirstChild()!.insertBefore($createParagraphNode());
    added += 1;
  }
  if (isCard(root.getLastChild())) {
    root.getLastChild()!.insertAfter($createParagraphNode());
    added += 1;
  }
  return added;
};

const needsSpace = (): boolean =>
  isCard($getRoot().getFirstChild()) || isCard($getRoot().getLastChild());

// Collaborators' changes arrive tagged; the editor that made the change adds the space, so two
// editors do not both add one.
const REMOTE_TAGS = ["collaboration", "historic", "skip-collab"];

export const CardSpacePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor) return undefined;
    const fix = () => {
      if (!editor.isEditable()) return;
      // "history-merge" keeps the paragraph in the same undo step as the change that needed it.
      editor.update(
        () => {
          $ensureCardSpace();
        },
        { tag: "history-merge" },
      );
    };
    fix();
    const stopUpdates = editor.registerUpdateListener(({ editorState, tags }) => {
      if (!editor.isEditable() || REMOTE_TAGS.some((tag) => tags.has(tag))) return;
      if (editorState.read(needsSpace)) fix();
    });
    // Enter on a selected card with no paragraph after it makes one and moves the cursor into it.
    // A card that already has a paragraph below it is left to the editor's own handling.
    const stopEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!editor.isEditable() || event?.shiftKey || event?.metaKey || event?.ctrlKey)
          return false;
        const selection = $getSelection();
        if (!$isNodeSelection(selection)) return false;
        const nodes = selection.getNodes();
        const target = nodes.length === 1 ? nodes[0]! : null;
        if (!target || !isCard(target)) return false;
        const next = target.getNextSibling();
        if (next !== null && !isCard(next)) return false;
        event?.preventDefault?.();
        const paragraph = $createParagraphNode();
        target.insertAfter(paragraph);
        paragraph.selectStart();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      stopUpdates();
      stopEnter();
    };
  }, [editor]);
  return null;
};

export default CardSpacePlugin;
