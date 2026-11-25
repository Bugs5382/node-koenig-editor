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
  $isParagraphNode,
  $isRangeSelection,
  $isElementNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  LineBreakNode,
  RootNode,
  TextNode,
  type EditorState,
} from "lexical";
import { useEffect } from "react";

import { $createTitleNode, $isTitleNode, TitleNode } from "./TitleNode";

/**
 * Keeps exactly one title, and keeps it first: a missing title is added, a second one becomes a
 * paragraph, and one that was moved (a drag, a paste above it) goes back to the top.
 */
export const $ensureTitle = (): void => {
  const root = $getRoot();
  const titles = root.getChildren().filter($isTitleNode);
  const [keep, ...extra] = titles;
  for (const spare of extra) {
    const paragraph = $createParagraphNode();
    spare.replace(paragraph);
    paragraph.append(...spare.getChildren());
  }
  if (keep) {
    if (root.getFirstChild() !== keep) root.getFirstChild()!.insertBefore(keep);
  } else {
    const first = root.getFirstChild();
    const title = $createTitleNode();
    if (first) first.insertBefore(title);
    else root.append(title);
  }
};

const markEmpty = (
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  state: EditorState,
  placeholder: string,
) => {
  const info = state.read(() => {
    const first = $getRoot().getFirstChild();
    return $isTitleNode(first)
      ? { key: first.getKey(), empty: first.getTextContent() === "" }
      : null;
  });
  if (!info) return;
  const element = editor.getElementByKey(info.key);
  if (!element) return;
  element.setAttribute("data-kg-placeholder", placeholder);
  if (info.empty) element.setAttribute("data-kg-empty", "true");
  else element.removeAttribute("data-kg-empty");
};

/**
 * The optional title block. Mount it (through the composer's `title` option) and the document's
 * first block is the title field: plain text, one line, always first, with a placeholder.
 */
export const TitlePlugin = ({ placeholder = "Title" }: { placeholder?: string }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor || !editor.hasNodes([TitleNode])) return undefined;
    const editable = () => editor.isEditable();
    const stopRoot = editor.registerNodeTransform(RootNode, () => {
      if (editable()) $ensureTitle();
    });
    // the title is plain: no bold, italic or other format, and no line break
    const stopText = editor.registerNodeTransform(TextNode, (node) => {
      if ($isTitleNode(node.getParent()) && node.getFormat() !== 0) node.setFormat(0);
    });
    const stopBreaks = editor.registerNodeTransform(LineBreakNode, (node) => {
      if ($isTitleNode(node.getParent())) node.remove();
    });
    // Enter in the title goes to the body: the next line when there is a paragraph, or a new one.
    const stopEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const title = selection.anchor.getNode().getTopLevelElement();
        if (!$isTitleNode(title)) return false;
        const { anchor } = selection;
        const node = anchor.getNode();
        const atEnd =
          anchor.type === "text"
            ? anchor.offset === node.getTextContentSize() && node.getNextSibling() === null
            : $isElementNode(node) && anchor.offset === node.getChildrenSize();
        if (!atEnd) return false;
        event?.preventDefault?.();
        const next = title.getNextSibling();
        if ($isParagraphNode(next)) next.selectStart();
        else {
          const paragraph = $createParagraphNode();
          title.insertAfter(paragraph);
          paragraph.selectStart();
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const stopMarks = editor.registerUpdateListener(({ editorState }) =>
      markEmpty(editor, editorState, placeholder),
    );
    if (editable()) {
      editor.update(
        () => {
          $ensureTitle();
        },
        { tag: "history-merge" },
      );
    }
    markEmpty(editor, editor.getEditorState(), placeholder);
    return () => {
      stopRoot();
      stopText();
      stopBreaks();
      stopEnter();
      stopMarks();
    };
  }, [editor, placeholder]);
  return null;
};

export default TitlePlugin;
