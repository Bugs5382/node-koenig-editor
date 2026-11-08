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
import { $isCodeNode } from "@lexical/code";
import { $insertGeneratedNodes } from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from "lexical";
import { useContext, useEffect } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext.jsx";
import { renderMarkdown } from "../../kg-default-nodes/utils/render-markdown.js";
import { cleanPastedHtml } from "./cleanPaste";

// Plain text that is written in Markdown: a heading, a list item, a fence, a quote, bold or a link.
const LOOKS_LIKE_MARKDOWN =
  /(^|\n)\s{0,3}(#{1,6}\s+\S|[-*+]\s+\S|\d+[.)]\s+\S|>\s?\S|```)|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\(https?:[^)\s]+\)/;

/** True when `text` reads as Markdown and is more than one bare link. */
export const looksLikeMarkdown = (text: string): boolean =>
  !/^https?:\/\/\S+$/.test(text.trim()) && LOOKS_LIKE_MARKDOWN.test(text);

// Off unless the host sets the composer's `pasteMarkdown`. Plain text copied from a Markdown source
// is turned into real headings, lists and formats; a paste that also carries HTML is left to the
// clean-paste handling, and a paste into a code block stays as typed.
export const PasteMarkdownPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { pasteMarkdown } = useContext(KoenigComposerContext) as { pasteMarkdown?: boolean };
  useEffect(() => {
    if (!pasteMarkdown) return undefined;
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent | InputEvent | KeyboardEvent) => {
        const data = (event as ClipboardEvent).clipboardData;
        if (!data || !editor.isEditable()) return false;
        if (data.types && [...data.types].includes("application/x-lexical-editor")) return false;
        if (data.getData("text/html")) return false;
        const text = data.getData("text/plain");
        if (!text || !looksLikeMarkdown(text)) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        if ($isCodeNode(selection.anchor.getNode().getTopLevelElement())) return false;
        const cleaned = cleanPastedHtml(renderMarkdown(text));
        if (!cleaned) return false;
        event.preventDefault();
        const dom = new DOMParser().parseFromString(cleaned, "text/html");
        $insertGeneratedNodes(editor, $generateNodesFromDOM(editor, dom), selection);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, pasteMarkdown]);
  return null;
};

export default PasteMarkdownPlugin;
