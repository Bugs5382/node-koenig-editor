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
// Headless check for the editor's left gutter (Bugs5382/node-koenig-editor#112): with NO host
// padding, the "+" button must end left of where the text starts, and the placeholder and the
// caret must not sit at the box's edge. Run it against a running playground:
//
//   npm --prefix playground run dev            # in one terminal
//   PLAYGROUND_URL=http://127.0.0.1:5173/ CHROME=/path/to/chrome node playground/scripts/checkGutter.mjs
//
// It needs `playwright-core` (not a dependency of the package) and a Chromium to drive.
/* global document, getSelection */
import console from "node:console";
import process from "node:process";

const { chromium } = await import("playwright-core").catch(() => {
  console.error("checkGutter: install playwright-core first (npm i --no-save playwright-core)");
  process.exit(2);
});

const url = process.env.PLAYGROUND_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  headless: true,
});
let failed = false;
const check = (name, ok, detail) => {
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}  ${detail}`);
};

for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url);
  await page.waitForSelector('[data-kg="editor"] [contenteditable=true]');
  // no host padding: the host box is flush with the editor
  await page.addStyleTag({
    content: ".editor-box{padding:0!important;border:0!important} main{padding:0!important}",
  });
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.click('[data-kg="editor"] [contenteditable=true] > p');
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const box = document.querySelector(".editor-box").getBoundingClientRect();
    const plus = document.querySelector("[data-kg-plus-button] button")?.getBoundingClientRect();
    const line = document
      .querySelector('[data-kg="editor"] [contenteditable=true] > p')
      .getBoundingClientRect();
    const placeholder = [...document.querySelectorAll('[data-kg="editor"] *')].find(
      (e) => e.children.length === 0 && e.textContent.trim() === "Begin writing...",
    );
    const range = getSelection().getRangeAt(0).cloneRange();
    const caret = range.getClientRects()[0] ?? line;
    return {
      box: box.left,
      plusRight: plus?.right ?? null,
      plusLeft: plus?.left ?? null,
      text: line.left,
      placeholder: placeholder?.getBoundingClientRect().left ?? null,
      caret: caret.left,
    };
  });
  const tag = `${width}px`;
  check(`${tag}: the + button is shown`, m.plusRight !== null, JSON.stringify(m));
  check(
    `${tag}: the + button ends left of the text`,
    m.plusRight !== null && m.plusRight <= m.text,
    `${m.plusRight} <= ${m.text}`,
  );
  check(
    `${tag}: the + button is inside the box`,
    m.plusLeft >= m.box - 0.5,
    `${m.plusLeft} >= ${m.box}`,
  );
  check(`${tag}: the caret is not at the box edge`, m.caret - m.box > 20, `${m.caret} - ${m.box}`);
  if (m.placeholder !== null) {
    check(
      `${tag}: the placeholder starts after the + button`,
      m.placeholder >= m.plusRight,
      `${m.placeholder} >= ${m.plusRight}`,
    );
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
