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
// One command to start the demo: `npm run playground` from the repo root, or `npm run dev` here.
//   (no flag)    run against the package source in this repo
//   --published  install the latest published node-koenig-editor and run against that
// The first run installs what is missing.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";
import console from "node:console";
import { fileURLToPath, URL } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const repo = fileURLToPath(new URL("../..", import.meta.url));
const published = process.argv.includes("--published");

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    console.error(`playground: "${command} ${args.join(" ")}" failed in ${cwd}`);
    process.exit(result.status ?? 1);
  }
}

const install = ["install", "--ignore-scripts", "--no-audit", "--no-fund"];

if (published) {
  console.log("playground: installing the published node-koenig-editor");
  run("npm", [...install, "--no-save", "node-koenig-editor@latest"], here);
} else {
  // The demo imports the package source, which needs the repo's own dependencies.
  if (!existsSync(`${repo}/node_modules`)) {
    console.log("playground: installing the package's dependencies");
    run("npm", install, repo);
  }
  console.log("playground: installing the demo's dependencies");
  run("npm", install, here);
}

console.log(`playground: starting against the ${published ? "published package" : "local source"}`);
run("npx", ["vite"], here, { KOENIG_SOURCE: published ? "published" : "local" });
