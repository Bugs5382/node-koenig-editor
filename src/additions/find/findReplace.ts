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
import {
  $createRangeSelection,
  $isElementNode,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from "lexical";

// Find and replace over the document's text. A match is a range in one block's text (a paragraph,
// heading, list item, table cell paragraph...), so it can run across bold, italic and other
// formatting inside the block. The query is plain text, never a pattern.

export interface Match {
  /** The block's key. */
  block: string;
  end: number;
  start: number;
}

interface Block {
  key: string;
  nodes: TextNode[];
  text: string;
}

const $blockOf = (node: LexicalNode): ElementNode | null => {
  let parent = node.getParent();
  while (parent && $isElementNode(parent) && parent.isInline()) parent = parent.getParent();
  return parent && $isElementNode(parent) ? parent : null;
};

/** The document's text blocks in reading order, each with its text nodes. */
const $blocks = (): Block[] => {
  const byKey = new Map<string, Block>();
  for (const { node } of $dfs()) {
    if (!$isTextNode(node)) continue;
    const block = $blockOf(node);
    if (!block) continue;
    let entry = byKey.get(block.getKey());
    if (!entry) {
      entry = { key: block.getKey(), nodes: [], text: "" };
      byKey.set(block.getKey(), entry);
    }
    entry.nodes.push(node);
    entry.text += node.getTextContent();
  }
  return [...byKey.values()];
};

/** Every match of `query` in reading order. */
export const $findMatches = (query: string, matchCase: boolean): Match[] => {
  if (!query) return [];
  const needle = matchCase ? query : query.toLowerCase();
  const matches: Match[] = [];
  for (const block of $blocks()) {
    const haystack = matchCase ? block.text : block.text.toLowerCase();
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(needle, from);
      if (index === -1) break;
      matches.push({ block: block.key, end: index + needle.length, start: index });
      from = index + needle.length;
    }
  }
  return matches;
};

const pointAt = (block: Block, offset: number, preferEnd: boolean) => {
  let left = offset;
  for (const node of block.nodes) {
    const size = node.getTextContentSize();
    if (left < size || (preferEnd && left === size)) return { key: node.getKey(), offset: left };
    left -= size;
  }
  const last = block.nodes[block.nodes.length - 1];
  return last ? { key: last.getKey(), offset: last.getTextContentSize() } : null;
};

/** The text nodes and offsets a match covers, for the page to highlight or the editor to select. */
export const $matchPoints = (
  match: Match,
): { end: { key: string; offset: number }; start: { key: string; offset: number } } | null => {
  const block = $blocks().find((entry) => entry.key === match.block);
  if (!block) return null;
  const start = pointAt(block, match.start, false);
  const end = pointAt(block, match.end, true);
  return start && end ? { end, start } : null;
};

/** Replaces one match with `replacement`. Inside an editor update. */
export const $replaceMatch = (match: Match, replacement: string): boolean => {
  const points = $matchPoints(match);
  if (!points) return false;
  const selection = $createRangeSelection();
  selection.anchor.set(points.start.key, points.start.offset, "text");
  selection.focus.set(points.end.key, points.end.offset, "text");
  $setSelection(selection);
  selection.insertText(replacement);
  return true;
};

/** Replaces every match, last to first so earlier positions stay valid; the number replaced.
 *  Inside an editor update. */
export const $replaceAll = (query: string, replacement: string, matchCase: boolean): number => {
  const matches = $findMatches(query, matchCase);
  let count = 0;
  for (const match of matches.reverse()) {
    if ($replaceMatch(match, replacement)) count += 1;
  }
  return count;
};
