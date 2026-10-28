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
import type { KoenigStrings, KoenigStringsInput } from "node-koenig-editor";
import { createContext, useContext } from "react";

// Every piece of wording the editor shows. A host passes any part of it as the
// composer's `strings`; whatever it leaves out stays English. Typed by the public
// declarations (index.d.ts), so the two cannot drift.
export const DEFAULT_STRINGS: KoenigStrings = {
  placeholder: "Begin writing...",
  nestedPlaceholder: "Type here",
  errorFallback: "An error was thrown.",
  close: "Close",
  searching: "Searching...",
  cards: {
    callout: { desc: "Info boxes that stand out", label: "Callout" },
    divider: { desc: "Insert a dividing line", label: "Divider" },
    image: { desc: "Upload, or embed with /image [url]", label: "Image" },
    table: { desc: "Insert a table", label: "Table" },
    toggle: { desc: "Add collapsible content", label: "Toggle" },
  },
  menu: {
    addCard: "Add a card",
    removeSnippet: "Remove snippet",
    sections: { Primary: "Primary", Snippets: "Snippets" },
  },
  toolbar: {
    bold: "Bold",
    heading2: "Heading 2",
    heading3: "Heading 3",
    italic: "Emphasize",
    link: "Link",
    quote: "Quote",
    snippet: "Save as snippet",
  },
  card: {
    edit: "Edit",
    fullWidth: "Full width",
    link: "Link",
    regularWidth: "Regular width",
    saveAsSnippet: "Save as snippet",
    wideWidth: "Wide width",
  },
  link: {
    edit: "Edit",
    inputPlaceholder: "Enter url",
    pasteAsLink: "Paste URL as link",
    remove: "Remove",
    retry: "Retry",
    searchPlaceholder: "Search or enter URL to link",
    urlError: "Oops, that link didn't work.",
  },
  image: {
    altPlaceholder: "Type alt text for image (optional)",
    captionPlaceholder: "Type caption for image (optional)",
    dropHere: "Drop it here",
    dropManyHere: "Drop them here",
    dropToGallery: "Drop to convert to a gallery",
    dropToReplace: "Drop to replace image",
    select: "Click to select an image",
    uploadLabel: "Image",
  },
  callout: {
    background: "Background",
    emoji: "Emoji",
    placeholder: "Callout text...",
  },
  toggle: {
    contentPlaceholder: "Collapsible content",
    headingPlaceholder: "Toggle header",
  },
  snippet: {
    namePlaceholder: "Snippet name",
    replaceExisting: "Replace existing",
  },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const merge = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
};

/** The English defaults with the host's wording laid over them. */
export const resolveStrings = (strings?: KoenigStringsInput | null): KoenigStrings =>
  strings
    ? (merge(
        DEFAULT_STRINGS as unknown as Record<string, unknown>,
        strings as Record<string, unknown>,
      ) as unknown as KoenigStrings)
    : DEFAULT_STRINGS;

/** Carries the composer's resolved wording to every editor and card under it. */
export const KoenigStringsContext = createContext<KoenigStrings>(DEFAULT_STRINGS);

/** The wording in effect for the editor this component sits in. */
export const useKoenigStrings = (): KoenigStrings => useContext(KoenigStringsContext);
