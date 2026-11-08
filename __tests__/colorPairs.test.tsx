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
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import {
  isColorAllowed,
  isColorValue,
  resolveColorSetting,
} from "../src/additions/colors/colors";
import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const PAIRS = [
  { ink: "var(--host-ink)", label: "Info", value: "var(--host-info-soft)" },
  { ink: "var(--host-ink)", label: "Danger", value: "var(--host-danger-soft)" },
];

describe("a swatch value may be a CSS variable, and carry its own text colour (#97)", () => {
  it("accepts a hex colour or a plain var(--name), and nothing else", () => {
    for (const value of ["#fff", "#A1B2C3", "var(--host-info)", "var(--a-1)", "VAR(--X)"]) {
      expect(isColorValue(value), value).toBe(true);
    }
    for (const value of [
      "red",
      "var(--)",
      "var(--a b)",
      "var(--a);color:red",
      "var(--a, red)",
      "var(--a) !important",
      "url(x)",
      "expression(1)",
      "var(--a)var(--b)",
      "",
      null,
      undefined,
    ]) {
      expect(isColorValue(value), String(value)).toBe(false);
    }
  });

  it("keeps a swatch's ink when it is a colour value, and drops one that is not", () => {
    const setting = resolveColorSetting("calloutBackground", {
      calloutBackground: {
        palette: [
          { ink: "var(--host-ink)", label: "Good", value: "var(--host-soft)" },
          { ink: "red; background: url(x)", label: "Bad ink", value: "#aabbcc" },
          { label: "Bad value", value: "var(--x);color:red" },
        ],
        picker: false,
      },
    });
    expect(setting.palette).toEqual([
      { ink: "var(--host-ink)", label: "Good", value: "var(--host-soft)" },
      { label: "Bad ink", value: "#aabbcc" },
    ]);
  });

  it("lets only the host's own swatches through when the picker is off", () => {
    const setting = resolveColorSetting("calloutBackground", {
      calloutBackground: { none: false, palette: PAIRS, picker: false },
    });
    expect(isColorAllowed(setting, "var(--host-info-soft)")).toBe(true);
    expect(isColorAllowed(setting, "var(--other)")).toBe(false);
    expect(isColorAllowed(setting, "#ffffff")).toBe(false);
  });
});

const openCallout = async (api: KoenigEditorAPI) => {
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector("[data-kg-card-menu-item='Callout']") as Element);
  });
  await waitFor(() =>
    expect(document.querySelector("[data-testid='callout-color-picker']")).not.toBeNull(),
  );
};

const calloutOf = (api: KoenigEditorAPI) =>
  JSON.parse(api.serialize()).root.children.find((node: { type: string }) => node.type === "callout");

describe("a new callout starts on the host's first swatch (#97)", () => {
  it("uses the first swatch and its ink when the host gives a palette", async () => {
    const { api } = await mount({
      composer: { colors: { calloutBackground: { none: false, palette: PAIRS, picker: false } } },
    });
    await openCallout(api);
    expect(calloutOf(api).backgroundColor).toBe("var(--host-info-soft)");
    expect(calloutOf(api).textColor).toBe("var(--host-ink)");
  });

  it("keeps the editor's own default when the host gives no palette", async () => {
    const { api } = await mount();
    await openCallout(api);
    expect(calloutOf(api).backgroundColor).toBe("blue");
  });
});

describe("the callout takes a pair from one control (#97)", () => {
  const colors = { calloutBackground: { none: false, palette: PAIRS, picker: false } };

  it("sets the background and the text colour together, with no separate text control", async () => {
    const { api } = await mount({ composer: { colors } });
    await openCallout(api);
    expect(document.querySelector("[data-testid='callout-text-color-picker']")).toBeNull();
    const swatches = [
      ...document.querySelectorAll("[data-testid='callout-color-picker'] [data-kg-color-swatch]"),
    ] as HTMLElement[];
    expect(swatches.map((swatch) => swatch.getAttribute("data-kg-color-swatch"))).toEqual([
      "var(--host-info-soft)",
      "var(--host-danger-soft)",
    ]);
    await act(async () => {
      fireEvent.click(swatches[1] as HTMLElement);
    });
    expect(calloutOf(api).backgroundColor).toBe("var(--host-danger-soft)");
    expect(calloutOf(api).textColor).toBe("var(--host-ink)");
    const card = document.querySelector("[data-testid='callout-bg-custom']") as HTMLElement;
    expect(card.getAttribute("style")).toContain("background-color: var(--host-danger-soft)");
    expect(card.getAttribute("style")).toContain("color: var(--host-ink)");
  });

  it("still shows the text control when a swatch has no ink of its own", async () => {
    const { api } = await mount({
      composer: {
        colors: {
          calloutBackground: {
            palette: [{ label: "Plain", value: "#e5eaf6" }],
            picker: false,
          },
        },
      },
    });
    await openCallout(api);
    expect(document.querySelector("[data-testid='callout-text-color-picker']")).not.toBeNull();
  });
});
