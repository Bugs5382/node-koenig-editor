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
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { type EditorDocument, findImageCards, resolveFeaturedImage } from "../blocks/blocks";
import { DEFAULT_POST_SETTINGS_STRINGS, type PostSettingsStrings } from "./strings";

export interface PostSettingsValue {
  displayTitle: string;
  displaySubtitle: string;
  /** The stable id of the chosen image card; `""` for none. */
  featuredImageId: string;
  topicIds: string[];
}

export interface PostSettingsTopic {
  id: string;
  label: string;
}

export interface PostSettingsItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface PostSettingsMenuProps {
  /** The saved document (string, object or editor state): the images come from it. */
  document: EditorDocument;
  value: PostSettingsValue;
  onChange: (value: PostSettingsValue) => void;
  /** The pre-set list the person chooses topics from; there is no free text. Omit to hide Topics. */
  topics?: readonly PostSettingsTopic[];
  /** The most topics a post may have. Default 5. */
  maxTopics?: number;
  /** The host's own entries (share link, revision history ...), listed under the settings. */
  items?: readonly PostSettingsItem[];
  strings?: Partial<PostSettingsStrings>;
  disabled?: boolean;
  darkMode?: boolean;
  className?: string;
}

const DotsIcon = () => (
  <svg aria-hidden="true" className="size-4 shrink-0" fill="currentColor" viewBox="0 0 16 16">
    <circle cx="3" cy="8" r="1.4" />
    <circle cx="8" cy="8" r="1.4" />
    <circle cx="13" cy="8" r="1.4" />
  </svg>
);

const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

const FIELD =
  "w-full rounded-md border border-grey-300 bg-white px-2.5 py-1.5 font-sans text-sm text-grey-900 outline-0 placeholder:text-grey-500 focus-visible:ring-2 focus-visible:ring-grey-500 dark:border-grey-800 dark:bg-grey-950 dark:text-grey-200";
const LABEL = "mb-1 block font-sans text-sm font-semibold text-grey-900 dark:text-grey-200";
const HINT = "mt-1 font-sans text-xs text-grey-700 dark:text-grey-500";
const BUTTON =
  "cursor-pointer rounded-md border border-grey-300 bg-white px-2.5 py-1 font-sans text-sm text-grey-900 outline-0 hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-grey-500 disabled:cursor-default disabled:opacity-50 dark:border-grey-800 dark:bg-grey-950 dark:text-grey-200 dark:hover:bg-grey-900";

/**
 * The Medium-style post "..." menu: a three-dots button that opens a card with the display title
 * and subtitle, the featured image (picked from the image cards in the document), topics chosen
 * from a list the host supplies, and the host's own entries. It is controlled and knows nothing
 * about where the post is saved. Place it next to the host's Publish or Save button.
 */
