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
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  LineBreakNode,
  RootNode,
  TextNode,
  type EditorState,
  type RangeSelection,
} from "lexical";
import { useEffect } from "react";

import { $createSubtitleNode, $isSubtitleNode, SubtitleNode } from "./SubtitleNode";
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

/**
 * Keeps one subtitle, right under the title: a missing one is added, a second one becomes a
 * paragraph, and one that was moved goes back under the title. Run it after `$ensureTitle`.
 */
export const $ensureSubtitle = (): void => {
  const title = $getRoot().getFirstChild();
  if (!$isTitleNode(title)) return;
  const [keep, ...extra] = $getRoot().getChildren().filter($isSubtitleNode);
  for (const spare of extra) {
    const paragraph = $createParagraphNode();
    spare.replace(paragraph);
    paragraph.append(...spare.getChildren());
  }
  if (keep) {
    if (title.getNextSibling() !== keep) title.insertAfter(keep);
  } else {
    title.insertAfter($createSubtitleNode());
  }
};

const isAtEnd = (selection: RangeSelection): boolean => {
  const { anchor } = selection;
  const node = anchor.getNode();
  return anchor.type === "text"
    ? anchor.offset === node.getTextContentSize() && node.getNextSibling() === null
    : $isElementNode(node) && anchor.offset === node.getChildrenSize();
};

const isAtStart = (selection: RangeSelection): boolean => {
  const { anchor } = selection;
  const node = anchor.getNode();
  return anchor.type === "text"
    ? anchor.offset === 0 && node.getPreviousSibling() === null
    : $isElementNode(node) && anchor.offset === 0;
};

const inLine = (node: { getParent: () => unknown }) => {
  const parent = node.getParent();
  return $isTitleNode(parent as never) || $isSubtitleNode(parent as never);
};

const markEmpty = (
  editor: ReturnType<typeof useLexicalComposerContext>[0],
  state: EditorState,
  placeholder: string,
  subtitlePlaceholder: string | null,
) => {
  const marks = state.read(() => {
    const [first, second] = $getRoot().getChildren();
    const list: { key: string; empty: boolean; text: string }[] = [];
    if ($isTitleNode(first)) {
      list.push({ key: first.getKey(), empty: first.getTextContent() === "", text: placeholder });
    }
    if (subtitlePlaceholder !== null && $isSubtitleNode(second)) {
      list.push({
        key: second.getKey(),
        empty: second.getTextContent() === "",
        text: subtitlePlaceholder,
      });
    }
    return list;
  });
  for (const info of marks) {
    const element = editor.getElementByKey(info.key);
    if (!element) continue;
    element.setAttribute("data-kg-placeholder", info.text);
    if (info.empty) element.setAttribute("data-kg-empty", "true");
    else element.removeAttribute("data-kg-empty");
  }
};

/**
 * The optional title block. Mount it (through the composer's `title` option) and the document's
 * first block is the title field: plain text, one line, always first, with a placeholder.
 */
export const TitlePlugin = ({
  placeholder = "Title",
  subtitle = null,
}: {
  placeholder?: string;
  /** The subtitle's placeholder when the subtitle is on; `null` when it is off. */
  subtitle?: string | null;
}) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor || !editor.hasNodes([TitleNode])) return undefined;
    const withSubtitle = subtitle !== null && editor.hasNodes([SubtitleNode]);
    const editable = () => editor.isEditable();
    const ensure = () => {
      $ensureTitle();
      if (withSubtitle) $ensureSubtitle();
    };
    const stopRoot = editor.registerNodeTransform(RootNode, () => {
      if (editable()) ensure();
    });
    // the title and the subtitle are plain: no bold, italic or other format, and no line break
    const stopText = editor.registerNodeTransform(TextNode, (node) => {
      if (inLine(node) && node.getFormat() !== 0) node.setFormat(0);
    });
    const stopBreaks = editor.registerNodeTransform(LineBreakNode, (node) => {
      if (inLine(node)) node.remove();
    });
    // Enter in the title goes to the subtitle when there is one, then to the body: the next line
    // when there is a paragraph, or a new one.
    const stopEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const title = selection.anchor.getNode().getTopLevelElement();
        if (!$isTitleNode(title) && !$isSubtitleNode(title)) return false;
        if (!isAtEnd(selection)) return false;
        event?.preventDefault?.();
        const next = title.getNextSibling();
        if ($isParagraphNode(next) || ($isTitleNode(title) && $isSubtitleNode(next))) {
          next.selectStart();
        } else {
          const paragraph = $createParagraphNode();
          title.insertAfter(paragraph);
          paragraph.selectStart();
        }
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    // Backspace at the start of the subtitle, or Delete at the end of the title, would join the two
    // lines: the title and the subtitle are never merged.
    const stopJoin = withSubtitle
      ? [
          editor.registerCommand(
            KEY_BACKSPACE_COMMAND,
            (event) => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
              const block = selection.anchor.getNode().getTopLevelElement();
              if (!$isSubtitleNode(block) || !isAtStart(selection)) return false;
              event?.preventDefault?.();
              return true;
            },
            COMMAND_PRIORITY_HIGH,
          ),
          editor.registerCommand(
            KEY_DELETE_COMMAND,
            (event) => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
              const block = selection.anchor.getNode().getTopLevelElement();
              if (!$isTitleNode(block) || !$isSubtitleNode(block.getNextSibling())) return false;
              if (!isAtEnd(selection)) return false;
              event?.preventDefault?.();
              return true;
            },
            COMMAND_PRIORITY_HIGH,
          ),
        ]
      : [];
    const stopMarks = editor.registerUpdateListener(({ editorState }) =>
      markEmpty(editor, editorState, placeholder, withSubtitle ? subtitle : null),
    );
    if (editable()) {
      editor.update(
        () => {
          ensure();
        },
        { tag: "history-merge" },
      );
    }
    markEmpty(editor, editor.getEditorState(), placeholder, withSubtitle ? subtitle : null);
    return () => {
      stopRoot();
      stopText();
      stopBreaks();
      stopEnter();
      stopJoin.forEach((stop) => stop());
      stopMarks();
    };
  }, [editor, placeholder, subtitle]);
  return null;
};

export default TitlePlugin;
