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
import type { KoenigEmojiCategory } from "node-koenig-editor";

export interface EmojiEntry {
  emoji: string;
  name: string;
  slug: string;
}

export interface EmojiGroup {
  category: KoenigEmojiCategory;
  emojis: EmojiEntry[];
}

// The data set's group names, mapped to the picker's own keys (which the wording is keyed on).
const CATEGORY_OF: Record<string, KoenigEmojiCategory> = {
  Activities: "activities",
  "Animals & Nature": "animals",
  "Food & Drink": "food",
  Flags: "flags",
  Objects: "objects",
  "People & Body": "people",
  "Smileys & Emotion": "smileys",
  Symbols: "symbols",
  "Travel & Places": "travel",
};

let pending: Promise<EmojiGroup[]> | undefined;

/**
 * The emoji, by group. The data set (unicode-emoji-json, MIT) is a dependency of the package
 * that stays out of the built file: this import() runs the first time a picker opens, and a
 * host's bundler splits it into its own chunk. Nothing is fetched from a server we do not own.
 */
export const loadEmojiGroups = (): Promise<EmojiGroup[]> => {
  pending ??= import("unicode-emoji-json/data-by-group.json").then((module) =>
    module.default.flatMap((group) => {
      const category = CATEGORY_OF[group.name];
      return category ? [{ category, emojis: group.emojis }] : [];
    }),
  );
  pending.catch(() => {
    pending = undefined; // let a later open try again
  });
  return pending;
};

/** Emoji whose name or slug holds every word of `query`, in data-set order. */
export const searchEmoji = (groups: readonly EmojiGroup[], query: string): EmojiEntry[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return groups.flatMap((group) =>
    group.emojis.filter((entry) => {
      const haystack = `${entry.name} ${entry.slug}`.toLowerCase().replace(/_/g, " ");
      return words.every((word) => haystack.includes(word));
    }),
  );
};
