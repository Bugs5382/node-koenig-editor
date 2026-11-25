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
 * The optional subtitle: the block right under the title, plain text on one line. It is saved as
 * `{ type: "subtitle" }` with a block id like any other block. The node is always registered so a
 * document saved with a subtitle opens anywhere; the composer's `title: { subtitle: true }` option
 * turns the behaviour on (see TitlePlugin).
 */
export class SubtitleNode extends ElementNode {
  static override getType(): string {
    return "subtitle";
  }

  static override clone(node: SubtitleNode): SubtitleNode {
    return new SubtitleNode(node.__key);
  }

  static override importJSON(serializedNode: SerializedElementNode): SubtitleNode {
    return $createSubtitleNode().updateFromJSON(serializedNode);
  }

  override exportJSON(): SerializedElementNode {
    return { ...super.exportJSON(), type: "subtitle", version: 1 };
  }

  override createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("h2");
    element.className = "kg-subtitle";
    return element;
  }

  override updateDOM(): boolean {
    return false;
  }

  override exportDOM(editor: LexicalEditor): DOMExportOutput {
    const { element } = super.exportDOM(editor);
    const subtitle = document.createElement("h2");
    subtitle.className = "kg-subtitle";
    if (element instanceof HTMLElement) {
      while (element.firstChild) subtitle.appendChild(element.firstChild);
    }
    return { element: subtitle };
  }

  // Enter at the end of the subtitle starts the body: the new line is a paragraph, never a subtitle.
  override insertNewAfter(_selection: RangeSelection, restoreSelection = true): LexicalNode {
    const paragraph = $createParagraphNode();
    this.insertAfter(paragraph, restoreSelection);
    return paragraph;
  }

  // Backspace at the start of the subtitle does not join it to the title above.
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

export const $createSubtitleNode = (): SubtitleNode => new SubtitleNode();

export const $isSubtitleNode = (node: LexicalNode | null | undefined): node is SubtitleNode =>
  node instanceof SubtitleNode;
