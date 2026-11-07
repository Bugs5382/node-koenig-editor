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
import { afterEach, describe, expect, it } from "vitest";

import { renderButtonNode } from "../src/kg-default-nodes/nodes/button/button-renderer";
import { parseButtonNode } from "../src/kg-default-nodes/nodes/button/button-parser";
import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const documentWith = (button: Record<string, unknown>) =>
  JSON.stringify({
    root: {
      children: [{ type: "button", version: 1, ...button }],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const buttonOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "button");

const render = (data: Record<string, unknown>) => {
  const out = renderButtonNode(data as never, { createDocument: () => document } as never);
  return out.element as HTMLElement;
};

describe("the button card", () => {
  it("inserts from the slash menu without the error card", async () => {
    const { api } = await mount();
    await openSlashMenu(api);
    const item = document.querySelector('[data-kg-card-menu-item="Button"]');
    expect(item, "the Button entry is in the slash menu").not.toBeNull();
    await act(async () => {
      fireEvent.click(item as Element);
    });
    await waitFor(() => expect(buttonOf(api.serialize())).toBeDefined());
    expect(document.querySelector("[data-kg-card-error]")).toBeNull();
    expect(buttonOf(api.serialize())).toMatchObject({ alignment: "center", buttonUrl: "" });
  });

  it("keeps an https link and drops a javascript link when a document loads", async () => {
    const ok = await mount({
      composer: {
        initialEditorState: documentWith({ buttonText: "Go", buttonUrl: "https://example.com/a" }),
      },
    });
    expect(buttonOf(ok.api.serialize())).toMatchObject({
      buttonText: "Go",
      buttonUrl: "https://example.com/a",
    });
    cleanup();
    const bad = await mount({
      composer: {
        initialEditorState: documentWith({ buttonText: "Go", buttonUrl: "JaVaScRiPt:alert(1)" }),
      },
    });
    expect(buttonOf(bad.api.serialize())).toMatchObject({ buttonText: "Go", buttonUrl: "" });
  });

  it("renders a link card for an allowed URL and nothing for an unsafe one", () => {
    const card = render({ alignment: "left", buttonText: "Go", buttonUrl: "mailto:a@example.com" });
    expect(card.className).toContain("kg-button-card");
    expect(card.className).toContain("kg-align-left");
    expect(card.querySelector("a")?.getAttribute("href")).toBe("mailto:a@example.com");
    for (const url of ["javascript:alert(1)", " data:text/html,x", "//example.com", "/a"]) {
      const empty = render({ alignment: "center", buttonText: "Go", buttonUrl: url });
      expect(empty.querySelector("a"), url).toBeNull();
    }
  });

  it("drops an unsafe href when it is read back from HTML", () => {
    const seen: Record<string, unknown>[] = [];
    class Stub {
      constructor(data: Record<string, unknown>) {
        seen.push(data);
      }
    }
    const read = (href: string) => {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `<div class="kg-card kg-button-card kg-align-center"><a class="kg-btn" href="${href}">Go</a></div>`;
      const element = wrapper.firstElementChild as HTMLElement;
      parseButtonNode(Stub as never)
        .div(element)
        ?.conversion(element);
    };
    read("https://example.com");
    read("javascript:alert(1)");
    expect(seen.map((data) => data.buttonUrl)).toEqual(["https://example.com", ""]);
  });

  it("is left out when the host does not pick it", async () => {
    const { api } = await mount({ composer: { cards: ["image", "divider"] } });
    const labels = await openSlashMenu(api);
    expect(labels).not.toContain("Button");
  });
});
