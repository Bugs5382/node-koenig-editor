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
// The public surface of node-koenig-editor, declared by hand. The Koenig sources under src/
// are loosely typed upstream code; consumers compile against these declarations instead of
// walking into the sources, so a strict host app build never type-checks them.
import type { ExcludedProperties, Provider } from "@lexical/yjs";
import type {
  EditorState as LexicalEditorState,
  Klass,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
  SerializedEditorState,
} from "lexical";
import type { Context, FC, ReactNode, RefObject } from "react";
import type { Doc, XmlText } from "yjs";

/** The cards the package ships. Pass a list as the composer's `cards` to register only those. */
export type KoenigCardName =
  | "audio"
  | "button"
  | "callout"
  | "divider"
  | "file"
  | "gallery"
  | "header"
  | "image"
  | "markdown"
  | "table"
  | "toggle"
  | "video";

/** Features that are not cards. Pass a list as the composer's `tools` to keep only those. */
export type KoenigTool =
  "cleanPaste" | "emojiPicker" | "findReplace" | "imageEditor" | "preview" | "shortcuts";

/** The emoji picker's groups, in tab order. */
export type KoenigEmojiCategory =
  | "activities"
  | "animals"
  | "flags"
  | "food"
  | "objects"
  | "people"
  | "smileys"
  | "symbols"
  | "travel";

/** The format toolbar's buttons. Pass a list as the composer's `toolbar` to show only those. */
export type KoenigToolbarItem =
  | "alignCenter"
  | "alignJustify"
  | "alignLeft"
  | "alignRight"
  | "bold"
  | "bulletList"
  | "checkList"
  | "clearFormatting"
  | "code"
  | "fontFamily"
  | "fontSize"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "highlight"
  | "indent"
  | "italic"
  | "lineSpacing"
  | "link"
  | "numberList"
  | "outdent"
  | "paragraphSpacing"
  | "quote"
  | "snippet"
  | "strikethrough"
  | "subscript"
  | "superscript"
  | "textColor"
  | "textDirection"
  | "underline";

/** One colour in a palette. */
export interface KoenigColorSwatch {
  /** What the swatch is called (its tooltip and screen reader name). */
  label: string;
  /** A hex colour, `#rgb` or `#rrggbb`. */
  value: string;
}

/** Where the editor asks for a colour. Each has its own palette. */
export type KoenigColorSlot =
  | "buttonBackground"
  | "buttonText"
  | "calloutBackground"
  | "calloutText"
  | "headerBackground"
  | "headerButton"
  | "headerButtonText"
  | "headerText"
  | "highlight"
  | "tableBand"
  | "tableBrand"
  | "textColor";

/** A host's choices for one colour slot. */
export interface KoenigColorSetting {
  /** Takes away the choice of the editor's own colour, so a colour from the host's list (or, with
   *  the picker on, a picked one) is always set. Default: true (the choice is there). */
  none?: boolean;
  /** The swatches this slot shows, in place of the editor's. */
  palette?: readonly KoenigColorSwatch[];
  /** Whether the person can pick any colour with the colour wheel. Default: true. `false` limits
   *  the slot to its palette. */
  picker?: boolean;
}

/** A font the host offers in the selection toolbar. */
export interface KoenigFont {
  /** What the menu shows. */
  label: string;
  /** A CSS `font-family` value, for example `Georgia, serif`. */
  value: string;
}

/** What a host's toolbar button or card gets when the person uses it on a text selection. */
export interface KoenigToolbarSelection {
  /** Closes the card and the toolbar. */
  close: () => void;
  editor: LexicalEditor;
  /** Puts `text` in place of the text that was selected when the button was pressed, even after
   *  focus has moved into your card. Closes the card and returns true; returns false, changing
   *  nothing, when that text has since been edited or removed. */
  replaceSelection: (text: string) => boolean;
  /** The selected text when the button was pressed. */
  text: string;
}

/** A button the host adds to the selection toolbar, after the built-in ones. */
export interface KoenigToolbarAction {
  /** Opens under the toolbar when the button is pressed. Without it the button calls `onSelect`. */
  Card?: FC<KoenigToolbarSelection>;
  /** True leaves the button out, for example when the person may not use it. */
  hidden?: boolean;
  /** The button's icon; without one the first letters of `label` show. */
  Icon?: FC<{ className?: string }>;
  /** Names the button: it becomes the `data-kg-toolbar-button` value. */
  id: string;
  /** The button's accessible name and tooltip. */
  label: string;
  onSelect?: (selection: KoenigToolbarSelection) => void;
}

