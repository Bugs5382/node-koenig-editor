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
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useEffect } from "react";

// While the editor is read-only (the reader's view, or a host that gave `editable={false}`), the
// keys and clicks that would select a card, edit, or undo do nothing. Lexical's own handlers
// already refuse most edits when it is not editable; selecting a card, entering its edit mode and
// undo are Koenig's and Lexical's history, and are not covered by that. Swallowing these leaves
// the browser's own behaviour (scrolling, following a link) alone.
const GUARDED = [
  CLICK_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
] as const;

export const ReadOnlyGuardPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregister = GUARDED.map((command) =>
      editor.registerCommand(
        command as never,
        () => !editor.isEditable(),
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
    return () => unregister.forEach((stop) => stop());
  }, [editor]);
  return null;
};

export default ReadOnlyGuardPlugin;
