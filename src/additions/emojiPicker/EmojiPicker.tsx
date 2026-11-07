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
import { type FC, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { type EmojiEntry, type EmojiGroup, loadEmojiGroups, searchEmoji } from "./data";

interface EmojiPickerProps {
  onClose?: () => void;
  onSelect: (emoji: { native: string }) => void;
}

// Used only when the browser cannot say how many columns the grid has (the grid wraps to fit).
const FALLBACK_COLUMNS = 8;

// An offline emoji picker. Keyboard: Down from the search box enters the grid; arrows, Home and
// End move through it (Up from the top row returns to the search); Enter picks; typing goes to
// the search box; Escape closes. The emoji are real buttons in a listbox, each named in words.
export const EmojiPicker: FC<EmojiPickerProps> = ({ onClose, onSelect }) => {
  const strings = useKoenigStrings();
  const t = strings.emojiPicker;
  const idBase = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<EmojiGroup[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EmojiGroup["category"]>("smileys");

  useEffect(() => {
    let cancelled = false;
    loadEmojiGroups().then(
      (loaded) => {
        if (!cancelled) setGroups(loaded);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const searching = query.trim().length > 0;
  const shown: EmojiEntry[] = useMemo(() => {
    if (!groups) return [];
    if (searching) return searchEmoji(groups, query);
    return groups.find((group) => group.category === category)?.emojis ?? [];
  }, [groups, searching, query, category]);

  const options = () => [
    ...(gridRef.current?.querySelectorAll<HTMLElement>("[role='option']") ?? []),
  ];
  // The grid wraps to the room it has, so the number of columns is read from the layout.
  const columns = () => {
    const value = gridRef.current
      ? window.getComputedStyle(gridRef.current).gridTemplateColumns
      : "";
    // "none" (no layout) and the like have no track sizes in them
    const tracks = value.split(" ").filter((track) => /\d/.test(track));
    return tracks.length > 0 ? tracks.length : FALLBACK_COLUMNS;
  };
  const focusOption = (index: number) => {
    const list = options();
    list[Math.min(Math.max(index, 0), list.length - 1)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }
    const target = event.target as HTMLElement;
    if (target === searchRef.current) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOption(0);
      } else if (event.key === "Enter" && shown[0]) {
        event.preventDefault();
        onSelect({ native: shown[0].emoji });
      }
      return;
    }
    if (target.getAttribute("role") !== "option") return;
    const index = options().indexOf(target);
    const perRow = columns();
    const move = (to: number) => {
      event.preventDefault();
      focusOption(to);
    };
    switch (event.key) {
      case "ArrowRight":
        return move(index + 1);
      case "ArrowLeft":
        return move(index - 1);
      case "ArrowDown":
        return move(index + perRow);
      case "ArrowUp":
        if (index < perRow) {
          event.preventDefault();
          searchRef.current?.focus();
          return;
        }
        return move(index - perRow);
      case "Home":
        return move(0);
      case "End":
        return move(options().length - 1);
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect({ native: target.textContent ?? "" });
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          searchRef.current?.focus();
        }
    }
  };

  return (
    <div
      aria-label={t.label}
      className="not-kg-prose flex w-[min(36rem,92vw)] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-grey-900 shadow-lg dark:bg-grey-950 dark:text-grey-300"
      role="dialog"
      onKeyDown={onKeyDown}
    >
      <input
        ref={searchRef}
        aria-controls={`${idBase}-grid`}
        aria-label={t.searchLabel}
        className="w-full rounded-md border border-grey-300 bg-white px-2 py-1 text-sm dark:bg-grey-900"
        placeholder={t.searchPlaceholder}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div
        aria-label={t.categoriesLabel}
        className="flex flex-wrap justify-between gap-1"
        role="group"
      >
        {(groups ?? []).map((group) => (
          <button
            key={group.category}
            aria-label={t.categories[group.category]}
            aria-pressed={!searching && group.category === category}
            className="rounded-md px-1 text-lg aria-pressed:bg-grey-100 dark:aria-pressed:bg-grey-900"
            title={t.categories[group.category]}
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(group.category);
            }}
          >
            {group.emojis[0]?.emoji}
          </button>
        ))}
      </div>

      {!groups && !failed ? <p className="m-0 text-sm">{t.loading}</p> : null}
      {failed ? (
        <p className="m-0 text-sm" role="alert">
          {t.loadError}
        </p>
      ) : null}
      {groups && searching && shown.length === 0 ? (
        <p className="m-0 text-sm" role="status">
          {t.noResults}
        </p>
      ) : null}

      <div
        ref={gridRef}
        aria-label={t.label}
        className="grid max-h-[min(22.4rem,40vh)] grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-1 overflow-y-auto overflow-x-hidden"
        id={`${idBase}-grid`}
        role="listbox"
      >
        {shown.map((entry, index) => (
          <button
            key={entry.slug}
            aria-label={entry.name}
            aria-selected={false}
            className="rounded-md text-xl hover:bg-grey-100 focus:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900 dark:focus:bg-grey-900"
            role="option"
            tabIndex={index === 0 ? 0 : -1}
            title={entry.name}
            type="button"
            onClick={() => onSelect({ native: entry.emoji })}
          >
            {entry.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
