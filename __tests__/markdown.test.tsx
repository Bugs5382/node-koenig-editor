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
import { renderMarkdown } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { renderMarkdownNode } from "../src/kg-default-nodes/nodes/markdown/markdown-renderer";
import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const html = (source: string) => {
  const holder = document.createElement("div");
  holder.innerHTML = renderMarkdown(source);
  return holder;
};

const documentWith = (markdown: string) =>
  JSON.stringify({
    root: {
      children: [{ type: "markdown", version: 1, markdown }],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

describe("rendering Markdown safely", () => {
  it("renders the usual syntax", () => {
    const out = html(
      "# One\n\nSome **bold** and `code`.\n\n- a\n- b\n\n[site](https://example.com)",
    );
    expect(out.querySelector("h1")?.textContent).toBe("One");
    expect(out.querySelector("strong")?.textContent).toBe("bold");
    expect(out.querySelectorAll("li")).toHaveLength(2);
    expect(out.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
  });

  it("does not let raw HTML through", () => {
    const out = html(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n<b onclick="x()">hi</b>',
    );
    expect(out.querySelector("script")).toBeNull();
    expect(out.querySelector("img")).toBeNull();
    expect(out.querySelector("b")).toBeNull();
    expect(out.innerHTML).not.toMatch(/<script|<img|<b /);
    expect(out.textContent).toContain("alert(1)");
  });

  it("leaves a link that is not http, https or mailto as plain text", () => {
    for (const href of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "/relative",
      "//example.com",
    ]) {
      const out = html(`[click](${href})`);
      expect(out.querySelector("a"), href).toBeNull();
    }
    expect(html("[mail](mailto:a@example.com)").querySelector("a")?.getAttribute("href")).toBe(
      "mailto:a@example.com",
    );
  });

  it("only keeps images with an http or https source", () => {
    expect(html("![x](javascript:alert(1))").querySelector("img")).toBeNull();
    expect(html("![x](data:image/svg+xml;base64,AAAA)").querySelector("img")).toBeNull();
    expect(html("![x](https://example.com/a.png)").querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/a.png",
    );
  });

  it("stops headings at H5", () => {
    const out = html("##### five\n\n###### six");
    expect(out.querySelector("h6")).toBeNull();
    expect(out.querySelectorAll("h5")).toHaveLength(2);
  });

  it("gives the exported HTML exactly what the preview renders", () => {
    const source = "## Title\n\n[a](https://example.com) <script>x</script>";
    const element = renderMarkdownNode({ markdown: source }, {
      createDocument: () => document,
    } as never).element as HTMLElement;
    expect(element.innerHTML).toBe(renderMarkdown(source));
  });
});

describe("the markdown card", () => {
  it("inserts from the slash menu without the error card", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    const item = document.querySelector('[data-kg-card-menu-item="Markdown"]');
    expect(item, "the Markdown entry is in the slash menu").not.toBeNull();
    await act(async () => {
      fireEvent.click(item as Element);
    });
    await waitFor(() =>
      expect(
        JSON.parse(api.serialize()).root.children.some(
          (node: { type: string }) => node.type === "markdown",
        ),
      ).toBe(true),
    );
    expect(document.querySelector("[data-kg-card-error]")).toBeNull();
    expect(document.querySelector('[data-testid="markdown-editor"]')).not.toBeNull();
  });

  it("shows stored Markdown as rendered, safe HTML", async () => {
    await mount({
      composer: {
        initialEditorState: documentWith("**hi** <script>bad()</script> [x](javascript:bad())"),
      },
    });
    const preview = document.querySelector('[data-testid="markdown-preview"]') as HTMLElement;
    expect(preview.querySelector("strong")?.textContent).toBe("hi");
    expect(preview.querySelector("script")).toBeNull();
    expect(preview.querySelector("a")).toBeNull();
  });

  it("is left out when the host does not pick it", async () => {
    const { api } = await mount({ composer: { cards: ["image", "divider"] } });
    expect(await openSlashMenu(api)).not.toContain("Markdown");
  });
});
