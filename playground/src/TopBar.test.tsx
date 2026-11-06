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
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

const bar = () => document.querySelector("header.bar") as HTMLElement;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.documentElement.className = "";
});
afterEach(cleanup);

describe("top bar", () => {
  it("has no bare browser select, colour input or checkbox", () => {
    render(<App />);
    expect(bar().querySelector("select, input")).toBeNull();
    for (const button of bar().querySelectorAll("button")) {
      expect(button.getAttribute("type")).toBe("button");
    }
  });

  it("groups its controls", () => {
    render(<App />);
    const groups = within(bar()).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Appearance",
      "Editor",
      "Actions",
    ]);
  });

  it("stays on the highest z-index the browser accepts", () => {
    const css = readFileSync(join(process.cwd(), "src/app.css"), "utf8");
    expect(css).toContain("--z-bar: 2147483647");
    expect(css).toMatch(/header\.bar \{[^}]*position: sticky[^}]*z-index: var\(--z-bar\)/s);
  });
});

describe("switches", () => {
  it("dark mode flips with a click and with the keyboard", () => {
    render(<App />);
    const dark = screen.getByRole("switch", { name: "Dark" });
    expect(dark.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(dark);
    expect(screen.getByRole("switch", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.location.search).toContain("dark=1");
  });

  it("read only follows the same setting as the panel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("switch", { name: "Read only" }));
    expect((screen.getByLabelText("read only") as HTMLInputElement).checked).toBe(true);
    expect(window.location.search).toContain("readOnly=1");
  });
});

describe("text size", () => {
  it("is five segments, one selected", () => {
    render(<App />);
    const group = screen.getByRole("radiogroup", { name: "Text size in pixels" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(["12", "14", "16", "18", "20"]);
    expect(radios.filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(radios[2]?.getAttribute("aria-checked")).toBe("true");
  });

  it("changes the page text size on click and with the arrow keys", () => {
    render(<App />);
    const group = screen.getByRole("radiogroup", { name: "Text size in pixels" });
    fireEvent.click(within(group).getByRole("radio", { name: "20" }));
    expect(document.documentElement.style.fontSize).toBe("20px");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(document.documentElement.style.fontSize).toBe("18px");
    fireEvent.keyDown(group, { key: "Home" });
    expect(document.documentElement.style.fontSize).toBe("12px");
    fireEvent.keyDown(group, { key: "ArrowLeft" }); // wraps to the last
    expect(document.documentElement.style.fontSize).toBe("20px");
  });
});

describe("selection colour", () => {
  it("opens swatches, applies the chosen colour to the editor and the address", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Selection: Default/ }));
    const group = screen.getByRole("radiogroup", { name: "Selection" });
    fireEvent.click(within(group).getByRole("radio", { name: "Pink" }));
    expect(screen.queryByRole("radiogroup", { name: "Selection" })).toBeNull();
    const box = document.querySelector(".editor-box") as HTMLElement;
    expect(box.style.getPropertyValue("--kg-selection-color")).toBe("#e0457b");
    expect(window.location.search).toContain("selection=e0457b");
  });

  it("closes on Escape and goes back to the default", () => {
    window.history.replaceState(null, "", "/?selection=e0457b");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Selection: Pink/ }));
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Selection" }), { key: "Escape" });
    expect(screen.queryByRole("radiogroup", { name: "Selection" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Selection: Pink/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Default" }));
    expect(window.location.search).not.toContain("selection");
  });
});

describe("card presets listbox", () => {
  it("opens as a listbox with the presets and marks the current one", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Cards: All cards/ }));
    const list = screen.getByRole("listbox", { name: "Cards" });
    const options = within(list).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "All cards",
      "Text and structure",
      "Pictures",
      "Divider only",
      "Custom",
    ]);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    expect(options[4]?.getAttribute("aria-disabled")).toBe("true");
  });

  it("turns the cards of a preset on when one is chosen with the mouse", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Cards: All cards/ }));
    fireEvent.click(screen.getByRole("option", { name: "Pictures" }));
    expect(window.location.search).toContain("cards=image,divider,gallery,header");
    expect(screen.getByRole("button", { name: /^Cards: Pictures/ })).toBeDefined();
    expect((screen.getByLabelText("callout") as HTMLInputElement).checked).toBe(false);
  });

  it("works from the keyboard: arrows, Enter, and Escape to leave", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Cards: All cards/ }));
    const list = screen.getByRole("listbox", { name: "Cards" });
    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list.getAttribute("aria-activedescendant")).toContain("-opt-2");
    fireEvent.keyDown(list, { key: "Enter" });
    expect(screen.getByRole("button", { name: /^Cards: Pictures/ })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /^Cards: Pictures/ }));
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Cards" }), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows Custom after a single card is ticked off by hand", () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText("callout"));
    expect(screen.getByRole("button", { name: /^Cards: Custom/ })).toBeDefined();
  });
});

describe("buttons", () => {
  it("Reset puts every bar setting back", () => {
    window.history.replaceState(null, "", "/?dark=1&size=20&selection=e0457b&readOnly=1");
    render(<App />);
    fireEvent.click(within(bar()).getByRole("button", { name: "Reset" }));
    expect(window.location.search).toBe("");
  });

  it("Load sample images is disabled while the gallery card is off", () => {
    window.history.replaceState(null, "", "/?cards=image,divider");
    render(<App />);
    expect(
      within(bar()).getByRole("button", { name: "Load sample images" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("says what failed when the package cannot start with the chosen cards, and recovers", () => {
    // A composer without the divider card throws; the page must explain it, and Reset must fix it.
    window.history.replaceState(null, "", "/?cards=image");
    const noise = console.error;
    console.error = () => {};
    try {
      render(<App />);
      expect(screen.getByRole("alert").textContent).toContain("could not start");
      fireEvent.click(within(bar()).getByRole("button", { name: "Reset" }));
      expect(screen.queryByRole("alert")).toBeNull();
      expect(document.querySelector('[contenteditable="true"]')).not.toBeNull();
    } finally {
      console.error = noise;
    }
  });
});
