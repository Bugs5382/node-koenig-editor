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
export type KoenigTool = "emojiPicker" | "imageEditor";

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
  | "bold"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "italic"
  | "link"
  | "quote"
  | "snippet";

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
  menu: { addCard: string; removeSnippet: string; sections: Record<string, string> };
  toolbar: Record<KoenigToolbarItem, string>;
  /** The table card's controls; `toolbar` names the group for screen readers. */
  table: {
    addColumnLeft: string;
    addColumnRight: string;
    addRowAbove: string;
    addRowBelow: string;
    deleteColumn: string;
    deleteRow: string;
    deleteTable: string;
    headerRow: string;
    toolbar: string;
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
    altPlaceholder: string;
    captionPlaceholder: string;
    dismiss: string;
    dropToAdd: string;
    fileTypeError: string;
    imageCaptionPlaceholder: string;
    /** `{max}` is replaced with the image limit. */
    limitError: string;
    moveEarlier: string;
    moveLater: string;
    select: string;
    uploadError: string;
  };
  header: {
    alignCenter: string;
    alignLeft: string;
    alignment: string;
    backgroundColor: string;
    backgroundImage: string;
    button: string;
    buttonText: string;
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
    alignment: string;
    invalidUrl: string;
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
  callout: { background: string; emoji: string; placeholder: string };
  toggle: { contentPlaceholder: string; headingPlaceholder: string };
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
  alt: string;
  /** Plain text escaped as HTML, because the gallery's HTML output writes it as is. */
  caption: string;
  fileName: string;
  height: null | number;
  previewSrc?: string;
  row?: number;
  /** The address the host's uploader returned; empty until the upload finishes. */
  src?: string;
  width: null | number;
}

/** What the composer's `cardRenderers.gallery` component receives. It draws the gallery; the
 *  editor keeps the node, the uploads and the limits. */
export interface KoenigGalleryRenderProps {
  /** Adds files: each one is checked against `mimeTypes` and the limit, then sent to the
   *  host's uploader on its own. */
  addFiles: (files: File[] | FileList) => Promise<void>;
  /** The gallery's own caption editor, ready to place. */
  caption: ReactNode;
  clearError: () => void;
  errorMessage: null | string;
  images: readonly KoenigGalleryImage[];
  isSelected: boolean;
  isUploading: boolean;
  maxImages: number;
  /** The image types the host's uploader accepts; empty means any. */
  mimeTypes: readonly string[];
  /** Moves the image at `from` to position `to`. */
  moveImage: (from: number, to: number) => void;
  progress: number;
  removeImage: (index: number) => void;
  updateImage: (
    index: number,
    changes: Partial<Pick<KoenigGalleryImage, "alt" | "caption">>,
  ) => void;
}

/** What the composer's `cardRenderers.header` component receives. */
export interface KoenigHeaderRenderProps {
  alignment: string;
  backgroundColor: string;
  backgroundImageSrc: string;
  buttonColor: string;
  buttonEnabled: boolean;
  buttonText: string;
  buttonTextColor: string;
  buttonUrl: string;
  isEditing: boolean;
  isSelected: boolean;
  layout: string;
  /** The subtitle as plain text. */
  subtitle: string;
  textColor: string;
  /** The title as plain text. */
  title: string;
  /** Saves changes to the card; `title` and `subtitle` are plain text. */
  update: (
    changes: Partial<
      Pick<
        KoenigHeaderRenderProps,
        | "alignment"
        | "backgroundColor"
        | "backgroundImageSrc"
        | "buttonColor"
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
export interface KoenigCardRenderers {
  gallery?: FC<KoenigGalleryRenderProps>;
  header?: FC<KoenigHeaderRenderProps>;
}

export interface KoenigComposerProps {
  /** Replaces how a shipped card is drawn; see `KoenigCardRenderers`. */
  cardRenderers?: KoenigCardRenderers;
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
  /** The format toolbar buttons to show. Default: all of them. */
  toolbar?: readonly KoenigToolbarItem[];
  /** The host's own buttons and cards on the selection toolbar. */
  toolbarActions?: readonly KoenigToolbarAction[];
  /** The features that are not cards: `imageEditor` (crop and rotate before upload) and
   *  `emojiPicker`. Default: both. Pass a list to keep only those. */
  tools?: readonly KoenigTool[];
}

export interface KoenigEditorAPI {
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
