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
import type { KoenigToolbarItem } from "node-koenig-editor";

import {
  altOrOption,
  ctrlOrCmdSymbol,
  ctrlOrSymbol,
  shiftOrSymbol,
} from "../../koenig-lexical/utils/shortcutSymbols";

// The shortcuts the editor answers to, as data for the list the person can open. A shortcut that
// belongs to a toolbar button is left out of the list when the host's `toolbar` option leaves
// that button out, as the shortcut itself is then off.

export type ShortcutGroup = "align" | "blocks" | "general" | "text";

export interface ShortcutEntry {
  group: ShortcutGroup;
  id: string;
  /** The keys, as shown, for this platform. */
  keys: () => string[];
  /** The toolbar button this shortcut belongs to, if any. */
  item?: KoenigToolbarItem;
  /** The tool this shortcut belongs to (find and replace), if any. */
  tool?: "findReplace";
}

const heading = (n: number): ShortcutEntry => ({
  group: "blocks",
  id: `heading${n}`,
  item: `heading${n}` as KoenigToolbarItem,
  keys: () => [ctrlOrSymbol(), altOrOption(), String(n)],
});

const align = (id: string, key: string): ShortcutEntry => ({
  group: "align",
  id,
  item: id as KoenigToolbarItem,
  keys: () => [ctrlOrCmdSymbol(), shiftOrSymbol(), key],
});

export const SHORTCUTS: readonly ShortcutEntry[] = [
  { group: "text", id: "bold", item: "bold", keys: () => [ctrlOrCmdSymbol(), "B"] },
  { group: "text", id: "italic", item: "italic", keys: () => [ctrlOrCmdSymbol(), "I"] },
  { group: "text", id: "underline", item: "underline", keys: () => [ctrlOrCmdSymbol(), "U"] },
  {
    group: "text",
    id: "strikethrough",
    item: "strikethrough",
    keys: () => [ctrlOrCmdSymbol(), shiftOrSymbol(), "X"],
  },
  { group: "text", id: "subscript", item: "subscript", keys: () => [ctrlOrCmdSymbol(), ","] },
  { group: "text", id: "superscript", item: "superscript", keys: () => [ctrlOrCmdSymbol(), "."] },
  {
    group: "text",
    id: "clearFormatting",
    item: "clearFormatting",
    keys: () => [ctrlOrCmdSymbol(), "\\"],
  },
  { group: "text", id: "link", item: "link", keys: () => [ctrlOrCmdSymbol(), "K"] },
  heading(1),
  heading(2),
  heading(3),
  heading(4),
  heading(5),
  { group: "blocks", id: "quote", item: "quote", keys: () => [ctrlOrSymbol(), "Q"] },
  align("alignLeft", "L"),
  align("alignCenter", "E"),
  align("alignRight", "R"),
  align("alignJustify", "J"),
  { group: "general", id: "undo", keys: () => [ctrlOrCmdSymbol(), "Z"] },
  { group: "general", id: "redo", keys: () => [ctrlOrCmdSymbol(), shiftOrSymbol(), "Z"] },
  { group: "general", id: "toolbar", keys: () => [altOrOption(), "F10"] },
  { group: "general", id: "shortcuts", keys: () => [ctrlOrCmdSymbol(), "/"] },
  { group: "general", id: "find", keys: () => [ctrlOrCmdSymbol(), "F"], tool: "findReplace" },
];

export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = ["text", "blocks", "align", "general"];
