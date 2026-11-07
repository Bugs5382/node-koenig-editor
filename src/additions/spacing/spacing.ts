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
import { $getState, $isElementNode, $isRangeSelection, $setState, createState } from "lexical";
import type { BaseSelection, ElementNode, LexicalEditor } from "lexical";

// Line spacing (the height of a line, as a multiple of the text size) and paragraph spacing (the
// space after a block) for the blocks of the selection. Saved on the block as node state, drawn
// as inline CSS in the editor, and written as inline CSS into the saved HTML.

export const LINE_SPACINGS = [
  { id: "1", value: 1 },
  { id: "1.15", value: 1.15 },
  { id: "1.5", value: 1.5 },
  { id: "2", value: 2 },
] as const;

export const PARAGRAPH_SPACINGS = [
  { id: "none", value: "0" },
  { id: "small", value: "0.5em" },
  { id: "medium", value: "1em" },
  { id: "large", value: "1.5em" },
] as const;

export type ParagraphSpacingId = (typeof PARAGRAPH_SPACINGS)[number]["id"];

export interface Spacing {
  after?: ParagraphSpacingId;
  line?: number;
}

const parse = (value: unknown): Spacing | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const result: Spacing = {};
  if (typeof raw.line === "number" && LINE_SPACINGS.some((entry) => entry.value === raw.line)) {
    result.line = raw.line;
  }
  if (PARAGRAPH_SPACINGS.some((entry) => entry.id === raw.after)) {
    result.after = raw.after as ParagraphSpacingId;
  }
  return result.line !== undefined || result.after !== undefined ? result : null;
};

const spacingState = createState("kgSpacing", {
  isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  parse,
});

export const $getSpacing = (node: ElementNode): Spacing | null => $getState(node, spacingState);

/** The top-level blocks the selection touches. */
const $blocksOf = (selection: BaseSelection | null): ElementNode[] => {
  if (!$isRangeSelection(selection)) return [];
  const blocks = new Map<string, ElementNode>();
  for (const node of selection.getNodes()) {
    const block = node.getTopLevelElement();
    if ($isElementNode(block)) blocks.set(block.getKey(), block);
  }
  return [...blocks.values()];
};

/** Changes the line spacing and/or the paragraph spacing of the selected blocks; null for a field
 *  goes back to the default. Inside an editor update. */
export const $setSpacing = (
  selection: BaseSelection | null,
  patch: { after?: null | ParagraphSpacingId; line?: null | number },
): void => {
  for (const block of $blocksOf(selection)) {
    const next: Spacing = { ...$getSpacing(block) };
    if (patch.line !== undefined) {
      if (patch.line === null) delete next.line;
      else next.line = patch.line;
    }
    if (patch.after !== undefined) {
      if (patch.after === null) delete next.after;
      else next.after = patch.after;
    }
    $setState(
      block,
      spacingState,
      next.line !== undefined || next.after !== undefined ? next : null,
    );
  }
};

/** The spacing common to the selected blocks, field by field (a field that differs is left out). */
export const $getSelectionSpacing = (selection: BaseSelection | null): Spacing | null => {
  const blocks = $blocksOf(selection);
  if (blocks.length === 0) return null;
  const all = blocks.map((block) => $getSpacing(block));
  const result: Spacing = {};
  const line = all[0]?.line;
  if (line !== undefined && all.every((entry) => entry?.line === line)) result.line = line;
  const after = all[0]?.after;
  if (after !== undefined && all.every((entry) => entry?.after === after)) result.after = after;
  return result.line !== undefined || result.after !== undefined ? result : null;
};

/** The CSS a block's spacing becomes. */
export const spacingCss = (
  spacing: Spacing | null,
): { lineHeight?: string; marginBottom?: string } => {
  const css: { lineHeight?: string; marginBottom?: string } = {};
  if (spacing?.line !== undefined) css.lineHeight = String(spacing.line);
  const after = PARAGRAPH_SPACINGS.find((entry) => entry.id === spacing?.after);
  if (after) css.marginBottom = after.value;
  return css;
};

/** Writes a block's spacing onto its element, and clears what an earlier value left. */
export const $syncSpacing = (editor: LexicalEditor, block: ElementNode): void => {
  const element = editor.getElementByKey(block.getKey());
  if (!element) return;
  const css = spacingCss($getSpacing(block));
  if ((element.style.lineHeight || "") !== (css.lineHeight ?? "")) {
    if (css.lineHeight) element.style.lineHeight = css.lineHeight;
    else element.style.removeProperty("line-height");
  }
  if ((element.style.marginBottom || "") !== (css.marginBottom ?? "")) {
    if (css.marginBottom) element.style.marginBottom = css.marginBottom;
    else element.style.removeProperty("margin-bottom");
  }
};

/** Whether the selection has any spacing set, for the toolbar's active marks. */
export const $hasSpacing = (selection: BaseSelection | null): { after: boolean; line: boolean } => {
  const spacing = $getSelectionSpacing(selection);
  return { after: spacing?.after !== undefined, line: spacing?.line !== undefined };
};
