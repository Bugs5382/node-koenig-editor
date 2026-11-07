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
import { describe, expect, it } from "vitest";

// loaded by a variable path so the type check does not walk the card sources
const load = async () => {
  const modulePath: string = "../src/koenig-lexical/utils/collabCardProperties";
  return (await import(/* @vite-ignore */ modulePath)) as {
    withCardProperties: (
      nodes: unknown[],
      host?: Map<unknown, Set<string>>,
    ) => Map<unknown, Set<string>>;
  };
};

// A card says which of its properties stay in one window with a static list on its class. Every
// other property is shared, and the host's own exclusions are added on top.
describe("the properties a shared session keeps local", () => {
  class CustomCard {
    draft = 1;
    static collabLocalProperties = ["__draftEditorState"];
  }
  class SharedCard {
    draft = 2;
  }

  it("reads each registered card's own list", async () => {
    const { withCardProperties } = await load();
    const merged = withCardProperties([CustomCard, SharedCard]);
    expect([...(merged.get(CustomCard) ?? [])]).toEqual(["__draftEditorState"]);
    expect(merged.has(SharedCard)).toBe(false);
  });

  it("adds the host's exclusions to the card's own", async () => {
    const { withCardProperties } = await load();
    const merged = withCardProperties([CustomCard], new Map([[CustomCard, new Set(["__other"])]]));
    expect([...(merged.get(CustomCard) ?? [])].sort()).toEqual(["__draftEditorState", "__other"]);
  });

  it("covers the package's own cards the same way", async () => {
    const nodesPath: string = "../src/koenig-lexical/nodes/DefaultNodes";
    const { default: nodes } = (await import(/* @vite-ignore */ nodesPath)) as {
      default: unknown[];
    };
    const { withCardProperties } = await load();
    const merged = withCardProperties(nodes);
    const named = [...merged.keys()]
      .map((node) => (node as unknown as { getType: () => string }).getType())
      .sort();
    expect(named).toEqual([
      "audio",
      "callout",
      "file",
      "gallery",
      "header",
      "image",
      "toggle",
      "toggle-group",
      "video",
    ]);
  });

  it("skips entries that are not classes", async () => {
    const { withCardProperties } = await load();
    expect(withCardProperties([{ replace: CustomCard, with: () => null }]).size).toBe(0);
  });
});
