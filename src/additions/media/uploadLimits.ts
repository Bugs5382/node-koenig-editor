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
import type { KoenigStrings } from "node-koenig-editor";

/** What the host's `fileUploader.fileTypes[type]` may say. Every part is optional. */
export interface UploadRule {
  extensions?: string[];
  maxSize?: number;
  mimeTypes?: string[];
}

export type UploadProblem =
  { code: "type"; name: string } | { code: "size"; limit: number; name: string };

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
};

/**
 * Checks a chosen file against the host's rule before anything is uploaded. Returns
 * null when it may go ahead, else which limit it breaks. A host that sets no rule
 * (or no `fileTypes` at all) accepts everything: the uploader has the final say.
 */
export const checkUpload = (
  file: { name: string; size: number; type: string },
  rule: UploadRule | undefined,
): UploadProblem | null => {
  if (!rule) return null;
  const extensions = (rule.extensions ?? []).map((ext) =>
    (ext.startsWith(".") ? ext : `.${ext}`).toLowerCase(),
  );
  const mimeTypes = rule.mimeTypes ?? [];
  if (extensions.length || mimeTypes.length) {
    const typeOk =
      extensions.includes(extensionOf(file.name)) ||
      mimeTypes.some((mime) =>
        mime.endsWith("/*") ? file.type.startsWith(mime.slice(0, -1)) : mime === file.type,
      );
    if (!typeOk) return { code: "type", name: file.name };
  }
  if (rule.maxSize !== undefined && file.size > rule.maxSize) {
    return { code: "size", limit: rule.maxSize, name: file.name };
  }
  return null;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${Math.round(value * 10) / 10} ${units[unit]}`;
};

/** The host-worded message for a problem. `{name}` and `{limit}` are filled in. */
export const describeUploadProblem = (
  problem: UploadProblem,
  messages: Pick<KoenigStrings["file"], "sizeError" | "typeError">,
): string =>
  problem.code === "type"
    ? messages.typeError.replace("{name}", problem.name)
    : messages.sizeError
        .replace("{name}", problem.name)
        .replace("{limit}", formatBytes(problem.limit));