/** A menu entry's wording. */
export interface KoenigCardText {
  desc: string;
  label: string;
}

/** The wording the video and audio cards share. */
export interface KoenigMediaStrings {
  /** The notice shown while the card has neither a captions track nor a transcript. */
  captionsMissing: string;
  select: string;
  sizeError: string;
  trackError: string;
  trackLabel: string;
  trackLanguage: string;
  trackRemove: string;
  trackUpload: string;
  transcriptPlaceholder: string;
  typeError: string;
}

/** Every piece of wording the editor shows, with English defaults in `DEFAULT_STRINGS`. */
export interface KoenigStrings {
  placeholder: string;
  nestedPlaceholder: string;
  errorFallback: string;
  close: string;
  searching: string;
  cards: Record<KoenigCardName, KoenigCardText>;
  /** The Emoji entry of the "+" and "/" menus. Typing `/emoji` anywhere opens the same picker. */
  emoji: KoenigCardText;
  /** The Preview button, and the reader simulation's controls. */
  preview: {
    /** The button that leaves the reader's view. */
    back: string;
    dark: string;
    desktop: string;
    light: string;
    phone: string;
    /** Names the framed reader preview for a screen reader. */
    region: string;
    tablet: string;
    textSize: string;
    theme: string;
    toggle: string;
    width: string;
  };
  menu: { addCard: string; removeSnippet: string; sections: Record<string, string> };
  toolbar: Record<KoenigToolbarItem, string> & {
    /** Names the selection toolbar for screen readers. */
    group: string;
  };
  find: {
    close: string;
    find: string;
    matchCase: string;
    next: string;
    none: string;
    previous: string;
    replace: string;
    replaceAll: string;
    replaceOne: string;
    /** `{count}` is the number replaced. */
    replaced: string;
    /** `{current}` and `{total}` are the position and the number of matches. */
    status: string;
    title: string;
  };
  shortcuts: {
    actions: Record<"find" | "redo" | "shortcuts" | "toolbar" | "undo", string>;
    close: string;
    groups: Record<"align" | "blocks" | "general" | "text", string>;
    title: string;
  };
  colors: {
    custom: string;
    /** `{label}` is the setting's name. */
    group: string;
    none: string;
  };
  textStyle: {
    colours: Record<"blue" | "green" | "grey" | "orange" | "purple" | "red", string>;
    defaultColour: string;
    defaultFont: string;
    directions: Record<"auto" | "ltr" | "rtl", string>;
    defaultSpacing: string;
    lineSpacings: Record<"1" | "1.15" | "1.5" | "2", string>;
    paragraphSpacings: Record<"large" | "medium" | "none" | "small", string>;
    highlights: Record<"blue" | "green" | "orange" | "pink" | "purple" | "yellow", string>;
    noHighlight: string;
    sizes: Record<"large" | "larger" | "normal" | "small" | "smaller", string>;
  };
  figure: {
    above: string;
    below: string;
    button: string;
    done: string;
    label: string;
    labelPlaceholder: string;
    numbered: string;
    position: string;
    remove: string;
    title: string;
    titlePlaceholder: string;
  };
  /** The table card's controls; `toolbar` names the group for screen readers. The two announcements
   *  take `{row}`, `{rows}`, `{column}`, `{columns}`, `{rowSpan}` and `{colSpan}`. */
  table: {
    addColumnLeft: string;
    addColumnRight: string;
    addRowAbove: string;
    addRowBelow: string;
    alignBottom: string;
    alignJustify: string;
    alignScope: string;
    scopeCell: string;
    scopeColumn: string;
    scopeRow: string;
    scopeTable: string;
    alignCenter: string;
    alignLeft: string;
    alignMenu: string;
    alignMiddle: string;
    alignRight: string;
    alignTop: string;
    bordersMenu: string;
    bordersApplyTo: string;
    bordersScopeCell: string;
    bordersScopeRow: string;
    bordersScopeColumn: string;
    bordersScopeTable: string;
    bordersLines: string;
    bordersLinesAll: string;
    bordersLinesOuter: string;
    bordersLinesInner: string;
    bordersStyle: string;
    bordersStyleNone: string;
    bordersStyleSolid: string;
    bordersStyleDashed: string;
    bordersStyleDotted: string;
    bordersThickness: string;
    bordersThin: string;
    bordersMedium: string;
    bordersThick: string;
    bordersColour: string;
    bordersColourDefault: string;
    bordersColourInk: string;
    bordersColourGrey: string;
    bordersApply: string;
    bordersReset: string;
    dragRow: string;
    dragRowHint: string;
    dragColumn: string;
    dragColumnHint: string;
    rowMovedStatus: string;
    columnMovedStatus: string;
    sizeMenu: string;
    sizeDone: string;
    columnWidthLabel: string;
    rowHeightLabel: string;
    tableWidthLabel: string;
    tableWidthFull: string;
    tableWidthFit: string;
    tableWidthFixed: string;
    equalColumns: string;
    caption: string;
    captionDone: string;
    captionLabel: string;
    captionPlaceholder: string;
    captionRemove: string;
    cellMenu: string;
    colourMenu: string;
    columnMenu: string;
    contextMenu: string;
    deleteColumn: string;
    deleteRow: string;
    deleteTable: string;
    headerColumn: string;
    headerRow: string;
    mergeCells: string;
    moveColumnLeft: string;
    moveColumnRight: string;
    moveRowDown: string;
    moveRowUp: string;
    noColour: string;
    positionAnnouncement: string;
    rowMenu: string;
    selectColumn: string;
    selectRow: string;
    selectTable: string;
    spanAnnouncement: string;
    splitCell: string;
    toolbar: string;
    widthAuto: string;
    widthMedium: string;
    widthMenu: string;
    widthNarrow: string;
    widthWide: string;
    /** Names of the cell colours, by their key. */
    columnWidthStatus: string;
    rowHeightStatus: string;
    colours: Record<
      "blue" | "green" | "grey" | "orange" | "pink" | "purple" | "red" | "yellow",
      string
    >;
  };
  card: {
    edit: string;
    fullWidth: string;
    link: string;
    regularWidth: string;
    saveAsSnippet: string;
    wideWidth: string;
  };
  link: {
    edit: string;
    inputPlaceholder: string;
    pasteAsLink: string;
    remove: string;
    retry: string;
    searchPlaceholder: string;
    urlError: string;
  };
  image: {
    altPlaceholder: string;
    captionPlaceholder: string;
    dropHere: string;
    dropManyHere: string;
    dropToGallery: string;
    dropToReplace: string;
    select: string;
    uploadLabel: string;
  };
  gallery: {
    addImages: string;
    captionPlaceholder: string;
    dismiss: string;
    /** `{max}` is replaced with the gallery's image limit. */
    dropToAdd: string;
    fileTypeError: string;
    imageCaptionPlaceholder: string;
    /** `{max}` is replaced with the image limit. */
    limitError: string;
    /** `{max}` is replaced with the gallery's image limit. */
    select: string;
    uploadError: string;
    /** Names the icon that opens the title and caption dialog for one photo. */
    editImageText: string;
    hideAllImageText: string;
    hideImageText: string;
    imageCaptionLabel: string;
    imageTextCancel: string;
    imageTextDialogTitle: string;
    imageTextSave: string;
    imageTitleLabel: string;
    showAllImageText: string;
    showImageText: string;
    imageAltLabel: string;
    /** `{n}` and `{total}` are replaced with the photo's place and the number of photos. */
    imageAtEnd: string;
    imageAtStart: string;
    imageLabel: string;
    /** As above, and `{other}` with the place of the photo it moved past. */
    imageMovedAfter: string;
    imageMovedBefore: string;
    /** Help in the title, caption and alt text dialog, including how to move a photo. */
    imageTextHelp: string;
    /** `{n}` is the number of photos and `{max}` the gallery's limit. */
    countOf: string;
    /** `{host}` is the host's ceiling and `{n}` the number of photos already in the gallery. */
    maxImagesHint: string;
    maxImagesLabel: string;
    /** The button that opens the full-screen viewer, on the gallery and on each photo. */
    openGalleryFullScreen: string;
    openImageFullScreen: string;
    /** The exit control: its label, its tooltip, and its text on wide screens. */
    viewerClose: string;
    /** The key shown in the exit control's tooltip. */
    viewerCloseHint: string;
    viewerLabel: string;
    viewerNext: string;
    viewerPrevious: string;
    /** `{n}` is the photo's place in the gallery. */
    viewerThumbnail: string;
    viewerThumbnails: string;
  };
  header: {
    alignCenter: string;
    alignLeft: string;
    alignRight: string;
    alignment: string;
    backgroundColor: string;
    backgroundImage: string;
    button: string;
    buttonColor: string;
    buttonEmoji: string;
    buttonLabel: string;
    buttonLabelBoth: string;
    buttonLabelEmoji: string;
    buttonLabelText: string;
    buttonText: string;
    buttonTextColor: string;
    textColor: string;
    buttonUrl: string;
    removeImage: string;
    subtitlePlaceholder: string;
    titlePlaceholder: string;
    uploadError: string;
  };
  /** The button card; its link must be http, https or mailto. */
  button: {
    alignCenter: string;
    alignLeft: string;
    alignRight: string;
    alignment: string;
    backgroundColor: string;
    emoji: string;
    emojiPlaceholder: string;
    emojiRemove: string;
    invalidUrl: string;
    textColor: string;
    text: string;
    textPlaceholder: string;
    url: string;
  };
  markdown: { editorLabel: string; empty: string; placeholder: string; previewLabel: string };
  /** Wording for `useKoenigWordCount`; `{count}` and `{minutes}` are filled in. */
  wordCount: { readLessThanMinute: string; readMinutes: string; word: string; words: string };
  file: {
    descriptionPlaceholder: string;
    select: string;
    /** `{name}` is replaced with the file name and `{limit}` with the size limit. */
    sizeError: string;
    titlePlaceholder: string;
    /** `{name}` is replaced with the file name. */
    typeError: string;
  };
  video: KoenigMediaStrings & { captionPlaceholder: string };
  audio: KoenigMediaStrings & { titlePlaceholder: string };
  callout: { background: string; emoji: string; placeholder: string; textColor: string };
  toggle: {
    /** The reader's button when the toggle is open. */
    collapse: string;
    contentPlaceholder: string;
    /** The reader's button when the toggle is closed. */
    expand: string;
    headingPlaceholder: string;
  };
  snippet: { namePlaceholder: string; replaceExisting: string };
  imageEditor: {
    apply: string;
    aspectFree: string;
    aspectLabel: string;
    aspectOriginal: string;
    cancel: string;
    cropHelp: string;
    cropLabel: string;
    exportError: string;
    loadError: string;
    loading: string;
    rotateLeft: string;
    rotateRight: string;
    title: string;
  };
  emojiPicker: {
    categories: Record<KoenigEmojiCategory, string>;
    categoriesLabel: string;
    label: string;
    loadError: string;
    loading: string;
    noResults: string;
    searchLabel: string;
    searchPlaceholder: string;
  };
}

