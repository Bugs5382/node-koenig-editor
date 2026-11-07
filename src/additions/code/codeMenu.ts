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
import { createCommand } from "lexical";

import CodeCardIcon from "./kg-card-type-code.svg?react";

/** Puts a code block after the current block (in place of it when that is an empty line). */
export const INSERT_CODE_BLOCK_COMMAND = createCommand<unknown>("KG_INSERT_CODE_BLOCK_COMMAND");

// The code block is a stock @lexical/code element node, not a Koenig decorator card, so the card
// menu has no `kgMenu` static to read. This entry stands in for one, as the table's does.
export const CODE_MENU_ITEM = {
  desc: "Add code with line numbers and highlighting",
  Icon: CodeCardIcon,
  insertCommand: INSERT_CODE_BLOCK_COMMAND,
  label: "Code",
  matches: ["code", "snippet", "pre"],
  priority: 4,
  shortcut: "/code",
};
