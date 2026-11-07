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
import { COMMAND_PRIORITY_LOW, FORMAT_ELEMENT_COMMAND, KEY_DOWN_COMMAND } from "lexical";
import { useContext, useEffect } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { isToolbarItemHidden } from "../options";
import { ALIGN_OF_KEY } from "./alignment";

const ITEM_OF_ALIGN = {
  center: "alignCenter",
  justify: "alignJustify",
  left: "alignLeft",
  right: "alignRight",
} as const;

// Ctrl or Cmd with Shift and L, E, R or J: align left, centre, right or justify the selection's
// block. Off for an alignment the host's `toolbar` option leaves out, and in nested card text.
export const AlignmentShortcutsPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { toolbar } = useContext(KoenigComposerContext) as { toolbar?: readonly string[] | null };
  useEffect(() => {
    if (editor._parentEditor) return undefined;
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!editor.isEditable()) return false;
        if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) return false;
        const letter = event.code?.startsWith("Key")
          ? event.code.slice(3)
          : event.key.toUpperCase();
        const align = ALIGN_OF_KEY[letter];
        if (!align) return false;
        if (isToolbarItemHidden(toolbar as never, ITEM_OF_ALIGN[align])) return false;
        event.preventDefault();
        return editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, toolbar]);
  return null;
};

export default AlignmentShortcutsPlugin;
