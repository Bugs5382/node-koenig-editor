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

/**
 * The one check every media card (file, video, audio) applies to a source url, in the
 * editor, on import and when rendering: http(s) or a path on the host's own origin.
 * Anything else (`javascript:`, `data:`, `blob:`, protocol-relative) comes back empty.
 */
export const safeMediaUrl = (url: unknown): string => {
  if (typeof url !== "string") return "";
  const value = url.trim();
  if (!value) return "";
  // Control characters can hide a scheme from a plain prefix check ("java\tscript:").
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return "";
  if (value.startsWith("//")) return "";
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (scheme) return /^https?$/i.test(scheme[1] as string) ? value : "";
  return value;
};

/** A WebVTT file, by name or by type. The text track upload accepts nothing else. */
export const isVtt = (file: { name: string; type: string }): boolean =>
  /\.vtt$/i.test(file.name) || file.type === "text/vtt";
