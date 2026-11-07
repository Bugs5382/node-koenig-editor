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
import type { KoenigHeaderRenderProps } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const insertHeader = async (composer: Parameters<typeof mount>[0] = {}) => {
  const mounted = await mount(composer);
  await openSlashMenu(mounted.api);
  const item = document.querySelector('[data-kg-card-menu-item="Header"]');
  expect(item, "the Header entry is in the slash menu").not.toBeNull();
  await act(async () => {
    fireEvent.click(item as Element);
  });
  return mounted;
};

const headerOf = (serialized: string) =>
  JSON.parse(serialized).root.children.find((node: { type: string }) => node.type === "header");

describe("the header card", () => {
  it("inserts with a title, a subtitle, a colour background and a button", async () => {
    const { api } = await insertHeader();
    await waitFor(() => expect(headerOf(api.serialize())).toBeDefined());
    expect(document.querySelector("[data-kg-card-error]")).toBeNull();
    const node = headerOf(api.serialize());
    expect(node).toHaveProperty("header");
    expect(node).toHaveProperty("subheader");
    expect(node).toHaveProperty("backgroundColor");
    expect(node).toHaveProperty("buttonText");
    expect(node).toHaveProperty("buttonUrl");
    expect(node).toHaveProperty("backgroundImageSrc");
  });

  it("styles itself from the --kg theme variables, not fixed sizes", async () => {
    await insertHeader();
    const card = document.querySelector("[data-kg-card='header']") as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.innerHTML).toMatch(/var\(--kg-/);
  });

  it("is not a heading: the H1 to H5 limit and the outline do not see it", async () => {
    const { api } = await insertHeader();
    await waitFor(() => expect(headerOf(api.serialize())).toBeDefined());
    expect(
      document.querySelector("[data-kg-card='header'] h1, [data-kg-card='header'] h2"),
    ).toBeNull();
    const types = JSON.parse(api.serialize()).root.children.map(
      (node: { type: string }) => node.type,
    );
    expect(types).not.toContain("heading");
  });

  it("lets a host replace the layout through cardRenderers.header", async () => {
    let seen: KoenigHeaderRenderProps | undefined;
    const Replacement = (props: KoenigHeaderRenderProps) => {
      seen = props;
      return <div data-custom-header>{props.title}</div>;
    };
    const { api } = await insertHeader({ composer: { cardRenderers: { header: Replacement } } });
    expect(document.querySelector("[data-custom-header]")).not.toBeNull();
    await act(async () => {
      seen?.update({ backgroundColor: "#112233", buttonText: "Go", title: "Section" });
    });
    expect(headerOf(api.serialize())).toMatchObject({
      backgroundColor: "#112233",
      buttonText: "Go",
    });
  });
});

describe("the header card's settings", () => {
  it("offers alignment as a radio group, not a native list that opens somewhere else", async () => {
    const { api } = await insertHeader();
    await waitFor(() => expect(document.querySelector("[data-kg-settings-panel]")).not.toBeNull());
    const panel = document.querySelector("[data-kg-settings-panel]") as HTMLElement;
    expect(panel.querySelector("select")).toBeNull();
    const group = panel.querySelector('[role="radiogroup"][aria-label="Alignment"]') as HTMLElement;
    expect(group, "the alignment radio group").not.toBeNull();
    expect(group.getAttribute("aria-label")).toBe("Alignment");
    const radios = [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map((radio) => radio.closest("label")?.textContent?.trim())).toEqual([
      "Left",
      "Centered",
      "Right",
    ]);
    expect(radios.find((radio) => radio.checked)?.value).toBe("center");
    await act(async () => {
      fireEvent.click(radios[0] as Element);
    });
    expect(headerOf(api.serialize()).alignment).toBe("left");
    expect(
      (
        document.querySelectorAll(
          '[data-kg-settings-panel] [role="radiogroup"][aria-label="Alignment"] input',
        )[0] as HTMLInputElement
      ).checked,
    ).toBe(true);
  });

  it("keeps every setting label on one line", async () => {
    await insertHeader();
    await waitFor(() => expect(document.querySelector("[data-kg-settings-panel]")).not.toBeNull());
    const labels = document.querySelectorAll<HTMLElement>(
      "[data-kg-settings-panel] [data-header-label]",
    );
    expect(labels.length).toBeGreaterThanOrEqual(3);
    for (const label of labels) {
      expect(label.style.whiteSpace).toBe("nowrap");
    }
  });
});

describe("the header card keeps its text readable", () => {
  it("does not dim the subtitle with opacity, which lowers its contrast below 4.5:1", async () => {
    await insertHeader();
    await waitFor(() => expect(document.querySelector("[data-header-subtitle]")).not.toBeNull());
    const subtitle = document.querySelector("[data-header-subtitle]") as HTMLElement;
    expect(subtitle.style.opacity).toBe("");
  });
});