/** Every field optional, all the way down. */
export type KoenigDeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? KoenigDeepPartial<T[K]> : T[K];
};

/** The host's wording: any part of `KoenigStrings`; the rest stays English. */
export type KoenigStringsInput = KoenigDeepPartial<KoenigStrings>;

export interface CardMenuItem {
  desc?: string;
  Icon?: FC;
  insertCommand: LexicalCommand<unknown>;
  insertParams?: Record<string, unknown>;
  label: string;
  matches?: string[];
  priority?: number;
  section?: string;
  shortcut?: string;
}

export type EditorNodes = readonly (Klass<LexicalNode> | LexicalNodeReplacement)[];

/** A file upload hook, as cards call it: `useFileUpload("image")`. */
export interface FileUploader {
  /** Per upload type. `maxSize` (bytes) is checked by the file, video and audio cards before upload. */
  fileTypes?: Record<string, { extensions: string[]; maxSize?: number; mimeTypes: string[] }>;
  useFileUpload: (type: string) => {
    errors: { filename?: string; message: string }[];
    isLoading: boolean;
    progress: number;
    upload: (files: File[] | FileList) => Promise<{ fileName?: string; url: string }[] | null>;
  };
}

/** How the host wires collaboration: the provider for the main document and every nested
 *  editor, and where a nested editor's content lives when the transport has one room. */
