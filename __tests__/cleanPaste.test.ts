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
import { describe, expect, it } from "vitest";

import { cleanPastedHtml } from "../src/additions/paste/cleanPaste";

const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta name=Generator content="Microsoft Word 15"><style><!-- p.MsoNormal {margin:0in;font-size:11.0pt;font-family:"Calibri",sans-serif;} --></style></head>
<body lang=EN-US style='tab-interval:.5in'><!--StartFragment-->
<p class=MsoNormal><b style='mso-bidi-font-weight:normal'><span style='font-size:14.0pt;font-family:"Arial",sans-serif;color:red'>Quarterly report</span></b><o:p></o:p></p>
<p class=MsoNormal>Plain <i>slanted</i> and <u>underlined</u> text with a <a href="https://example.com/a">link</a>.<o:p></o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol;mso-fareast-font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>First point<o:p></o:p></p>
<p class=MsoListParagraphCxSpMiddle style='text-indent:-.25in;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>o<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Nested point<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Second point<o:p></o:p></p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-.25in;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Step one<o:p></o:p></p>
<p class=MsoListParagraphCxSpLast style='text-indent:-.25in;mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>2.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Step two<o:p></o:p></p>
<!--EndFragment--></body></html>`;

const docs = `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Bold words</span><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre-wrap;"> and italics</span><span style="font-size:11pt;font-family:Arial;font-weight:400;text-decoration:underline line-through;vertical-align:baseline;white-space:pre-wrap;"> struck</span><span style="font-size:8pt;font-weight:400;vertical-align:super;white-space:pre-wrap;">2</span></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:11pt;" aria-level="1"><p dir="ltr" style="line-height:1.38;" role="presentation"><span style="font-size:11pt;white-space:pre-wrap;">Item one</span></p></li><li dir="ltr" style="list-style-type:disc;" aria-level="1"><p dir="ltr" role="presentation"><span style="white-space:pre-wrap;">Item two</span></p></li></ul></b>`;

const dom = (html: string) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;

describe("clean paste from Word", () => {
  const out = dom(cleanPastedHtml(word));

  it("drops the head, styles, comments and Office tags", () => {
    const html = out.innerHTML;
    expect(html).not.toContain("<style");
    expect(html).not.toContain("<meta");
    expect(html).not.toContain("<!--");
    expect(html.toLowerCase()).not.toContain("o:p");
    expect(html).not.toContain("StartFragment");
  });

  it("removes every style, class and font from the text", () => {
    for (const element of out.querySelectorAll("*")) {
      expect(element.hasAttribute("style"), element.outerHTML).toBe(false);
      expect(element.hasAttribute("class"), element.outerHTML).toBe(false);
    }
    expect(out.querySelector("font")).toBeNull();
  });

  it("keeps bold, italic, underline and links as the editor's own formats", () => {
    expect(out.querySelector("p strong")?.textContent).toBe("Quarterly report");
    expect(out.querySelector("em")?.textContent).toBe("slanted");
    expect(out.querySelector("u")?.textContent).toBe("underlined");
    expect(out.querySelector("a")?.getAttribute("href")).toBe("https://example.com/a");
  });

  it("turns the list paragraphs into real nested lists, without the bullet characters", () => {
    const lists = [...out.children].filter(
      (child) => child.tagName === "UL" || child.tagName === "OL",
    );
    expect(lists.map((list) => list.tagName)).toEqual(["UL", "OL"]);
    const bullets = lists[0] as HTMLElement;
    expect(bullets.querySelectorAll(":scope > li").length).toBe(2);
    expect(bullets.querySelector("li > ul > li")?.textContent?.trim()).toBe("Nested point");
    expect(bullets.textContent).not.toContain("·");
    expect(bullets.textContent).not.toContain("o ");
    expect(lists[1]?.querySelectorAll(":scope > li").length).toBe(2);
    expect(lists[1]?.textContent).toContain("Step one");
    expect(lists[1]?.textContent).not.toContain("1.");
  });
});

describe("clean paste from Google Docs", () => {
  const out = dom(cleanPastedHtml(docs));

  it("does not make everything bold because of the guid wrapper", () => {
    expect(out.querySelector("b[id]")).toBeNull();
    const text = out.querySelector("p");
    expect(text?.textContent).toContain("Bold words and italics");
    expect(out.querySelectorAll("strong").length).toBe(1);
    expect(out.querySelector("strong")?.textContent).toBe("Bold words");
  });

  it("reads italics, underline, strikethrough and superscript from the spans' styles", () => {
    expect(out.querySelector("em")?.textContent).toBe(" and italics");
    expect(out.querySelector("u")?.textContent).toContain("struck");
    expect(out.querySelector("s, del, strike")?.textContent).toContain("struck");
    expect(out.querySelector("sup")?.textContent).toBe("2");
  });

  it("has no styles, ids or font settings left", () => {
    for (const element of out.querySelectorAll("*")) {
      expect(element.hasAttribute("style"), element.outerHTML).toBe(false);
      expect(element.hasAttribute("id"), element.outerHTML).toBe(false);
    }
  });

  it("keeps the list and takes the paragraphs out of its items", () => {
    const items = [...out.querySelectorAll("ul > li")];
    expect(items.map((item) => item.textContent)).toEqual(["Item one", "Item two"]);
    expect(out.querySelector("li p")).toBeNull();
  });

  it("keeps the text direction", () => {
    expect(out.querySelector("p")?.getAttribute("dir")).toBe("ltr");
  });
});

describe("clean paste from anywhere else", () => {
  it("keeps headings, tables and images, and removes scripts and inline styles", () => {
    const html = `<h2 style="color:red">Title</h2><table style="width:100%"><tr><td colspan="2" style="padding:4px" class="x">cell</td></tr></table><img src="https://x.test/a.png" alt="A" style="width:10px"><script>alert(1)</script>`;
    const out = dom(cleanPastedHtml(html));
    expect(out.querySelector("h2")?.textContent).toBe("Title");
    expect(out.querySelector("td")?.getAttribute("colspan")).toBe("2");
    expect(out.querySelector("img")?.getAttribute("src")).toBe("https://x.test/a.png");
    expect(out.querySelector("img")?.getAttribute("alt")).toBe("A");
    expect(out.querySelector("script")).toBeNull();
    for (const element of out.querySelectorAll("*"))
      expect(element.hasAttribute("style")).toBe(false);
  });

  it("returns an empty string for nothing", () => {
    expect(cleanPastedHtml("")).toBe("");
  });
});
