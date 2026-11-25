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
import { $getState, $setState, createState, type LexicalNode } from "lexical";

/**
 * The id every top-level block carries. It is Lexical NodeState, so it is saved with the node
 * under `$.id` (paragraphs, headings, quotes, lists and cards all the same way) and read back
 * when the document is parsed.
 */
export const BLOCK_ID = createState("id", {
  parse: (value) => (typeof value === "string" ? value : ""),
});

export const $getBlockId = (node: LexicalNode): string => $getState(node, BLOCK_ID);

export const $setBlockId = (node: LexicalNode, id: string): void => {
  $setState(node, BLOCK_ID, id);
};

const HEX = "0123456789abcdef";

/** A short hex id that is not in `used`: 4 characters, longer only when the document is huge. */
export const generateBlockId = (used: ReadonlySet<string>): string => {
  for (let length = 4; ; length += 1) {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      let id = "";
      for (let i = 0; i < length; i += 1) id += HEX[Math.floor(Math.random() * 16)];
      if (!used.has(id)) return id;
    }
  }
};