export interface KoenigCollaboration {
  cursorColor?: string;
  cursorsContainerRef?: RefObject<HTMLElement | null>;
  excludedProperties?: ExcludedProperties;
  /** Resolve a nested editor's root inside the main document instead of a subdocument. */
  getNestedXmlText?: (document: Doc, id: string) => XmlText;
  providerFactory: (id: string, yjsDocumentMap: Map<string, Doc>) => Provider;
  shouldBootstrap?: boolean;
  username?: string;
}

/** One message in a comment thread. Timestamps are ISO 8601 strings. */
export interface KoenigCommentMessage {
  /** Whatever the host uses to name the author; the package never reads it. */
  author?: string;
  body: string;
  createdAt: string;
  id: string;
}

/** A discussion anchored on a range of text. The anchor itself lives in the editor state,
 *  as a mark node carrying `id`; the thread's content lives wherever the host stores it. */
export interface KoenigCommentThread {
  createdAt: string;
  id: string;
  messages: KoenigCommentMessage[];
  /** The text the thread was anchored on when it was created. */
  quote: string;
  resolved: boolean;
}

/** What the host hears about. `anchor-lost` and `anchor-restored` fire when the anchored text
 *  is deleted or comes back (undo, collaboration). */
export type KoenigCommentEvent =
  | { thread: KoenigCommentThread; type: "thread-added" }
  | { thread: KoenigCommentThread; type: "thread-removed" }
  | { thread: KoenigCommentThread; type: "thread-resolved" }
  | { thread: KoenigCommentThread; type: "thread-reopened" }
  | { message: KoenigCommentMessage; thread: KoenigCommentThread; type: "reply-added" }
  | { thread: KoenigCommentThread | null; type: "thread-focused" }
  | { thread: KoenigCommentThread; type: "anchor-lost" }
  | { thread: KoenigCommentThread; type: "anchor-restored" };

