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
import { ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  type DOMExportOutput,
  type DOMExportOutputMap,
  type ElementNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  ParagraphNode,
} from "lexical";

import { $getSpacing, spacingCss } from "./spacing";

// A block's spacing in the saved HTML: inline `line-height` and `margin-bottom` on the block.
const withSpacing = (editor: LexicalEditor, target: LexicalNode): DOMExportOutput => {
  const output = (target as unknown as { exportDOM(e: LexicalEditor): DOMExportOutput }).exportDOM(
    editor,
  );
  const element = output.element;
  if (element instanceof HTMLElement) {
    const css = spacingCss($getSpacing(target as ElementNode));
    if (css.lineHeight) element.style.lineHeight = css.lineHeight;
    if (css.marginBottom) element.style.marginBottom = css.marginBottom;
  }
  return output;
};

export const SPACING_HTML_EXPORT: DOMExportOutputMap = new Map<
  Klass<LexicalNode>,
  (editor: LexicalEditor, target: LexicalNode) => DOMExportOutput
>([
  [ParagraphNode, withSpacing],
  [HeadingNode, withSpacing],
  [QuoteNode, withSpacing],
  [ListNode, withSpacing],
]);

export default SPACING_HTML_EXPORT;
