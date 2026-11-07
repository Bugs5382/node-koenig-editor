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
import { INSERT_EMOJI_COMMAND } from "../emojiPicker/EmojiCommandPlugin";
import { EmojiMenuIcon } from "../emojiPicker/EmojiMenuIcon";
import { cardForNodeType } from "./cards";
import type { KoenigStrings } from "node-koenig-editor";

interface MenuEntry {
  label?: string;
  desc?: string;
  [key: string]: unknown;
}

type CardMenuNode = [string, { kgMenu: MenuEntry | MenuEntry[] }];

interface MenuContext {
  /** Adds the Emoji entry, which opens the emoji picker at the caret. */
  emoji?: boolean;
  menuItems?: readonly MenuEntry[];
  strings: KoenigStrings;
}

const reword = (entry: MenuEntry, strings: KoenigStrings, nodeType: string): MenuEntry => {
  const card = cardForNodeType(nodeType);
  return card ? { ...entry, ...strings.cards[card] } : entry;
};

/**
 * What the "+" and slash menus list: the registered card nodes with a menu entry
 * (from getEditorCardNodes), in the host's wording, then the host's own entries.
 */
export const getCardMenuNodes = (
  cardNodes: readonly CardMenuNode[],
  { emoji, menuItems, strings }: MenuContext,
): CardMenuNode[] => {
  const nodes = cardNodes.map(([nodeType, klass]): CardMenuNode => {
    const menu = klass.kgMenu;
    return [
      nodeType,
      {
        kgMenu: Array.isArray(menu)
          ? menu.map((entry, index) => (index === 0 ? reword(entry, strings, nodeType) : entry))
          : reword(menu, strings, nodeType),
      },
    ];
  });
  if (emoji) {
    nodes.push([
      "koenig-emoji",
      {
        kgMenu: {
          ...strings.emoji,
          Icon: EmojiMenuIcon,
          insertCommand: INSERT_EMOJI_COMMAND,
          matches: ["emoji", "smiley"],
          priority: 12,
          shortcut: "/emoji",
        },
      },
    ]);
  }
  (menuItems ?? []).forEach((entry, index) => {
    nodes.push([`host-menu-item-${index}`, { kgMenu: entry }]);
  });
  return nodes;
};