/** Turns inline comments on. Without it the editor registers no comment nodes. */
export interface KoenigCommentsOptions {
  /** Called for every change, so the host can persist threads. */
  onEvent?: (event: KoenigCommentEvent) => void;
  /** The saved threads. Replaced (without events) whenever this array's identity changes. */
  threads?: readonly KoenigCommentThread[];
}

export interface KoenigCommentInput {
  author?: string;
  body: string;
}

/** Works in read-only mode too: the host decides who may call it. */
export interface KoenigCommentsController {
  /** Anchors a new thread on the current text selection. Null when no text is selected. */
  addThread: (input: KoenigCommentInput & { id?: string }) => KoenigCommentThread | null;
  /** Scrolls the thread's highlight into view and marks it active; null clears it. */
  focusThread: (id: null | string) => void;
  getActiveThreadId: () => null | string;
  getThread: (id: string) => KoenigCommentThread | undefined;
  getThreads: () => readonly KoenigCommentThread[];
  /** Whether the thread's highlight is currently in the document. */
  isAnchored: (id: string) => boolean;
  /** Removes the thread and its highlight, leaving the text. False if unknown. */
  removeThread: (id: string) => boolean;
  reply: (id: string, input: KoenigCommentInput) => KoenigCommentMessage | null;
  /** Resolves a thread, or reopens it with `false`. False if unknown. */
  resolveThread: (id: string, resolved?: boolean) => boolean;
  subscribe: (listener: () => void) => () => void;
}

/** One image in a gallery. `previewSrc` is set only while the image is still uploading. */
export interface KoenigGalleryImage {
  /** Describes the photo for people who cannot see it. */
  alt: string;
  /** Plain text. The card keeps it escaped, because the HTML output writes it as it is. */
  caption: string;
  fileName: string;
  height: null | number;
  previewSrc?: string;
  row?: number;
  /** The address the host's uploader returned; empty until the upload finishes. */
  src?: string;
  /** Plain text, shown over the bottom of the photo and under it in the HTML output. */
  title: string;
  width: null | number;
}

/**
 * What the composer's `cardRenderers.gallery` component receives. It draws the gallery; the
 * editor keeps the node, the uploads, the limits and the saving. The props are the contract, in
 * four groups:
 *
 * - **What to show:** `images` (each with `alt`, `title` and `caption`, as plain text), `caption`
 *   (the gallery's own caption editor, ready to place), `errorMessage`, `isUploading`, `progress`.
 * - **State:** `isSelected`, and `readOnly`, true when the editor is not editable (a reader's view:
 *   draw no editing controls).
 * - **Settings:** `maxImages` (this gallery's limit), `hostMaxImages` (the host's ceiling for it)
 *   and `mimeTypes` (the image types the host's uploader accepts).
 * - **Callbacks:** `addFiles`, `removeImage`, `moveImage`, `replaceImages`, `updateImage`,
 *   `setMaxImages`, `clearError`.
 *
 * Draw it yourself, or wrap the default with `KoenigGalleryCard`.
 */
