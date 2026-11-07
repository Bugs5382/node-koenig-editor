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
// Clean paste. HTML from Word, Google Docs and most web pages carries a great deal of noise: a
// head with styles, conditional comments, Office tags, font settings on every span, and, in Word,
// lists written as indented paragraphs with bullet characters. This turns it into plain structure
// the editor imports consistently: paragraphs, headings, real nested lists, links, tables and
// images, with bold, italic, underline, strikethrough, superscript and subscript kept as formats
// and every other style left behind.

const REMOVE =
  "script, style, meta, link, title, head, template, object, iframe, embed, noscript, xml";

const KEEP: Record<string, string[]> = {
  "*": ["dir"],
  a: ["href"],
  img: ["src", "alt"],
  ol: ["start"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

const SAFE_HREF = /^(https?:|mailto:|#|\/)/i;

const parseStyle = (style: string | null): Map<string, string> => {
  const map = new Map<string, string>();
  for (const part of (style ?? "").split(";")) {
    const index = part.indexOf(":");
    if (index > 0)
      map.set(
        part.slice(0, index).trim().toLowerCase(),
        part
          .slice(index + 1)
          .trim()
          .toLowerCase(),
      );
  }
  return map;
};

const isBold = (weight: string | undefined): boolean =>
  weight !== undefined &&
  (weight === "bold" || weight === "bolder" || Number.parseInt(weight, 10) >= 600);

const unwrap = (element: Element): void => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
};

const wrapChildren = (element: Element, tag: string): void => {
  const wrapper = element.ownerDocument.createElement(tag);
  while (element.firstChild) wrapper.appendChild(element.firstChild);
  element.appendChild(wrapper);
};

const removeComments = (doc: Document): void => {
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_COMMENT);
  const found: Node[] = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  for (const node of found) node.parentNode?.removeChild(node);
};

// Word writes a list item as `<p style="mso-list:l0 level1 lfo1">` with the bullet or number in a
// span marked `mso-list:Ignore`. Group runs of those paragraphs into nested ul and ol lists.
const convertWordLists = (body: HTMLElement): void => {
  const doc = body.ownerDocument;
  const isListParagraph = (node: Element | null): node is HTMLElement =>
    !!node &&
    node.tagName === "P" &&
    /mso-list:\s*(?!none|ignore)\S/i.test(node.getAttribute("style") ?? "");
  const paragraphs = [...body.querySelectorAll("p")].filter(isListParagraph);
  const done = new Set<Element>();
  for (const first of paragraphs) {
    if (done.has(first)) continue;
    const run: HTMLElement[] = [];
    let node: Element | null = first;
    while (node && isListParagraph(node)) {
      run.push(node);
      node = node.nextElementSibling;
    }
    const root = doc.createDocumentFragment();
    const stack: { id: string; level: number; list: HTMLElement; ordered: boolean }[] = [];
    let lastItem: HTMLElement | null = null;
    for (const paragraph of run) {
      done.add(paragraph);
      const style = paragraph.getAttribute("style") ?? "";
      const level = Number.parseInt(/level(\d+)/i.exec(style)?.[1] ?? "1", 10);
      const id = /mso-list:\s*(l\d+)/i.exec(style)?.[1] ?? "l0";
      const marker = paragraph.querySelector('[style*="mso-list:Ignore" i]');
      const markerText = (marker?.textContent ?? "").replace(/[\s\u00a0]+/g, "");
      const ordered = /^(\d+|[a-z]|[ivxlcdm]+)[.)]$/i.test(markerText);
      marker?.parentNode?.removeChild(marker);
      while (
        stack.length > 0 &&
        (stack.at(-1)!.level > level ||
          (stack.at(-1)!.level === level &&
            (stack.at(-1)!.id !== id || stack.at(-1)!.ordered !== ordered)))
      ) {
        stack.pop();
      }
      if (stack.length === 0 || stack.at(-1)!.level < level) {
        const list = doc.createElement(ordered ? "ol" : "ul");
        if (stack.length === 0) root.appendChild(list);
        else (lastItem ?? stack.at(-1)!.list).appendChild(list);
        stack.push({ id, level, list, ordered });
      }
      const item = doc.createElement("li");
      while (paragraph.firstChild) item.appendChild(paragraph.firstChild);
      stack.at(-1)!.list.appendChild(item);
      lastItem = item;
    }
    first.parentNode?.insertBefore(root, first);
    for (const paragraph of run) paragraph.parentNode?.removeChild(paragraph);
  }
};

