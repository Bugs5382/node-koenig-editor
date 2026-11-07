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
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { documentOf, mount } from "./__utils__/mount";

afterEach(() => cleanup());

const root = (api: { editorInstance: { getRootElement(): HTMLElement | null } }) =>
  api.editorInstance.getRootElement() as HTMLElement;

describe("spell check", () => {
  it("is the browser's own by default: the editing area does not switch it off", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(root(api).getAttribute("spellcheck")).not.toBe("false");
  });

  it("is switched off with spellCheck false", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), spellCheck: false },
    });
    expect(root(api).getAttribute("spellcheck")).toBe("false");
  });

  it("is switched on explicitly with spellCheck true", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), spellCheck: true },
    });
    expect(root(api).getAttribute("spellcheck")).toBe("true");
  });

  it("takes the language the host names, so the browser checks in it", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hallo"), lang: "de" },
    });
    expect(root(api).getAttribute("lang")).toBe("de");
  });

  it("has no language attribute unless the host gives one", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(root(api).hasAttribute("lang")).toBe(false);
  });
});
