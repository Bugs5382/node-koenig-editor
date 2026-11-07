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
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  createCommand,
  type LexicalCommand,
} from "lexical";
import { type FC, useEffect, useRef, useState } from "react";

import { useKoenigTool } from "../options";
import { AnchoredMenu } from "../placement/AnchoredMenu";
import { EmojiPicker } from "./EmojiPicker";

/** Opens the emoji picker at the caret. Dispatched by the "Emoji" entry of the card menus. */
export const INSERT_EMOJI_COMMAND: LexicalCommand<void> = createCommand("KOENIG_INSERT_EMOJI");

/** The word typed after a slash that opens the picker. */
export const EMOJI_COMMAND = "/emoji";

/** True when `text` ends with the command at the start of a word: `/emoji` or `hello /emoji`,
 *  not `http://x/emoji`. */
export const endsWithEmojiCommand = (text: string): boolean =>
  text.endsWith(EMOJI_COMMAND) &&
  (text.length === EMOJI_COMMAND.length ||
    /\s/.test(text[text.length - EMOJI_COMMAND.length - 1]!));

// "/emoji" typed anywhere in the text (the main editor, a card's text, a table cell, a caption)
// opens the emoji picker at the caret; picking one replaces the typed command with the emoji,
// Escape closes the picker and leaves the text as typed. Where nothing was typed (the Emoji entry
// of the "+" and "/" menus) the emoji goes in at the caret.
export const EmojiCommandPlugin: FC = () => {
  const [editor] = useLexicalComposerContext();
  const enabled = useKoenigTool("emojiPicker");
  const [anchor, setAnchor] = useState<Element | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const typed = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const caretElement = () => {
      const node = window.getSelection()?.anchorNode;
      const element = node instanceof Element ? node : node?.parentElement;
      return element ?? editor.getRootElement();
    };
    const removeCommand = editor.registerCommand(
      INSERT_EMOJI_COMMAND,
      () => {
        if (!editor.isEditable()) return false;
        typed.current = false;
        setAnchor(caretElement());
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeListener = editor.registerUpdateListener(({ dirtyLeaves, tags }) => {
      if (!dirtyLeaves.size || tags.has("historic") || !editor.isEditable()) return;
      let hit = false;
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
        const node = selection.anchor.getNode();
        if (!$isTextNode(node)) return;
        hit = endsWithEmojiCommand(node.getTextContent().slice(0, selection.anchor.offset));
        // alone on a line in the main editor, "/emoji" belongs to the slash menu, which lists the
        // Emoji entry; everywhere else (inside text, a card's own text) the picker opens here
        const isMain = !(editor as unknown as { _parentEditor?: unknown })._parentEditor;
        if (hit && isMain && node.getTopLevelElement()?.getTextContent() === EMOJI_COMMAND) {
          hit = false;
        }
      });
      if (hit) {
        typed.current = true;
        setAnchor(caretElement());
      }
    });
    return () => {
      removeCommand();
      removeListener();
    };
  }, [editor, enabled]);

  if (!anchor) return null;

  const close = () => {
    setAnchor(null);
    editor.focus();
    editor.getRootElement()?.focus({ preventScroll: true });
  };

  const pick = (emoji: string) => {
    const replaceTyped = typed.current;
    editor.update(
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (replaceTyped) {
          const { anchor: point } = selection;
          const node = point.getNode();
          if ($isTextNode(node) && point.offset >= EMOJI_COMMAND.length) {
            selection.setTextNodeRange(
              node,
              point.offset - EMOJI_COMMAND.length,
              node,
              point.offset,
            );
          }
        }
        selection.insertText(emoji);
      },
      { discrete: true },
    );
    close();
  };

  return (
    <AnchoredMenu anchor={anchor} containerRef={container} measure="whole">
      <div data-kg-emoji-command onMouseDown={(event) => event.stopPropagation()}>
        <EmojiPicker onClose={close} onSelect={(emoji) => pick(emoji.native)} />
      </div>
    </AnchoredMenu>
  );
};

export default EmojiCommandPlugin;
