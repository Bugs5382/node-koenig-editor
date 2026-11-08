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

import { menuLabels, mount, openSlashMenu } from "./__utils__/mount";

// the Code entry is the code card's own (it is not one of the strings' shipped cards)
const CODE_LABEL = "Code";

afterEach(() => cleanup());

describe("menuHidden (#98)", () => {
  it("lists the Code card in the slash menu by default", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    expect(labels).toContain(CODE_LABEL);
  });

  it("leaves a card off the menus but keeps its node, so stored documents still hold it", async () => {
    const { api } = await mount({ composer: { menuHidden: ["code"] } });
    const labels = await openSlashMenu(api);
    expect(labels).not.toContain(CODE_LABEL);
    expect(labels.length).toBeGreaterThan(0);
    expect(menuLabels().length).toBe(labels.length);
    expect(api.editorInstance._nodes.has("code")).toBe(true);
  });
});
