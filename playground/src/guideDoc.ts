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
// Turns guides/cards.md into the guide page: HTML with an anchor on every section, a contents
// list, and a "Try it" link under each card, tool and the word count. Raw HTML in the Markdown is
// switched off, so the file can only produce the Markdown elements.
import MarkdownIt, { type Token } from "markdown-it";
import { TRY_IDS, guideHref, tryHref, type TryId } from "./route";

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface GuideDoc {
  html: string;
  title: string;
  toc: { id: string; title: string }[];
}

export function renderGuide(markdown: string): GuideDoc {
  const md = new MarkdownIt({ html: false, linkify: false });
  const toc: GuideDoc["toc"] = [];
  let title = "";

  md.core.ruler.push("guide-anchors", (state) => {
    const out: Token[] = [];
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i] as Token;
      out.push(token);
      if (token.type !== "heading_open" || (token.tag !== "h1" && token.tag !== "h2")) continue;
      const inline = tokens[i + 1] as Token;
      const text = inline.content;
      if (token.tag === "h1") {
        title = text;
        continue;
      }
      const id = slugify(text);
      toc.push({ id, title: text });
      token.attrSet("id", `guide-${id}`);
      // A link to the section itself, after the heading's text.
      const link = new state.Token("html_inline", "", 0);
      link.content = ` <a class="anchor" href="${guideHref(id)}" aria-label="Link to ${text}">#</a>`;
      inline.children?.push(link);
      // Walk on to the closing tag, then add the Try it link after it.
      out.push(inline, tokens[i + 2] as Token);
      i += 2;
      if ((TRY_IDS as readonly string[]).includes(id)) {
        const tryLink = new state.Token("html_block", "", 0);
        tryLink.content = `<p class="try"><a class="try-link" href="${tryHref(id as TryId)}">Try it in the editor</a></p>\n`;
        out.push(tryLink);
      }
    }
    state.tokens = out;
  });

  const html = md.render(markdown);
  return { html, title, toc };
}