export interface KoenigGalleryRenderProps {
  /** Adds files: each one is checked against `mimeTypes` and the limit, then sent to the
   *  host's uploader on its own, a few at a time. */
  addFiles: (files: File[] | FileList) => Promise<void>;
  /** The gallery's own caption editor, ready to place. */
  caption: ReactNode;
  clearError: () => void;
  errorMessage: null | string;
  /** The host's ceiling for `maxImages`: the most this gallery's own limit can be set to. */
  hostMaxImages: number;
  images: readonly KoenigGalleryImage[];
  isSelected: boolean;
  isUploading: boolean;
  /** This gallery's limit on photos: its own setting, never above `hostMaxImages`. Adding past it
   *  is refused with a message. */
  maxImages: number;
  /** The image types the host's uploader accepts; empty means any. */
  mimeTypes: readonly string[];
  /** Moves the image at `from` to position `to`. */
  moveImage: (from: number, to: number) => void;
  progress: number;
  /** True when the editor is not editable: draw a reader's view, with no editing controls. */
  readOnly: boolean;
  removeImage: (index: number) => void;
  /** Replaces the whole list, in the order given: for your own drag and drop. */
  replaceImages: (images: readonly KoenigGalleryImage[]) => void;
  /** Sets this gallery's limit, kept between `max(photos in the gallery, 1)` and `hostMaxImages`.
   *  Text that is not a number changes nothing. */
  setMaxImages: (value: number | string) => void;
  /** Saves changes to one image; `title` and `caption` are plain text. */
  updateImage: (
    index: number,
    changes: Partial<Pick<KoenigGalleryImage, "alt" | "caption" | "title">>,
  ) => void;
}

/** What the composer's `cardRenderers.header` component receives. */
export interface KoenigHeaderRenderProps {
  /** `left`, `center` or `right`. */
  alignment: string;
  backgroundColor: string;
  backgroundImageSrc: string;
  buttonColor: string;
  /** An emoji shown before the button's text, or empty. */
  buttonEmoji?: string;
  buttonEnabled: boolean;
  buttonText: string;
  buttonTextColor: string;
  buttonUrl: string;
  isEditing: boolean;
  isSelected: boolean;
  layout: string;
  /** True when the editor is not editable: draw a reader's view, with no settings. */
  readOnly: boolean;
  /** The subtitle as plain text. */
  subtitle: string;
  /** The subtitle's editor, ready to place. */
  subtitleField: ReactNode;
  textColor: string;
  /** The title as plain text. */
  title: string;
  /** The title's editor, ready to place. */
  titleField: ReactNode;
  /** Saves changes to the card; `title` and `subtitle` are plain text. */
  update: (
    changes: Partial<
      Pick<
        KoenigHeaderRenderProps,
        | "alignment"
        | "backgroundColor"
        | "backgroundImageSrc"
        | "buttonColor"
        | "buttonEmoji"
        | "buttonEnabled"
        | "buttonText"
        | "buttonTextColor"
        | "buttonUrl"
        | "layout"
        | "subtitle"
        | "textColor"
        | "title"
      >
    > & { backgroundImageHeight?: null | number; backgroundImageWidth?: null | number },
  ) => void;
  /** Sends the file to the host's uploader and sets it as the background image. */
  uploadBackgroundImage: (file: File) => Promise<void>;
  uploadError: null | string;
}

/** The host's own layout for the cards that have one. Without an entry the default draws. */
/** The host's options for the gallery card. */
export interface KoenigGalleryOptions {
  /** The most photos a gallery takes: the ceiling for each gallery's own setting. A positive whole
   *  number; anything else means the default, 50. It limits adding photos, never cuts off the
   *  photos a stored document already has. */
  maxImages?: number;
}

export interface KoenigCardRenderers {
  gallery?: FC<KoenigGalleryRenderProps>;
  header?: FC<KoenigHeaderRenderProps>;
}

/** The reader's view: how wide the frame is, light or dark, and the text size. */
export interface KoenigPreviewOptions {
  /** The root text size in px, 12 to 20 in steps of 2. */
  textSize: 12 | 14 | 16 | 18 | 20;
  theme: "dark" | "light";
  width: "desktop" | "phone" | "tablet";
}

