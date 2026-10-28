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
import type { Klass, LexicalNode, LexicalNodeReplacement } from "lexical";
import type { KoenigCardName } from "node-koenig-editor";

type EditorNode = Klass<LexicalNode> | LexicalNodeReplacement;

/** The cards the package ships, as a host names them. */
export const KOENIG_CARD_NAMES: readonly KoenigCardName[] = [
  "image",
  "divider",
  "callout",
  "toggle",
  "table",
];

// The node types each card registers. Leaving a card out leaves these out, and
// the menus list only cards whose nodes are registered.
export const CARD_NODE_TYPES: Record<KoenigCardName, readonly string[]> = {
  callout: ["callout"],
  divider: ["horizontalrule"],
  image: ["image"],
  table: ["table", "tablerow", "tablecell"],
  toggle: ["toggle"],
};

/** The card a node type belongs to, for the menu's wording. */
export const cardForNodeType = (nodeType: string): KoenigCardName | undefined =>
  KOENIG_CARD_NAMES.find((card) => CARD_NODE_TYPES[card].includes(nodeType));

const nodeType = (node: EditorNode): string =>
  "replace" in node ? node.replace.getType() : node.getType();

/** The node set for a composer: the base set minus unpicked cards, plus the host's nodes. */
export const selectEditorNodes = (
  base: readonly EditorNode[],
  cards: readonly KoenigCardName[] | undefined,
  customNodes: readonly EditorNode[] | undefined,
): EditorNode[] => {
  const left = new Set(
    KOENIG_CARD_NAMES.filter((card) => cards && !cards.includes(card)).flatMap(
      (card) => CARD_NODE_TYPES[card],
    ),
  );
  return [...base.filter((node) => !left.has(nodeType(node))), ...(customNodes ?? [])];
};
