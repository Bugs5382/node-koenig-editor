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
import type { KoenigFileIconOverrides, KoenigFileIcons } from "node-koenig-editor";

// File-type icons on the file card. The picture comes from react-file-icon (MIT), which knows
// several hundred extensions and draws a plain page with the extension on it for any other. The
// host can switch icons off (`fileIcons={false}`) or draw its own for a type.

/** The lower-case extension of a file name, without the dot ("Report.PDF" gives "pdf"). */
export const fileExtension = (name: string | null | undefined): string => {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
};

export interface ResolvedFileIcons {
  enabled: boolean;
  overrides: KoenigFileIconOverrides;
}

export const resolveFileIcons = (option: KoenigFileIcons | null | undefined): ResolvedFileIcons => {
  if (option === false) return { enabled: false, overrides: {} };
  const overrides: KoenigFileIconOverrides = {};
  for (const [type, icon] of Object.entries(option?.overrides ?? {})) {
    if (icon) overrides[type.replace(/^\./, "").toLowerCase()] = icon;
  }
  return { enabled: true, overrides };
};
