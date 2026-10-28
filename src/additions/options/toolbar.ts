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
import type { KoenigToolbarItem } from "node-koenig-editor";

/** The format toolbar's buttons, as a host names them. */
export const KOENIG_TOOLBAR_ITEMS: readonly KoenigToolbarItem[] = [
  "bold",
  "italic",
  "heading2",
  "heading3",
  "quote",
  "link",
  "snippet",
];

/** True when the host's toolbar choice leaves this button out. No choice shows them all. */
export const isToolbarItemHidden = (
  toolbar: readonly KoenigToolbarItem[] | null | undefined,
  item: KoenigToolbarItem,
): boolean => Array.isArray(toolbar) && !toolbar.includes(item);
