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
export interface CellSpec {
  backgroundColor?: string | null;
  colSpan?: number;
  headerState?: number;
  rowSpan?: number;
  text: string;
  verticalAlign?: string;
  width?: number;
}

export const paragraph = (text: string, format: string | number = "") => ({
  children: text
    ? [{ detail: 0, format: 0, mode: "normal", style: "", text, type: "text", version: 1 }]
    : [],
  direction: null,
  format,
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph",
  version: 1,
});

export const cell = ({
  backgroundColor = null,
  colSpan = 1,
  headerState = 0,
  rowSpan = 1,
  text,
  verticalAlign,
  width,
}: CellSpec) => ({
  backgroundColor,
  children: [paragraph(text)],
  colSpan,
  direction: null,
  format: "",
  headerState,
  indent: 0,
  rowSpan,
  type: "tablecell",
  version: 1,
  ...(verticalAlign ? { verticalAlign } : {}),
  ...(width ? { width } : {}),
});

export const row = (...cells: CellSpec[]) => ({
  children: cells.map(cell),
  direction: null,
  format: "",
  indent: 0,
  type: "tablerow",
  version: 1,
});

export const documentWith = (rows: ReturnType<typeof row>[], colWidths?: number[]) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: rows,
          direction: null,
          format: "",
          indent: 0,
          type: "table",
          version: 1,
          ...(colWidths ? { colWidths } : {}),
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
