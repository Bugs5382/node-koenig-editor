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
import { INSERT_TABLE_COMMAND } from "@lexical/table";

import TableCardIcon from "./kg-card-type-table.svg?react";

// Tables are stock @lexical/table element nodes rather than a Koenig decorator card, so the
// card menu has no `kgMenu` static to read. This entry stands in for one: the "+" and slash
// menus list it whenever the editor has the table nodes registered.
export const TABLE_MENU_ITEM = {
  desc: "Insert a table",
  Icon: TableCardIcon,
  insertCommand: INSERT_TABLE_COMMAND,
  insertParams: { columns: "3", includeHeaders: { columns: false, rows: true }, rows: "3" },
  label: "Table",
  matches: ["table", "grid"],
  priority: 3,
  shortcut: "/table",
};
