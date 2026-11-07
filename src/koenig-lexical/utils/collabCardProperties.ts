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
import type { ExcludedProperties } from "@lexical/yjs";
import type { Klass, LexicalNode } from "lexical";

import { CalloutNode } from "../nodes/CalloutNode";
import { GalleryNode } from "../nodes/GalleryNode";
import { HeaderNode } from "../nodes/HeaderNode";
import { ImageNode } from "../nodes/ImageNode";
import { ToggleNode } from "../nodes/ToggleNode";

// A card that has a nested editor (a caption, a heading, ...) keeps that editor's saved
// EditorState on the card node. Lexical's collaboration copies every node property into the
// shared Yjs document, and Yjs cannot store an EditorState (it throws "Unexpected content
// type"). The nested editor itself is shared on its own, so these properties stay local.
const LOCAL_ONLY = new Map<Klass<LexicalNode>, Set<string>>([
  [CalloutNode as never, new Set(["__calloutTextEditorInitialState"])],
  [GalleryNode as never, new Set(["__captionEditorInitialState"])],
  [
    HeaderNode as never,
    new Set(["__headerTextEditorInitialState", "__subheaderTextEditorInitialState"]),
  ],
  [ImageNode as never, new Set(["__captionEditorInitialState"])],
  [ToggleNode as never, new Set(["__contentEditorInitialState", "__headingEditorInitialState"])],
]);

/** The properties the shared document leaves out for the package's cards, plus the host's own. */
export const withCardProperties = (host?: ExcludedProperties): ExcludedProperties => {
  const merged: ExcludedProperties = new Map();
  for (const [node, names] of LOCAL_ONLY) merged.set(node, new Set(names));
  for (const [node, names] of host ?? []) {
    merged.set(node, new Set([...(merged.get(node) ?? []), ...names]));
  }
  return merged;
};
