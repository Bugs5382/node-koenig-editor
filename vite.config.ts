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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig, type Plugin } from "vitest/config";

const fromRoot = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// Anything that is not one of our own files stays an import: the peers and the
// runtime dependencies are installed next to the package by the consumer.
const isExternal = (id: string) =>
  !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("#") && !id.startsWith("\0");

// lodash has no exports map, so Node's ESM resolver needs the file extension.
const externalPath = (id: string) => (/^lodash\/[\w-]+$/.test(id) ? `${id}.js` : id);

// The stylesheet is prebuilt (npm run build:css) and the declarations are
// written by hand, so the build ships both as they are.
const shipAssets = (): Plugin => ({
  name: "ship-assets",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "styles.css",
      source: readFileSync(fromRoot("./src/generated/koenig.css")),
    });
    this.emitFile({
      type: "asset",
      fileName: "index.d.ts",
      source: readFileSync(fromRoot("./index.d.ts")),
    });
  },
});

export default defineConfig({
  plugins: [react(), svgr(), shipAssets()],
  resolve: {
    alias: [
      { find: /^#kg-default-nodes$/, replacement: fromRoot("./src/kg-default-nodes/index.ts") },
      {
        find: /^#kg-default-nodes\/visibility$/,
        replacement: fromRoot("./src/kg-default-nodes/visibility.ts"),
      },
      {
        find: /^#kg-default-transforms$/,
        replacement: fromRoot("./src/kg-default-transforms/index.ts"),
      },
      { find: /^node-koenig-editor$/, replacement: fromRoot("./src/index.ts") },
    ],
  },
  build: {
    target: "es2022",
    minify: false,
    sourcemap: false,
    emptyOutDir: true,
    copyPublicDir: false,
    lib: {
      entry: fromRoot("./src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rolldownOptions: {
      external: isExternal,
      output: { paths: externalPath },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/__utils__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
});