export interface KoenigComposerProps {
  /** Starts with the reader's view on, when the host does not control `preview`. */
  defaultPreview?: boolean;
  /** Called when the person turns the reader's view on or off (or the API does). */
  onPreviewChange?: (preview: boolean) => void;
  /** Called when the reader simulation options change. */
  onPreviewOptionsChange?: (options: KoenigPreviewOptions) => void;
  /** Controls the reader's view: when given, the editor only changes with this prop and reports a
   *  request to change through `onPreviewChange`. */
  preview?: boolean;
  /** Show the inline comment highlights in the reader's view. Off by default: a reader of the
   *  published document does not see them. */
  previewComments?: boolean;
  /** The reader simulation the view starts with. */
  previewOptions?: Partial<KoenigPreviewOptions>;
  /** Put the Preview button above the editor. Default true; pass false to place a
   *  `KoenigPreviewToggle` yourself. The `preview` tool must be on either way. */
  showPreviewToggle?: boolean;
  /** Replaces how a shipped card is drawn; see `KoenigCardRenderers`. */
  cardRenderers?: KoenigCardRenderers;
  /** Options for the gallery card. */
  gallery?: KoenigGalleryOptions;
  cardConfig?: Record<string, unknown>;
  /** The shipped cards to register, and so list in the menus. Default: all of them. */
  cards?: readonly KoenigCardName[];
  children?: ReactNode;
  /** Inline comment threads anchored on selected text. Off unless given. */
  comments?: KoenigCommentsOptions;
  /** Optional: with no value the editor works alone and asks for no provider. */
  collaboration?: KoenigCollaboration | null;
  /** The host's own nodes, registered after the shipped ones. A node with a static
   *  `kgMenu` (a `CardMenuItem` or a list of them) is listed in the menus. */
  customNodes?: EditorNodes;
  darkMode?: boolean;
  editable?: boolean;
  fileUploader?: Partial<FileUploader>;
  initialEditorState?: null | SerializedEditorState | string;
  /** The host's own entries for the "+" and slash menus; it handles their commands. */
  menuItems?: readonly CardMenuItem[];
  /** The base node set the `cards` choice filters. Default: `DEFAULT_NODES`. */
  nodes?: EditorNodes;
  onError?: (error: Error) => void;
  /** The host's wording, laid over the English defaults. */
  strings?: KoenigStringsInput;
  /** The browser's spell check in the editing area. Default: on (not set). `false` switches it off. */
  spellCheck?: boolean;
  /** The language of the text (a BCP 47 tag such as `de`), so the browser checks spelling in it. */
  lang?: string;
  /** The colour settings, per slot: each slot's palette, whether the colour wheel is on, and
   *  whether the editor's own colour is a choice. With `picker: false` and `none: false` the host
   *  forces the person to a colour from its list. */
  colors?: Partial<Record<KoenigColorSlot, KoenigColorSetting>>;
  /** The fonts the font button offers: a label and a CSS `font-family` value each. With none, the
   *  button is not shown. */
  fonts?: readonly KoenigFont[];
  /** The format toolbar buttons to show. Default: all of them. */
  toolbar?: readonly KoenigToolbarItem[];
  /** The host's own buttons and cards on the selection toolbar. */
  toolbarActions?: readonly KoenigToolbarAction[];
  /** The features that are not cards: `imageEditor` (crop and rotate before upload) and
   *  `emojiPicker`. Default: both. Pass a list to keep only those. */
  tools?: readonly KoenigTool[];
}

export interface KoenigEditorAPI {
  /** Whether the reader's view (preview) is showing. */
  isPreview: () => boolean;
  /** Turns the reader's view on or off. Does nothing when the `preview` tool is off or the editor
   *  is not editable. */
  setPreview: (on: boolean) => void;
  /** The comment controller; null unless the composer was given `comments`. */
  comments?: KoenigCommentsController | null;
  editorInstance: LexicalEditor;
  editorIsEmpty: () => boolean;
  focusEditor: (options?: { position?: "bottom" | "top" }) => void;
  serialize: () => string;
}

export interface KoenigEditorProps {
  children?: ReactNode;
  className?: string;
  dataTestId?: string;
  hiddenFormats?: string[];
  isDragEnabled?: boolean;
  isSnippetsEnabled?: boolean;
  onBlur?: () => void;
  onChange?: (json: SerializedEditorState) => void;
  onFocus?: () => void;
  placeholderClassName?: string;
  placeholderText?: string;
  readOnly?: boolean;
  registerAPI?: (api: KoenigEditorAPI) => void;
}

export declare const KoenigComposer: FC<KoenigComposerProps>;
export declare const KoenigEditor: FC<KoenigEditorProps>;
export declare const KoenigComposableEditor: FC<KoenigEditorProps>;
export declare const AllDefaultPlugins: FC;
export declare const TablePlugin: FC;
export declare const TABLE_MENU_ITEM: CardMenuItem;

/** The node set the editor registers: Koenig's kept cards plus the stock Lexical nodes. */
export declare const DEFAULT_NODES: EditorNodes;
export declare const BASIC_NODES: EditorNodes;
export declare const MINIMAL_NODES: EditorNodes;

/** The shipped card names, in menu order. */
export declare const KOENIG_CARD_NAMES: readonly KoenigCardName[];

