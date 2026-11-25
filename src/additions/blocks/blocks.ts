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
import {
  $getRoot,
  $getState,
  $setState,
  createState,
  type EditorState,
  type LexicalEditor,
  type SerializedEditorState,
} from "lexical";

type Json = Record<string, unknown>;

/** One top-level block of a document: the same shape for a paragraph, a card or the title. */
export interface Block {
  /** The block's stable id, `""` when the document was saved before ids existed. */
  id: string;
  /** The node type: `paragraph`, `heading`, `title`, `image`, `horizontalrule`, and so on. */
  type: string;
  /** The block's place in the list, from 0. */
  index: number;
  /** The type of the block above, `null` for the first. */
  after: string | null;
  /** The block's text; empty for a card that has none. */
  text: string;
  /** The saved node, as it is in the document. */
  node: Json;
}

export type EditorDocument = string | SerializedEditorState | EditorState | Json;

const toJson = (document: EditorDocument): Json => {
  if (typeof document === "string") return JSON.parse(document) as Json;
  if (typeof (document as EditorState).toJSON === "function") {
    return (document as EditorState).toJSON() as unknown as Json;
  }
  return document as Json;
};

const textOf = (node: Json): string => {
  if (typeof node.text === "string") return node.text;
  const children = node.children;
  return Array.isArray(children) ? children.map((child) => textOf(child as Json)).join("") : "";
};

/** The document's top-level blocks, title and cards included, in order. */
export const getBlocks = (document: EditorDocument): Block[] => {
  const root = (toJson(document).root ?? {}) as Json;
  const children = (Array.isArray(root.children) ? root.children : []) as Json[];
  return children.map((node, index) => ({
    id: ((node.$ as Json | undefined)?.id as string | undefined) ?? "",
    type: String(node.type),
    index,
    after: index > 0 ? String(children[index - 1]!.type) : null,
    text: textOf(node),
    node,
  }));
};

/** The block with this id, or `null`. */
export const getBlockById = (document: EditorDocument, id: string): Block | null =>
  id === "" ? null : (getBlocks(document).find((block) => block.id === id) ?? null);

/**
 * Post-level fields that live beside the block list, in the document itself. The package keeps
 * these three because the featured image is a reference to a card by id. Topics, the unlisted
 * setting and sharing are the host's own settings.
 */
export interface PostMeta {
  /** Overrides the body title for the homepage, previews and sharing. `""` falls back to the title. */
  displayTitle: string;
  /** Overrides the subtitle in the same places. `""` means none. */
  displaySubtitle: string;
  /** The id of the image card chosen as the featured image, `""` for none. */
  featuredImageRef: string;
}

export const EMPTY_POST_META: PostMeta = {
  displayTitle: "",
  displaySubtitle: "",
  featuredImageRef: "",
};

const parseMeta = (value: unknown): PostMeta => {
  const source = (value && typeof value === "object" ? value : {}) as Json;
  const text = (key: keyof PostMeta) =>
    typeof source[key] === "string" ? (source[key] as string) : "";
  return {
    displayTitle: text("displayTitle"),
    displaySubtitle: text("displaySubtitle"),
    featuredImageRef: text("featuredImageRef"),
  };
};

export const POST_META = createState("post", {
  parse: parseMeta,
  isEqual: (a, b) =>
    a.displayTitle === b.displayTitle &&
    a.displaySubtitle === b.displaySubtitle &&
    a.featuredImageRef === b.featuredImageRef,
});

/** Reads the post fields inside `editor.read` or `editor.update`. */
export const $getPostMeta = (): PostMeta => $getState($getRoot(), POST_META);

/** Changes the given post fields inside `editor.update`; the others keep their value. */
export const $setPostMeta = (changes: Partial<PostMeta>): PostMeta => {
  const next = parseMeta({ ...$getPostMeta(), ...changes });
  $setState($getRoot(), POST_META, next);
  return next;
};

export const getPostMeta = (document: EditorDocument): PostMeta =>
  parseMeta(((toJson(document).root as Json | undefined)?.$ as Json | undefined)?.post);

export const setPostMeta = (editor: LexicalEditor, changes: Partial<PostMeta>): void => {
  editor.update(() => {
    $setPostMeta(changes);
  });
};

/**
 * The image card a `featuredImageRef` points at, or `null` when the reference is empty, the card
 * was deleted, or the block with that id is not an image card.
 */
export const resolveFeaturedImage = (
  document: EditorDocument,
  ref: string = getPostMeta(document).featuredImageRef,
): Block | null => {
  const block = getBlockById(document, ref);
  return block && block.type === "image" ? block : null;
};

/** The image cards of a document, in order. Only a card that has an id can be picked. */
export const findImageCards = (document: EditorDocument): Block[] =>
  getBlocks(document).filter((block) => block.type === "image" && block.id !== "");
