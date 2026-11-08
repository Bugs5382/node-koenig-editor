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

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const insertButton = async (api: KoenigEditorAPI) => {
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-card-menu-item="Button"]') as Element);
  });
  await waitFor(() => expect(document.querySelector("[data-testid='button-input-text']")).not.toBeNull());
};

describe("the button card's host options (#100)", () => {
  it("shows the colour controls, the emoji field and optional fields by default", async () => {
    const { api } = await mount();
    await insertButton(api);
    expect(document.querySelector("[data-testid='button-color-picker']")).not.toBeNull();
    expect(document.querySelector("[data-testid='button-text-color-picker']")).not.toBeNull();
    expect(document.querySelector("[data-testid='button-emoji-field']")).not.toBeNull();
  });

  it("hides the colour controls and the emoji field when the host sets the look itself", async () => {
    const { api } = await mount({ composer: { buttonCard: { colors: false, emoji: false } } });
    await insertButton(api);
    expect(document.querySelector("[data-testid='button-color-picker']")).toBeNull();
    expect(document.querySelector("[data-testid='button-text-color-picker']")).toBeNull();
    expect(document.querySelector("[data-testid='button-emoji-field']")).toBeNull();
    // the label and the link stay
    expect(document.querySelector("[data-testid='button-input-text']")).not.toBeNull();
    expect(document.querySelector("[data-testid='button-input-url']")).not.toBeNull();
  });

  it("marks the label and the link as required", async () => {
    const { api } = await mount({ composer: { buttonCard: { required: true } } });
    await insertButton(api);
    for (const id of ["button-input-text", "button-input-url"]) {
      const input = document.querySelector(`[data-testid='${id}']`) as HTMLElement;
      const field = input.matches("input") ? input : (input.querySelector("input") as HTMLElement);
      expect(field.getAttribute("aria-required"), id).toBe("true");
      expect(field.hasAttribute("required"), id).toBe(true);
    }
  });
});
