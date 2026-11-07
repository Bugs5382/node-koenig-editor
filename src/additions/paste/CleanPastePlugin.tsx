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
import { $generateNodesFromDOM } from "@lexical/html";
import { $insertGeneratedNodes } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from "lexical";
import { useEffect } from "react";

import { useKoenigTool } from "../options";
import { cleanPastedHtml } from "./cleanPaste";

// Cleans HTML pasted from Word, Google Docs and web pages (see cleanPaste) before the editor reads
// it. Left alone: copying inside the editor (it carries its own clipboard format), a single link
// (the editor turns it into a link or card), a picture with an image file, and plain text.
export const CleanPastePlugin = () => {
  const [editor] = useLexicalComposerContext();
  const enabled = useKoenigTool("cleanPaste");
  useEffect(() => {
    if (!enabled) return undefined;
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent | InputEvent | KeyboardEvent) => {
        const data = (event as ClipboardEvent).clipboardData;
        if (!data || !editor.isEditable()) return false;
        if (document.activeElement && document.activeElement !== editor.getRootElement())
          return false;
        if (data.types && [...data.types].includes("application/x-lexical-editor")) return false;
        const html = data.getData("text/html");
        if (!html) return false;
        const text = data.getData("text/plain");
        if (/^https?:\/\/\S+$/.test(text ?? "")) return false;
        const hasImageFile = [...(data.files ?? [])].some((file) => file.type.startsWith("image/"));
        if (hasImageFile && /<\s*img\b/i.test(html)) return false;
        const cleaned = cleanPastedHtml(html);
        if (!cleaned) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        event.preventDefault();
        const dom = new DOMParser().parseFromString(cleaned, "text/html");
        $insertGeneratedNodes(editor, $generateNodesFromDOM(editor, dom), selection);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, enabled]);
  return null;
};

export default CleanPastePlugin;
