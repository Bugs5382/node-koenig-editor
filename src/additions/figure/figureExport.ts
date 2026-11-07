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
import type {
  DOMExportOutput,
  LexicalEditor,
  LexicalNode,
} from "lexical";

import { $figureText, $getFigure } from "./figure";

// The figure entry in the saved HTML of a picture card. The card already exports a `figure` with
// the author's caption as its `figcaption`. With no caption the entry becomes the figcaption; with
// one, the entry is a line of its own (a `div`) above the picture or between the picture and the
// caption, since a figure holds only one figcaption.
export const withFigureEntry = (editor: LexicalEditor, target: LexicalNode): DOMExportOutput => {
  const output = (target as unknown as { exportDOM(e: LexicalEditor): DOMExportOutput }).exportDOM(
    editor,
  );
  const element = output.element;
  const text = $figureText(target);
  if (!text || !(element instanceof HTMLElement)) return output;
  const above = $getFigure(target)?.above === true;
  const caption = element.querySelector(":scope > figcaption");
  const line = element.ownerDocument.createElement(caption ? "div" : "figcaption");
  line.className = "kg-figure-entry";
  line.textContent = text;
  if (above) element.insertBefore(line, element.firstChild);
  else if (caption) element.insertBefore(line, caption);
  else element.append(line);
  return output;
};
