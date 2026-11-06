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
// By default the demo builds the package from the repo's source, so a change shows up at once.
// KOENIG_SOURCE=published uses the copy installed from npm instead (npm run dev:published).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";

const fromRepo = (file: string) => fileURLToPath(new URL(`../${file}`, import.meta.url));
const demo = (file: string) => fileURLToPath(new URL(`./${file}`, import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  dependencies: Record<string, string>;
};
const published = process.env.KOENIG_SOURCE === "published";

// The same aliases the package's own build uses to find the upstream Koenig folders.
const localSource = [
  { find: /^node-koenig-editor\/styles\.css$/, replacement: fromRepo("src/generated/koenig.css") },
  { find: /^node-koenig-editor$/, replacement: fromRepo("src/index.ts") },
  { find: /^#kg-default-nodes$/, replacement: fromRepo("src/kg-default-nodes/index.ts") },
  {
    find: /^#kg-default-nodes\/visibility$/,
    replacement: fromRepo("src/kg-default-nodes/visibility.ts"),
  },
  {
    find: /^#kg-default-transforms$/,
    replacement: fromRepo("src/kg-default-transforms/index.ts"),
  },
];

// Every peer the package declares; the demo's package.json lists the same set.
const PEERS = Object.keys(pkg.dependencies).filter(
  (name) =>
    name === "lexical" ||
    name === "react" ||
    name === "react-dom" ||
    name === "yjs" ||
    name.startsWith("@lexical/"),
);

const plugins: PluginOption[] = [react()];
if (!published) plugins.push(svgr());

export default defineConfig({
  plugins,
  resolve: {
    alias: published ? [] : localSource,
    // One copy of each peer, the demo's own, so the package and the page share React and Lexical.
    dedupe: PEERS,
  },
  server: {
    host: "127.0.0.1",
    port: 5178,
    strictPort: true,
    // The local source lives one folder up.
    fs: { allow: [fromRepo("")] },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // The package's own dependencies live in the repo root; run them through Vite so they share
    // the demo's one copy of React instead of loading the root's.
    server: { deps: { inline: [/react-error-boundary/, /react-colorful/] } },
    alias: [
      // Its package.json has no exports map, so the test runner would pick the CommonJS build,
      // which loads the repo root's React; the module build goes through the aliases below.
      {
        find: /^react-error-boundary$/,
        replacement: fromRepo("node_modules/react-error-boundary/dist/react-error-boundary.js"),
      },
      { find: /^react-dom(\/.*)?$/, replacement: `${demo("node_modules/react-dom")}$1` },
      { find: /^react(\/.*)?$/, replacement: `${demo("node_modules/react")}$1` },
    ],
    setupFiles: ["./test/setup.ts"],
  },
  preview: { host: "127.0.0.1", port: 5178, strictPort: true },
});
