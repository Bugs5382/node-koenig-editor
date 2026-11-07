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
import { $dfs } from "@lexical/utils";
import { $getState, $setState, createState, type LexicalNode } from "lexical";

// The optional figure entry: a label ("Table", "Figure", anything), an automatic number, a title,
// and whether it sits above or below. One model for tables, images and galleries, so they read
// and number alike. It is saved as state on the node, and the saved HTML gets a real caption (on
// a table) or figcaption (on a figure).

export interface Figure {
  /** True when the entry sits above the table or picture. */
  above: boolean;
  /** "Table", "Figure", or any text; empty for a title with no label. */
  label: string;
  /** When true, the label is followed by its number among the figures with the same label. */
  numbered: boolean;
  title: string;
}

const parse = (value: unknown): Figure | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    above: raw.above === true,
    label: typeof raw.label === "string" ? raw.label : "",
    numbered: raw.numbered !== false,
    title: typeof raw.title === "string" ? raw.title : "",
  };
};

const figureState = createState("kgFigure", {
  isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  parse,
});

export const $getFigure = (node: LexicalNode): Figure | null => $getState(node, figureState);

/** Sets the figure entry, or removes it with null. Inside an editor update. */
export const $setFigure = (node: LexicalNode, figure: Figure | null): void => {
  $setState(node, figureState, figure);
};

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The number of a numbered figure among those with the same label, in reading order; 0 if not numbered. */
export const $figureNumber = (node: LexicalNode): number => {
  const figure = $getFigure(node);
  if (!figure?.numbered || !figure.label.trim()) return 0;
  let count = 0;
  for (const { node: other } of $dfs()) {
    const entry = $getFigure(other);
    if (entry?.numbered && sameLabel(entry.label, figure.label)) count += 1;
    if (other.is(node)) return count;
  }
  return 0;
};

/** "Figure 2: Sunrise", "Figure: Sunrise" (not numbered), "Sunrise" (no label), or "" for nothing. */
export const $figureText = (node: LexicalNode): string => {
  const figure = $getFigure(node);
  if (!figure) return "";
  const label = figure.label.trim();
  const number = $figureNumber(node);
  const head = label ? (number ? `${label} ${number}` : label) : "";
  const title = figure.title.trim();
  if (head && title) return `${head}: ${title}`;
  return head || title;
};
