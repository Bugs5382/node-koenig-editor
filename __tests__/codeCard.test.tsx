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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { $createCodeNode } from "@lexical/code";
import { $generateHtmlFromNodes } from "@lexical/html";
import { $createTextNode, $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveCodeLanguages } from "../src/additions/code/codeLanguages";
import { INSERT_CODE_BLOCK_COMMAND } from "../src/additions/code/codeMenu";
import { documentOf, mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SOURCE = "const answer = 42;\nreturn answer;";

const addCode = async (api: KoenigEditorAPI, language = "js") => {
  await act(async () => {
    api.editorInstance.update(() => {
      const code = $createCodeNode(language);
      code.append($createTextNode(SOURCE));
      $getRoot().append(code);
    });
  });
};

const block = () => document.querySelector(".kg-code-block") as HTMLElement;

describe("languages", () => {
  it("offers plain text first and then the highlighter's own list", () => {
    const list = resolveCodeLanguages(undefined, "Plain text");
    expect(list[0]).toEqual({ label: "Plain text", value: "plain" });
    expect(list.map((entry) => entry.value)).toContain("js");
  });

  it("uses the host's list, without duplicates or empty values", () => {
    const list = resolveCodeLanguages(
      [
        { label: "Rust", value: "rust" },
        { label: "Rust again", value: "rust" },
        { label: "None", value: "" },
        { label: "Plain", value: "plain" },
      ],
      "Plain text",
    );
    expect(list.map((entry) => entry.value)).toEqual(["plain", "rust"]);
  });
});

describe("the code block", () => {
  it("is highlighted, numbered and styled by the theme", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hi") } });
    await addCode(api);
    await waitFor(() => expect(block()).not.toBeNull());
    expect(block().getAttribute("data-gutter")).toBe("1\n2");
    await waitFor(() => expect(block().querySelector(".kg-token-keyword")).not.toBeNull());
    expect(block().querySelector(".kg-token-number")?.textContent).toBe("42");
  });

  it("saves the code as plain text with the language class, no tokens and no numbers", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hi") } });
    await addCode(api, "typescript");
    await waitFor(() => expect(block()).not.toBeNull());
    const html = api.editorInstance
      .getEditorState()
      .read(() => $generateHtmlFromNodes(api.editorInstance, null));
    const dom = new DOMParser().parseFromString(html, "text/html");
    const pre = dom.querySelector("pre") as HTMLElement;
    expect(pre.className).toContain("language-typescript");
    expect(pre.getAttribute("data-language")).toBe("typescript");
    expect(pre.getAttribute("data-gutter")).toBeNull();
    expect(pre.querySelector("[class*='kg-token']")).toBeNull();
    expect(pre.innerHTML).toBe("const answer = 42;<br>return answer;");
  });
});

describe("the code bar", () => {
  const hover = async () => {
    await act(async () => {
      fireEvent.mouseOver(block());
    });
    await waitFor(() => expect(document.querySelector("[data-kg-code-bar]")).not.toBeNull());
  };

  it("sits centred above the block, not over the code", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hi") } });
    await addCode(api);
    vi.spyOn(block(), "getBoundingClientRect").mockReturnValue({
      bottom: 260,
      height: 60,
      left: 100,
      right: 300,
      top: 200,
      width: 200,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    });
    await hover();
    const bar = document.querySelector("[data-kg-code-bar]") as HTMLElement;
    expect(bar.style.left).toBe("200px");
    expect(bar.style.top).toBe("200px");
    expect(bar.className).toContain("-translate-x-1/2");
    expect(bar.className).toContain("-translate-y-full");
  });

  it("copies the code without the line numbers", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hi") } });
    await addCode(api);
    await hover();
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-code-copy]") as Element);
    });
    expect(writeText).toHaveBeenCalledWith(SOURCE);
    await waitFor(() =>
      expect(document.querySelector("[data-kg-code-copy]")?.textContent).toContain("Copied"),
    );
  });

  it("changes the block's language from the host's list", async () => {
    const { api } = await mount({
      composer: {
        codeLanguages: [
          { label: "Rust", value: "rust" },
          { label: "Go", value: "go" },
        ],
        initialEditorState: documentOf("Hi"),
      },
    });
    await addCode(api, "go");
    await hover();
    const select = document.querySelector("[data-kg-code-language]") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["plain", "rust", "go"]);
    await act(async () => {
      fireEvent.change(select, { target: { value: "rust" } });
    });
    await waitFor(() => expect(block().getAttribute("data-language")).toBe("rust"));
  });

  it("is a copy button only for a reader", async () => {
    const { api } = await mount({
      composer: { editable: false, initialEditorState: documentOf("Hi") },
    });
    await addCode(api);
    await hover();
    expect(document.querySelector("[data-kg-code-language]")).toBeNull();
    expect(document.querySelector("[data-kg-code-copy]")).not.toBeNull();
  });
});

describe("the menu", () => {
  it("lists Code, and choosing it puts a code block in", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("") } });
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Code");
  });

  it("puts a code block in place of an empty line", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("") } });
    await act(async () => {
      api.editorInstance.getRootElement()?.focus();
      api.editorInstance.update(() => {
        $getRoot().selectEnd();
      });
    });
    await act(async () => {
      api.editorInstance.dispatchCommand(INSERT_CODE_BLOCK_COMMAND, undefined);
    });
    await waitFor(() => expect(block()).not.toBeNull());
    expect(document.querySelectorAll(".kg-code-block")).toHaveLength(1);
  });
});
