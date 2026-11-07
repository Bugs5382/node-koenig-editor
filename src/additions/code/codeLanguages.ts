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
import type { KoenigCodeLanguage } from "node-koenig-editor";
import { getCodeLanguageOptions } from "@lexical/code-prism";

// The languages the code card offers. A host lists its own (`codeLanguages`); without a list the
// ones the highlighter ships with are offered. "Plain text" is always first.

export const PLAIN_TEXT = "plain";

export const resolveCodeLanguages = (
  host: readonly KoenigCodeLanguage[] | null | undefined,
  plainLabel: string,
): KoenigCodeLanguage[] => {
  const list = host?.length
    ? host.filter((entry) => entry && typeof entry.value === "string" && entry.value)
    : getCodeLanguageOptions().map(([value, label]) => ({ label, value }));
  const seen = new Set<string>([PLAIN_TEXT]);
  const rest = list.filter((entry) => {
    if (seen.has(entry.value)) return false;
    seen.add(entry.value);
    return true;
  });
  return [{ label: plainLabel, value: PLAIN_TEXT }, ...rest];
};
