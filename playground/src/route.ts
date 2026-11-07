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
// Which page the address shows, read from the hash so the page needs no server and no router:
//   #/                 the editor
//   #/guide            the cards guide, #/guide/<section> a section of it
//   #/try/<id>         the editor with that card (or tool) set up to try, see kitchenSink.ts
// The query string stays free for the editor's settings.

/** The cards, tools and features the guide has a "Try it" link for. */
export const TRY_IDS = [
  "image",
  "gallery",
  "header",
  "callout",
  "toggle",
  "toggle-group",
  "divider",
  "table",
  "file",
  "video",
  "audio",
  "button",
  "markdown",
  "image-editor",
  "emoji-picker",
  "word-count",
] as const;

export type TryId = (typeof TRY_IDS)[number];

export type Route = { page: "editor"; tryId?: TryId } | { page: "guide"; anchor?: string };

export const editorHref = "#/";
export const guideHref = (anchor?: string) => (anchor ? `#/guide/${anchor}` : "#/guide");
export const tryHref = (id: TryId) => `#/try/${id}`;

const isTryId = (value: string | undefined): value is TryId =>
  !!value && (TRY_IDS as readonly string[]).includes(value);

/** Reads `location.hash`. Anything it does not know is the editor. */
export function parseRoute(hash: string): Route {
  const [page, rest] = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (page === "guide") {
    return rest && /^[a-z0-9-]+$/.test(rest) ? { page: "guide", anchor: rest } : { page: "guide" };
  }
  if (page === "try" && isTryId(rest)) return { page: "editor", tryId: rest };
  return { page: "editor" };
}
