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
  $createParagraphNode,
  ElementNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type SerializedElementNode,
} from "lexical";

/**
 * The article title: the first block of the document, in the same flat list as the body and the
 * cards. It is plain text on one line (no formatting, no line breaks), and it is always the
 * first block. It is saved as `{ type: "title" }` with a block id like any other block. The node is
 * always registered so a document saved with a title opens anywhere; the composer's `title`
 * option turns the behaviour on (see TitlePlugin).
 */
export class TitleNode extends ElementNode {
  static override getType(): string {
    return "title";
  }

  static override clone(node: TitleNode): TitleNode {
    return new TitleNode(node.__key);
  }

  static override importJSON(serializedNode: SerializedElementNode): TitleNode {
    return $createTitleNode().updateFromJSON(serializedNode);
  }

  override exportJSON(): SerializedElementNode {
    return { ...super.exportJSON(), type: "title", version: 1 };
  }

  override createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("h1");
    element.className = "kg-title";
    return element;
  }

  override updateDOM(): boolean {
    return false;
  }

  override exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    const title = document.createElement("h1");
    title.className = "kg-title";
    if (element instanceof HTMLElement) {
      while (element.firstChild) title.appendChild(element.firstChild);
    }
    return { element: title };
  }

  // Enter at the end of the title starts the body: the new line is a paragraph, never a title.
  override insertNewAfter(_selection: RangeSelection, restoreSelection = true): LexicalNode {
    const paragraph = $createParagraphNode();
    this.insertAfter(paragraph, restoreSelection);
    return paragraph;
  }

  // Backspace at the start of the title has nothing above it to join, and the title is never merged.
  override collapseAtStart(): boolean {
    return true;
  }

  override canIndent(): false {
    return false;
  }

  override canBeEmpty(): boolean {
    return true;
  }

  override isShadowRoot(): boolean {
    return false;
  }
}

export const $createTitleNode = (): TitleNode => new TitleNode();

export const $isTitleNode = (node: LexicalNode | null | undefined): node is TitleNode =>
  node instanceof TitleNode;
