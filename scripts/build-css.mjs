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
// Builds the editor's stylesheet with the Tailwind 3 setup the Koenig sources are written for
// (its own theme, `important: '.koenig-lexical'`, no global preflight), so a host app's own Tailwind
// build never has to read these classes. The output is committed as src/generated/koenig.css;
// run `npm run build:css` after changing a class name in the sources.
import console from "node:console";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import postcssImport from "postcss-import";
import tailwindcss from "tailwindcss";
import tailwindNesting from "tailwindcss/nesting/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const input = path.join(root, "src/koenig-lexical/styles/index.css");
const output = path.join(root, "src/generated/koenig.css");

// Tailwind resolves the config's content globs against the working directory.
process.chdir(root);

// Upstream sizes everything in rem and expects a 10px root (html { font-size: 62.5% }). A host
// on the browser's 16px root saw the whole editor 60% too large. Every rem length becomes a
// multiple of --kg-rem (default: 0.625rem, i.e. 10px at a 16px root), so it follows the host's
// text size setting and a host with its own scale sets --kg-rem once.
const REM = /(-?\d*\.?\d+)rem\b/g;
const scaleRem = () => ({
  postcssPlugin: "kg-scale-rem",
  // One pass at the end: a per-declaration visitor would see its own output again.
  OnceExit(root) {
    root.walkDecls((declaration) => {
      declaration.value = declaration.value.replace(REM, (_, amount) =>
        Number(amount) === 0 ? "0" : `calc(${amount} * var(--kg-rem, 0.625rem))`,
      );
    });
  },
});
scaleRem.postcss = true;

const result = await postcss([
  postcssImport(),
  tailwindNesting(),
  tailwindcss({ config: path.join(root, "tailwind.config.cjs") }),
  scaleRem(),
]).process(readFileSync(input, "utf8"), { from: input, to: output });

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, result.css);
console.log(`wrote ${path.relative(root, output)} (${result.css.length} bytes)`);