export const PostSettingsMenu = ({
  className,
  darkMode = false,
  disabled = false,
  document: source,
  items = [],
  maxTopics = 5,
  onChange,
  strings: hostStrings,
  topics,
  value,
}: PostSettingsMenuProps) => {
  const text = useMemo(() => ({ ...DEFAULT_POST_SETTINGS_STRINGS, ...hostStrings }), [hostStrings]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const images = useMemo(() => findImageCards(source), [source]);
  const featured = useMemo(
    () => (value.featuredImageId ? resolveFeaturedImage(source, value.featuredImageId) : null),
    [source, value.featuredImageId],
  );
  const set = (changes: Partial<PostSettingsValue>) => onChange({ ...value, ...changes });

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    // focus moves into the card, onto its first field
    panel.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    window.document.addEventListener("mousedown", onPointer);
    return () => window.document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const topicLabel = (topicId: string) =>
    topics?.find((topic) => topic.id === topicId)?.label ?? topicId;
  const atLimit = value.topicIds.length >= maxTopics;
  const toggleTopic = (topicId: string) => {
    if (value.topicIds.includes(topicId)) {
      set({ topicIds: value.topicIds.filter((entry) => entry !== topicId) });
    } else if (!atLimit) {
      set({ topicIds: [...value.topicIds, topicId] });
    }
  };

  return (
    <span
      ref={root}
      className={`koenig-lexical relative inline-block ${darkMode ? "dark" : ""} ${className ?? ""}`}
      data-kg-post-settings
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close(true);
        }
      }}
    >
      <button
        ref={button}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={text.button}
        className={`${BUTTON} flex items-center justify-center`}
        data-kg-post-settings-button
        disabled={disabled}
        title={text.button}
        type="button"
        onClick={() => setOpen(!open)}
      >
        <DotsIcon />
      </button>
      {open ? (
        <div
          ref={panel}
          aria-label={text.title}
          className="absolute right-0 top-full z-50 mt-2 max-h-[80vh] w-[34rem] max-w-[90vw] overflow-y-auto rounded-lg border border-grey-300 bg-white p-4 text-left shadow-lg dark:border-grey-800 dark:bg-grey-950"
          data-kg-post-settings-panel
          id={`${id}-panel`}
          role="dialog"
        >
          <div className="mb-4">
            <label className={LABEL} htmlFor={`${id}-title`}>
              {text.displayTitle}
            </label>
            <input
              aria-describedby={`${id}-title-hint`}
              className={FIELD}
              id={`${id}-title`}
              placeholder={text.displayTitlePlaceholder}
              type="text"
              value={value.displayTitle}
              onChange={(event) => set({ displayTitle: event.target.value })}
            />
            <p className={HINT} id={`${id}-title-hint`}>
              {text.displayTitleHint}
            </p>
          </div>
          <div className="mb-4">
            <label className={LABEL} htmlFor={`${id}-subtitle`}>
              {text.displaySubtitle}
            </label>
            <input
              aria-describedby={`${id}-subtitle-hint`}
              className={FIELD}
              id={`${id}-subtitle`}
              placeholder={text.displaySubtitlePlaceholder}
              type="text"
              value={value.displaySubtitle}
              onChange={(event) => set({ displaySubtitle: event.target.value })}
            />
            <p className={HINT} id={`${id}-subtitle-hint`}>
              {text.displaySubtitleHint}
            </p>
          </div>

          <fieldset className="mb-4" data-kg-post-settings-featured>
            <legend className={LABEL}>{text.featuredImage}</legend>
            {images.length === 0 ? (
              <p className={HINT}>{text.noImages}</p>
            ) : (
              <>
                <p className={`${HINT} mb-2 mt-0`}>{text.featuredImageHint}</p>
                <div
                  className="grid grid-cols-4 gap-2"
                  role="radiogroup"
                  aria-label={text.featuredImage}
                >
                  {images.map((image) => {
                    const node = image.node as { alt?: string; src?: string };
                    const chosen = image.id === value.featuredImageId;
                    const alt = node.alt || text.imageWithoutAlt;
                    return (
                      <label
                        key={image.id}
                        className={`relative block cursor-pointer overflow-hidden rounded-md border-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-grey-500 ${
                          chosen
                            ? "border-black dark:border-white"
                            : "border-grey-300 dark:border-grey-800"
                        }`}
                        data-kg-post-settings-image={image.id}
                      >
                        <input
                          checked={chosen}
                          className="sr-only"
                          name={`${id}-featured`}
                          type="radio"
                          value={image.id}
                          onChange={() => set({ featuredImageId: image.id })}
                        />
                        <img
                          alt={alt}
                          className="aspect-square w-full object-cover"
                          src={node.src}
                        />
                      </label>
                    );
                  })}
                </div>
              </>
            )}
            {value.featuredImageId && !featured ? (
              <p className={HINT} role="status">
                {text.missingImage}
              </p>
            ) : null}
            {value.featuredImageId ? (
              <button
                className={`${BUTTON} mt-2`}
                data-kg-post-settings-remove-image
                type="button"
                onClick={() => set({ featuredImageId: "" })}
              >
                {text.removeFeaturedImage}
              </button>
            ) : images.length > 0 ? (
              <p className={HINT}>{text.noFeaturedImage}</p>
            ) : null}
          </fieldset>

          {topics ? (
            <fieldset className="mb-4" data-kg-post-settings-topics>
              <legend className={LABEL}>{text.topics}</legend>
              {topics.length === 0 ? (
                <p className={HINT}>{text.noTopics}</p>
              ) : (
                <>
                  <p className={`${HINT} mb-2 mt-0`}>
                    {fill(text.topicsHint, { max: String(maxTopics) })}
                  </p>
                  {value.topicIds.length > 0 ? (
                    <ul className="mb-2 flex flex-wrap gap-1.5" data-kg-post-settings-chips>
                      {value.topicIds.map((topicId) => (
                        <li
                          key={topicId}
                          className="flex items-center gap-1 rounded-full bg-grey-100 px-2.5 py-0.5 font-sans text-sm text-grey-900 dark:bg-grey-900 dark:text-grey-200"
                        >
                          {topicLabel(topicId)}
                          <button
                            aria-label={fill(text.removeTopic, { topic: topicLabel(topicId) })}
                            className="cursor-pointer rounded-full px-1 outline-0 focus-visible:ring-2 focus-visible:ring-grey-500"
                            type="button"
                            onClick={() => toggleTopic(topicId)}
                          >
                            <span aria-hidden="true">&times;</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ul className="flex flex-wrap gap-1.5">
                    {topics.map((topic) => {
                      const chosen = value.topicIds.includes(topic.id);
                      return (
                        <li key={topic.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 font-sans text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-grey-500 ${
                              chosen
                                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                                : "border-grey-300 text-grey-900 dark:border-grey-800 dark:text-grey-200"
                            } ${!chosen && atLimit ? "cursor-default opacity-50" : ""}`}
                          >
                            <input
                              checked={chosen}
                              className="sr-only"
                              disabled={!chosen && atLimit}
                              type="checkbox"
                              onChange={() => toggleTopic(topic.id)}
                            />
                            {topic.label}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {atLimit ? (
                    <p className={HINT} role="status">
                      {fill(text.topicsLimit, { max: String(maxTopics) })}
                    </p>
                  ) : null}
                </>
              )}
            </fieldset>
          ) : null}

          {items.length > 0 ? (
            <ul
              className="-mx-4 -mb-4 mt-2 border-t border-grey-200 p-2 dark:border-grey-900"
              data-kg-post-settings-items
            >
              {items.map((item) => (
                <li key={item.label}>
                  <button
                    className="w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left font-sans text-sm text-grey-900 outline-0 hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-grey-500 disabled:cursor-default disabled:opacity-50 dark:text-grey-200 dark:hover:bg-grey-900"
                    disabled={item.disabled}
                    type="button"
                    onClick={() => {
                      close(true);
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </span>
  );
};

export default PostSettingsMenu;
