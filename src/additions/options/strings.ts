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
  errorFallback: "The {card} card could not be shown. Remove it and try again.",
  close: "Close",
  searching: "Searching...",
  cards: {
    button: { desc: "Add a call-to-action link", label: "Button" },
    callout: { desc: "Info boxes that stand out", label: "Callout" },
    audio: { desc: "Upload an audio file", label: "Audio" },
    divider: { desc: "Insert a dividing line", label: "Divider" },
    file: { desc: "Upload a downloadable file", label: "File" },
    gallery: { desc: "Create an image gallery", label: "Gallery" },
    header: { desc: "Add a header", label: "Header" },
    markdown: { desc: "Write or paste Markdown", label: "Markdown" },
    image: { desc: "Upload, or embed with /image [url]", label: "Image" },
    table: { desc: "Insert a table", label: "Table" },
    toggle: { desc: "Add collapsible content", label: "Toggle" },
    video: { desc: "Upload a video file", label: "Video" },
  },
  menu: {
    addCard: "Add a card",
    removeSnippet: "Remove snippet",
    sections: { Primary: "Primary", Snippets: "Snippets" },
  },
  toolbar: {
    bold: "Bold",
    heading1: "Heading 1",
    heading2: "Heading 2",
    heading3: "Heading 3",
    heading4: "Heading 4",
    heading5: "Heading 5",
    italic: "Emphasize",
    link: "Link",
    quote: "Quote",
    snippet: "Save as snippet",
  },
  table: {
    addColumnLeft: "Column left",
    addColumnRight: "Column right",
    addRowAbove: "Row above",
    addRowBelow: "Row below",
    deleteColumn: "Delete column",
    deleteRow: "Delete row",
    deleteTable: "Delete table",
    headerRow: "Header row",
    toolbar: "Table",
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
  gallery: {
    addImages: "Add images",
    captionPlaceholder: "Type caption for gallery (optional)",
    countOf: "{n} of {max}",
    dismiss: "Dismiss",
    dropToAdd: "Drop to add up to {max} images",
    editImageText: "Edit title, caption and alt text",
    fileTypeError: "Some files were not images this editor accepts",
    hideAllImageText: "Hide all titles and captions",
    hideImageText: "Hide title and caption",
    imageAltLabel: "Alt text",
    imageAtEnd: "Image {n} of {total} is already last",
    imageAtStart: "Image {n} of {total} is already first",
    imageCaptionLabel: "Caption",
    imageCaptionPlaceholder: "Caption for this image (optional)",
    imageLabel: "Image {n} of {total}",
    imageMovedAfter: "Image {n} of {total}, moved after image {other}",
    imageMovedBefore: "Image {n} of {total}, moved before image {other}",
    imageTextCancel: "Cancel",
    imageTextDialogTitle: "Title, caption and alt text",
    imageTextHelp:
      "Alt text describes the photo for people who cannot see it. To move this photo, focus it and press Alt with the left or right arrow key.",
    imageTextSave: "Save",
    imageTitleLabel: "Title",
    limitError: "Galleries are limited to {max} images",
    maxImagesHint: "Up to {host}, and at least the {n} already here.",
    maxImagesLabel: "Maximum number of images",
    openGalleryFullScreen: "View full screen",
    openImageFullScreen: "View this photo full screen",
    select: "Click to select up to {max} images",
    showAllImageText: "Show all titles and captions",
    showImageText: "Show title and caption",
    uploadError: "An image could not be uploaded. Try it again",
    viewerClose: "Exit full screen",
    viewerCloseHint: "Esc",
    viewerLabel: "Gallery viewer",
    viewerNext: "Next image",
    viewerPrevious: "Previous image",
    viewerThumbnail: "Show image {n}",
    viewerThumbnails: "Thumbnails",
  },
  header: {
    alignCenter: "Centered",
    alignLeft: "Left",
    alignment: "Alignment",
    backgroundColor: "Background colour",
    backgroundImage: "Background image",
    button: "Button",
    buttonText: "Button text",
    buttonUrl: "Button link",
    removeImage: "Remove image",
    subtitlePlaceholder: "Add a subtitle",
    titlePlaceholder: "Add a title",
    uploadError: "The background image could not be uploaded. Try it again",
  },
  button: {
    alignCenter: "Centered",
    alignLeft: "Left",
    alignment: "Content alignment",
    invalidUrl: "Use a link that starts with http://, https:// or mailto:",
    text: "Button text",
    textPlaceholder: "Add button text",
    url: "Button link",
  },
  markdown: {
    editorLabel: "Markdown",
    empty: "Empty Markdown card",
    placeholder: "Write or paste Markdown",
    previewLabel: "Markdown preview",
  },
  wordCount: {
    readLessThanMinute: "Less than a minute",
    readMinutes: "{minutes} min read",
    word: "{count} word",
    words: "{count} words",
  },
  file: {
    descriptionPlaceholder: "Enter a description",
    select: "Click to upload a file",
    sizeError: "The file {name} is larger than the {limit} limit",
    titlePlaceholder: "Enter a title",
    typeError: "The file {name} is not an allowed type",
  },
  video: {
    captionPlaceholder: "Type caption for video (optional)",
    captionsMissing: "Add captions or a transcript so everyone can follow this video",
    select: "Click to upload a video",
    sizeError: "The file {name} is larger than the {limit} limit",
    trackError: "Captions must be a WebVTT (.vtt) file",
    trackLabel: "Caption label",
    trackLanguage: "Caption language",
    trackRemove: "Remove captions",
    trackUpload: "Upload captions (.vtt)",
    transcriptPlaceholder: "Type a transcript of the video",
    typeError: "The file {name} is not an allowed type",
  },
  audio: {
    captionsMissing: "Add captions or a transcript so everyone can follow this audio",
    select: "Click to upload audio",
    sizeError: "The file {name} is larger than the {limit} limit",
    titlePlaceholder: "Add a title",
    trackError: "Captions must be a WebVTT (.vtt) file",
    trackLabel: "Caption label",
    trackLanguage: "Caption language",
    trackRemove: "Remove captions",
    trackUpload: "Upload captions (.vtt)",
    transcriptPlaceholder: "Type a transcript of the audio",
    typeError: "The file {name} is not an allowed type",
  },
  callout: {
    background: "Background",
    emoji: "Emoji",
    placeholder: "Callout text...",
  },
  preview: {
    dark: "Dark",
    desktop: "Desktop",
    light: "Light",
    phone: "Phone",
    region: "Reader preview",
    tablet: "Tablet",
    textSize: "Text size",
    theme: "Theme",
    back: "Back to editing",
    toggle: "Preview",
    width: "Width",
  },
  toggle: {
    collapse: "Hide content",
    expand: "Show content",
    contentPlaceholder: "Collapsible content",
    headingPlaceholder: "Toggle header",
  },
  snippet: {
    namePlaceholder: "Snippet name",
    replaceExisting: "Replace existing",
  },
  imageEditor: {
    apply: "Use this image",
    aspectFree: "Free",
    aspectLabel: "Crop shape",
    aspectOriginal: "Original",
    cancel: "Cancel",
    cropHelp: "Arrow keys move the crop. Shift with the arrow keys makes it larger or smaller.",
    cropLabel: "Crop area",
    exportError: "The edited image could not be saved. Try again.",
    loadError: "This image could not be opened for editing.",
    loading: "Opening the image...",
    rotateLeft: "Rotate left",
    rotateRight: "Rotate right",
    title: "Edit image",
  },
  emojiPicker: {
    categories: {
      activities: "Activities",
      animals: "Animals and nature",
      flags: "Flags",
      food: "Food and drink",
      objects: "Objects",
      people: "People and body",
      smileys: "Smileys and emotion",
      symbols: "Symbols",
      travel: "Travel and places",
    },
    categoriesLabel: "Emoji groups",
    label: "Emoji picker",
    loadError: "The emoji list could not be loaded.",
    loading: "Loading emoji...",
    noResults: "No emoji found",
    searchLabel: "Search emoji",
    searchPlaceholder: "Search",
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

/** The message for a card that failed: the host's `errorFallback` with `{card}` filled in. */
export const describeFailedCard = (strings: KoenigStrings, card?: string | null): string =>
  strings.errorFallback.replace("{card}", card || "unknown");

/** Carries the composer's resolved wording to every editor and card under it. */
export const KoenigStringsContext = createContext<KoenigStrings>(DEFAULT_STRINGS);

/** The wording in effect for the editor this component sits in. */
export const useKoenigStrings = (): KoenigStrings => useContext(KoenigStringsContext);
