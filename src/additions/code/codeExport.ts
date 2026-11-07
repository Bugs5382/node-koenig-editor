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
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import type {
  DOMExportOutput,
  DOMExportOutputMap,
  Klass,
  LexicalEditor,
  LexicalNode,
} from "lexical";

// A code block in the saved HTML: `<pre class="language-x" data-language="x">` with the code as
// plain text. The highlighter's token spans and the line-number gutter are screen decoration and
// stay out of what is saved, so a host's own highlighter can colour it again.

const withLanguageClass = (editor: LexicalEditor, target: LexicalNode): DOMExportOutput => {
  const output = (target as unknown as { exportDOM(e: LexicalEditor): DOMExportOutput }).exportDOM(
    editor,
  );
  const element = output.element;
  const language = (target as CodeNode).getLanguage();
  if (element instanceof HTMLElement) {
    element.classList.remove("kg-code-block");
    if (!element.classList.length) element.removeAttribute("class");
    element.removeAttribute("data-highlight-language");
    element.removeAttribute("data-gutter");
    if (language) element.classList.add(`language-${language}`);
  }
  return output;
};

const asPlainText = (_editor: LexicalEditor, target: LexicalNode): DOMExportOutput => ({
  element: document.createTextNode(target.getTextContent()),
});

export const CODE_HTML_EXPORT: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [CodeNode, withLanguageClass],
  [CodeHighlightNode, asPlainText],
]);

export default CODE_HTML_EXPORT;
