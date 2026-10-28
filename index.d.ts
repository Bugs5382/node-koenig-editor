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
export type KoenigCardName = "callout" | "divider" | "image" | "table" | "toggle";

/** The format toolbar's buttons. Pass a list as the composer's `toolbar` to show only those. */
export type KoenigToolbarItem =
  "bold" | "heading2" | "heading3" | "italic" | "link" | "quote" | "snippet";

/** A menu entry's wording. */
export interface KoenigCardText {
  desc: string;
  label: string;
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
  callout: { background: string; emoji: string; placeholder: string };
  toggle: { contentPlaceholder: string; headingPlaceholder: string };
  snippet: { namePlaceholder: string; replaceExisting: string };
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
  fileTypes?: Record<string, { extensions: string[]; mimeTypes: string[] }>;
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

export interface KoenigComposerProps {
  cardConfig?: Record<string, unknown>;
  /** The shipped cards to register, and so list in the menus. Default: all of them. */
  cards?: readonly KoenigCardName[];
  children?: ReactNode;
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
}

export interface KoenigEditorAPI {
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
/** The format toolbar's button names, in toolbar order. */
export declare const KOENIG_TOOLBAR_ITEMS: readonly KoenigToolbarItem[];
/** The English wording. */
export declare const DEFAULT_STRINGS: KoenigStrings;
/** The resolved wording; the composer provides it to everything under it. */
export declare const KoenigStringsContext: Context<KoenigStrings>;
/** The wording in effect, for a host's own cards and plugins. */
export declare const useKoenigStrings: () => KoenigStrings;

/** Lexical's editor state, as `onChange` and `registerAPI` hand it over. */
export type EditorState = LexicalEditorState;
