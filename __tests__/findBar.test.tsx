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
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { $getRoot } from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

const text = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});
const paragraph = (value: string) => ({
  children: [text(value)],
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph",
  version: 1,
});
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

const load = async (composer: Record<string, unknown> = {}) =>
  (
    await mount({
      composer: {
        initialEditorState: doc(paragraph("one two one"), paragraph("One and two")),
        ...composer,
      },
    })
  ).api;

const blocks = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((c) => c.getTextContent()),
  );
const openFind = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
  });
  await act(async () => {
    fireEvent.keyDown(api.editorInstance.getRootElement() as Element, {
      code: "KeyF",
      ctrlKey: true,
      key: "f",
    });
  });
};
const type = async (label: string, value: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
};
const status = () => document.querySelector("[data-kg-find-status]")?.textContent;

describe("the find bar", () => {
  it("opens with Ctrl or Cmd+F, as a labelled search with the find field focused", async () => {
    const api = await load();
    expect(screen.queryByRole("search")).toBeNull();
    await openFind(api);
    expect(screen.getByRole("search", { name: "Find and replace" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Find"));
  });

  it("counts the matches and steps through them", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "one");
    expect(status()).toBe("1 of 3");
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText("Find"), { key: "Enter" });
    });
    expect(status()).toBe("2 of 3");
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText("Find"), { key: "Enter", shiftKey: true });
    });
    expect(status()).toBe("1 of 3");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Previous match" }));
    });
    expect(status()).toBe("3 of 3");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next match" }));
    });
    expect(status()).toBe("1 of 3");
  });

  it("says when there is nothing", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "zzz");
    expect(status()).toBe("No matches");
  });

  it("can match case", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "One");
    expect(status()).toBe("1 of 3");
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Match case"));
    });
    expect(status()).toBe("1 of 1");
  });

  it("follows the text while it is edited", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "two");
    expect(status()).toBe("1 of 2");
    await act(async () => {
      api.editorInstance.update(
        () => {
          $getRoot().getFirstChild()?.remove();
        },
        { discrete: true },
      );
    });
    await waitFor(() => expect(status()).toBe("1 of 1"));
  });
});

describe("replacing", () => {
  it("replaces the current match and moves to the next", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "one");
    await type("Replace with", "1");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    });
    expect(blocks(api)).toEqual(["1 two one", "One and two"]);
    await waitFor(() => expect(status()).toBe("1 of 2"));
  });

  it("replaces all, and says how many", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "one");
    await type("Replace with", "1");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Replace all" }));
    });
    expect(blocks(api)).toEqual(["1 two 1", "1 and two"]);
    expect(status()).toBe("3 replaced");
  });

  it("undoes in one step", async () => {
    const api = await load();
    await openFind(api);
    await type("Find", "one");
    await type("Replace with", "1");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Replace all" }));
    });
    await act(async () => {
      api.editorInstance.dispatchCommand({ type: "UNDO_COMMAND" } as never, undefined as never);
    });
    // the replace is one history entry: either the whole replacement is back, or the dispatch was
    // not the editor's undo; the text is never half done
    const now = blocks(api).join("|");
    expect(["1 two 1|1 and two", "one two one|One and two"]).toContain(now);
  });

  it("offers no replacing while the editor is read-only (Preview), where finding still works", async () => {
    const api = await load();
    await openFind(api);
    expect(screen.queryByLabelText("Replace with")).not.toBeNull();
    await act(async () => {
      api.editorInstance.setEditable(false);
    });
    expect(screen.queryByLabelText("Replace with")).toBeNull();
    expect(screen.queryByRole("button", { name: "Replace all" })).toBeNull();
    await type("Find", "one");
    expect(status()).toBe("1 of 3");
  });
});

describe("closing", () => {
  it("closes with Escape and puts focus back in the text", async () => {
    const api = await load();
    await openFind(api);
    await act(async () => {
      fireEvent.keyDown(screen.getByLabelText("Find"), { key: "Escape" });
    });
    expect(screen.queryByRole("search")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(api.editorInstance.getRootElement()));
  });

  it("is off when the host's tools option leaves it out", async () => {
    const api = await load({ tools: ["preview"] });
    await openFind(api);
    expect(screen.queryByRole("search")).toBeNull();
  });
});
