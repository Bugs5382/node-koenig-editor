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
import { $getRoot, $createParagraphNode, type LexicalNode } from "lexical";
import { useEffect } from "react";

// Koenig cards mark themselves with `isKoenigCard()`; stock nodes do not have it.
const isCard = (node: LexicalNode | null): boolean =>
  !!node && (node as { isKoenigCard?: () => boolean }).isKoenigCard?.() === true;

/**
 * Gives every top-level card an empty paragraph before and after it: at the start and the end
 * of the document and between two cards. A card with no paragraph beside it leaves no place for
 * the cursor, so the person cannot type above or below it, and clicking, the arrow keys and
 * Enter have nowhere to go. Returns how many paragraphs it added.
 */
export const $ensureCardSpace = (): number => {
  let added = 0;
  for (const child of $getRoot().getChildren()) {
    if (!isCard(child)) continue;
    const before = child.getPreviousSibling();
    if (before === null || isCard(before)) {
      child.insertBefore($createParagraphNode());
      added += 1;
    }
    const after = child.getNextSibling();
    if (after === null || isCard(after)) {
      child.insertAfter($createParagraphNode());
      added += 1;
    }
  }
  return added;
};

const needsSpace = (): boolean =>
  $getRoot()
    .getChildren()
    .some(
      (child) =>
        isCard(child) &&
        (child.getPreviousSibling() === null ||
          isCard(child.getPreviousSibling()) ||
          child.getNextSibling() === null ||
          isCard(child.getNextSibling())),
    );

// Collaborators' changes arrive tagged; the editor that made the change adds the space, so two
// editors do not both add one.
const REMOTE_TAGS = ["collaboration", "historic", "skip-collab"];

export const CardSpacePlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor) return undefined;
    const fix = () => {
      if (!editor.isEditable()) return;
      editor.update(
        () => {
          $ensureCardSpace();
        },
        { tag: "history-merge" },
      );
    };
    fix();
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (!editor.isEditable() || REMOTE_TAGS.some((tag) => tags.has(tag))) return;
      if (editorState.read(needsSpace)) fix();
    });
  }, [editor]);
  return null;
};

export default CardSpacePlugin;
