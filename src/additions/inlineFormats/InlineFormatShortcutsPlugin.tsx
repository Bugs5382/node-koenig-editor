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
import { COMMAND_PRIORITY_LOW, FORMAT_TEXT_COMMAND, KEY_DOWN_COMMAND } from "lexical";
import { useContext, useEffect } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { isToolbarItemHidden } from "../options";
import { $clearFormatting } from "../textStyle/textStyle";

// Shortcuts for the inline formats the selection toolbar offers. Underline (Ctrl or Cmd+U) and
// the others Lexical already handles are left to it. Added here: strikethrough with Ctrl or
// Cmd+Shift+X, subscript with Ctrl or Cmd+comma and superscript with Ctrl or Cmd+period. Each is
// off when the host's `toolbar` option leaves its button out.
export const INLINE_SHORTCUTS = [
  { code: "KeyX", format: "strikethrough", item: "strikethrough", shift: true },
  { code: "Comma", format: "subscript", item: "subscript", shift: false },
  { code: "Period", format: "superscript", item: "superscript", shift: false },
] as const;

export const InlineFormatShortcutsPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { toolbar } = useContext(KoenigComposerContext) as { toolbar?: readonly string[] | null };
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!editor.isEditable()) return false;
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
        // Ctrl or Cmd+backslash clears the formatting of the selected text
        if (
          !event.shiftKey &&
          (event.code === "Backslash" || (!event.code && event.key === "\\"))
        ) {
          if (isToolbarItemHidden(toolbar as never, "clearFormatting")) return false;
          event.preventDefault();
          $clearFormatting();
          return true;
        }
        const found = INLINE_SHORTCUTS.find(
          (entry) =>
            entry.shift === event.shiftKey &&
            (event.code === entry.code ||
              (!event.code && event.key === { KeyX: "x", Comma: ",", Period: "." }[entry.code])),
        );
        if (!found) return false;
        if (isToolbarItemHidden(toolbar as never, found.item)) return false;
        event.preventDefault();
        return editor.dispatchCommand(FORMAT_TEXT_COMMAND, found.format);
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, toolbar]);
  return null;
};

export default InlineFormatShortcutsPlugin;