/** The Preview button, for a host to place inside the composer. Renders nothing when preview is
 *  not available. */
export declare const KoenigPreviewToggle: FC<{ className?: string }>;

/** The preview state: for a host's own control or status. */
/** The reader simulation's controls (width, theme and text size), for a host that places its own
 *  toggle. Renders nothing unless preview is on. */
export declare const KoenigPreviewOptionsPanel: FC<{ className?: string }>;

export declare const useKoenigPreview: () => {
  available: boolean;
  options: KoenigPreviewOptions;
  preview: boolean;
  previewComments: boolean;
  setOptions: (changes: Partial<KoenigPreviewOptions>) => void;
  setPreview: (on: boolean) => void;
  showToggle: boolean;
};

/** The default gallery, drawn from the props of `cardRenderers.gallery`, for a host to wrap. */
export declare const KoenigGalleryCard: FC<KoenigGalleryRenderProps>;

/** The default header, drawn from the props of `cardRenderers.header`, for a host to wrap. */
export declare const KoenigHeaderCard: FC<KoenigHeaderRenderProps>;
/** The tool names, `imageEditor` and `emojiPicker`. */
export declare const KOENIG_TOOLS: readonly KoenigTool[];
/** Whether a tool is on for the composer this component sits in. */
export declare const useKoenigTool: (tool: KoenigTool) => boolean;
/** The offline emoji picker. Calls `onSelect` with the chosen emoji and `onClose` on Escape. */
export declare const EmojiPicker: FC<{
  onClose?: () => void;
  onSelect: (emoji: { native: string }) => void;
}>;
/** Inserts an emoji at the editor's selection (replacing a range selection). */
export declare const insertEmoji: (editor: LexicalEditor, emoji: string) => boolean;
/** The crop and rotate dialog. `onApply` gets the edited copy of `file`. */
export declare const ImageEditorDialog: FC<{
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
}>;
/** The format toolbar's button names, in toolbar order. */
export declare const KOENIG_TOOLBAR_ITEMS: readonly KoenigToolbarItem[];
/** The English wording. */
export declare const DEFAULT_STRINGS: KoenigStrings;
/** The resolved wording; the composer provides it to everything under it. */
export declare const KoenigStringsContext: Context<KoenigStrings>;
/** The wording in effect, for a host's own cards and plugins. */
export declare const useKoenigStrings: () => KoenigStrings;

/** The comment controller, the threads and the active thread, re-rendering the caller on change.
 *  Null outside a composer that was given `comments`. */
/** True for an absolute http, https or mailto URL: the only links the button and Markdown cards keep. */
export declare const isSafeUrl: (value: unknown) => boolean;
/** The URL cleaned the way a browser reads it, or an empty string when it is not allowed. */
export declare const toSafeUrl: (value: unknown) => string;
/** Markdown to HTML as the Markdown card shows and exports it: raw HTML escaped, links checked, headings to H5. */
export declare const renderMarkdown: (source: null | string | undefined) => string;

export interface KoenigWordCountOptions {
  /** Reading speed. Default: `DEFAULT_WORDS_PER_MINUTE`. */
  wordsPerMinute?: number;
}
export interface KoenigWordCount {
  /** Whole minutes to read, rounded up; 0 for an empty document. */
  minutes: number;
  /** "3 min read", or "Less than a minute", in the host's `strings.wordCount`. */
  readingTimeLabel: string;
  words: number;
  /** "1 word" or "5 words", in the host's `strings.wordCount`. */
  wordsLabel: string;
}
/** 238 words per minute. */
export declare const DEFAULT_WORDS_PER_MINUTE: number;
/** Words in a piece of text. */
export declare const countWords: (text: string) => number;
/** Whole minutes to read `words`, rounded up; 0 for none. */
export declare const getReadingTime: (words: number, wordsPerMinute?: number) => number;
/** Words in the document's own text; cards and what they hold are not counted. */
export declare const getWordCount: (editorState: LexicalEditorState) => number;
/** Word count and reading time for the editor it is placed under, live. Place it inside `KoenigComposer`. */
export declare const useKoenigWordCount: (options?: KoenigWordCountOptions) => KoenigWordCount;

export declare const useKoenigComments: () => {
  activeThreadId: null | string;
  controller: KoenigCommentsController;
  threads: readonly KoenigCommentThread[];
} | null;

/** Lexical's editor state, as `onChange` and `registerAPI` hand it over. */
export type EditorState = LexicalEditorState;
