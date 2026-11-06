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
import type { KoenigTool } from "node-koenig-editor";
import { createContext, useContext } from "react";

/** The features that are not cards, so `cards` cannot switch them off. */
export const KOENIG_TOOLS: readonly KoenigTool[] = ["imageEditor", "emojiPicker"];

/** The composer's `tools`: every tool when the host gives none, only the listed ones otherwise. */
export const resolveTools = (tools?: readonly KoenigTool[]): ReadonlySet<KoenigTool> =>
  new Set(tools ?? KOENIG_TOOLS);

export const KoenigToolsContext = createContext<ReadonlySet<KoenigTool>>(resolveTools());

/** Whether `tool` is on for the composer this component sits in. */
export const useKoenigTool = (tool: KoenigTool): boolean =>
  useContext(KoenigToolsContext).has(tool);