const convertStyles = (body: HTMLElement): void => {
  for (const element of [...body.querySelectorAll("*")]) {
    const style = parseStyle(element.getAttribute("style"));
    const tag = element.tagName;
    // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-...">
    if (
      (tag === "B" || tag === "STRONG") &&
      style.get("font-weight") &&
      !isBold(style.get("font-weight"))
    ) {
      unwrap(element);
      continue;
    }
    if (style.size === 0) continue;
    const decoration = `${style.get("text-decoration") ?? ""} ${style.get("text-decoration-line") ?? ""}`;
    const vertical = style.get("vertical-align");
    const wanted: string[] = [];
    if (
      isBold(style.get("font-weight")) &&
      tag !== "B" &&
      tag !== "STRONG" &&
      !/^H[1-6]$/.test(tag)
    )
      wanted.push("strong");
    if (/italic|oblique/.test(style.get("font-style") ?? "") && tag !== "I" && tag !== "EM")
      wanted.push("em");
    if (decoration.includes("underline") && tag !== "U" && tag !== "A") wanted.push("u");
    if (decoration.includes("line-through") && !["S", "STRIKE", "DEL"].includes(tag))
      wanted.push("s");
    if (vertical === "super" && tag !== "SUP") wanted.push("sup");
    if (vertical === "sub" && tag !== "SUB") wanted.push("sub");
    for (const wrapperTag of wanted.reverse()) wrapChildren(element, wrapperTag);
  }
};

const stripAttributes = (body: HTMLElement): void => {
  for (const element of body.querySelectorAll("*")) {
    const keep = new Set([...(KEEP["*"] ?? []), ...(KEEP[element.tagName.toLowerCase()] ?? [])]);
    for (const name of [...element.getAttributeNames()]) {
      if (!keep.has(name)) element.removeAttribute(name);
    }
    if (element.tagName === "A" && !SAFE_HREF.test(element.getAttribute("href") ?? "")) {
      element.removeAttribute("href");
    }
  }
};

const isEmptyInline = (element: Element): boolean =>
  ["SPAN", "STRONG", "EM", "U", "S", "SUP", "SUB", "B", "I", "FONT"].includes(element.tagName) &&
  !element.textContent &&
  !element.querySelector("img, br");

export const cleanPastedHtml = (html: string): string => {
  if (!html.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  removeComments(doc);
  for (const element of body.querySelectorAll(REMOVE)) element.parentNode?.removeChild(element);
  // Office tags such as o:p and w:sdt have a colon in their name
  for (const element of [...body.querySelectorAll("*")]) {
    if (element.tagName.includes(":")) element.parentNode?.removeChild(element);
  }
  convertWordLists(body);
  convertStyles(body);
  stripAttributes(body);
  // one spelling for each format
  for (const [from, to] of [
    ["b", "strong"],
    ["i", "em"],
    ["strike", "s"],
    ["del", "s"],
  ] as const) {
    for (const element of [...body.querySelectorAll(from)]) {
      const renamed = doc.createElement(to);
      while (element.firstChild) renamed.appendChild(element.firstChild);
      element.parentNode?.replaceChild(renamed, element);
    }
  }
  for (const element of [...body.querySelectorAll("span, font")]) unwrap(element);
  // Google Docs puts a paragraph inside each list item
  for (const paragraph of [...body.querySelectorAll("li > p")]) {
    if (paragraph.parentElement?.children.length === 1 || paragraph.nextElementSibling === null)
      unwrap(paragraph);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    for (const element of [...body.querySelectorAll("*")]) {
      if (isEmptyInline(element)) element.parentNode?.removeChild(element);
    }
  }
  body.normalize();
  return body.innerHTML.trim();
};

export default cleanPastedHtml;
