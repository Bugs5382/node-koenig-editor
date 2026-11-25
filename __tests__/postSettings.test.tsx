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
import {
  findImageCards,
  type KoenigPostSettingsValue,
  PostSettingsMenu,
  resolveFeaturedImage,
} from "node-koenig-editor";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => cleanup());

const image = (id: string, alt: string) => ({
  type: "image",
  version: 1,
  src: `https://example.com/${id}.png`,
  alt,
  $: { id },
});
const doc = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
const withImages = doc(image("aaaa", "First"), image("bbbb", "Second"), {
  type: "horizontalrule",
  version: 1,
  $: { id: "cccc" },
});

const EMPTY: KoenigPostSettingsValue = {
  displayTitle: "",
  displaySubtitle: "",
  featuredImageId: "",
  topicIds: [],
};
const TOPICS = ["Art", "Books", "Code", "Design", "Film", "Games"].map((label) => ({
  id: label.toLowerCase(),
  label,
}));

const Harness = ({
  document = withImages,
  initial = EMPTY,
  onChange,
  ...rest
}: {
  document?: string;
  initial?: KoenigPostSettingsValue;
  onChange?: (value: KoenigPostSettingsValue) => void;
} & Partial<React.ComponentProps<typeof PostSettingsMenu>>) => {
  const [value, setValue] = useState(initial);
  return (
    <PostSettingsMenu
      document={document}
      topics={TOPICS}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...rest}
    />
  );
};

const click = (element: Element) => fireEvent.click(element);
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const open = () => click(screen.getByRole("button", { name: "Post settings" }));
const focused = (element: Element) => document.activeElement === element;

describe("the image helpers", () => {
  it("finds the image cards that have an id, in order", () => {
    expect(findImageCards(withImages).map((block) => block.id)).toEqual(["aaaa", "bbbb"]);
    expect(findImageCards(doc({ type: "image", version: 1, src: "x" }))).toEqual([]);
  });

  it("resolves an id to its card, or null when the card was deleted", () => {
    expect(resolveFeaturedImage(withImages, "bbbb")?.node).toMatchObject({ alt: "Second" });
    expect(resolveFeaturedImage(doc(image("aaaa", "First")), "bbbb")).toBeNull();
  });
});

describe("opening and closing", () => {
  it("is a button that opens the card and moves focus into it", () => {
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Post settings" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    open();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Post settings" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("Escape closes it and puts focus back on the button", () => {
    render(<Harness />);
    open();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(focused(screen.getByRole("button", { name: "Post settings" }))).toBe(true);
  });

  it("a click outside closes it", () => {
    render(<Harness />);
    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not open when disabled", () => {
    render(<Harness disabled />);
    expect(
      (screen.getByRole("button", { name: "Post settings" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("display title and subtitle", () => {
  it("edits both and says when they are used", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    open();
    type(screen.getByLabelText("Display title"), "Hi");
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, displayTitle: "Hi" });
    type(screen.getByLabelText("Display subtitle"), "Yo");
    expect(onChange).toHaveBeenLastCalledWith({
      ...EMPTY,
      displayTitle: "Hi",
      displaySubtitle: "Yo",
    });
    expect(screen.getAllByText(/Shown in lists, previews and when shared/).length).toBe(2);
  });
});

describe("featured image", () => {
  it("lists the images as pictures with their alt text and picks one by its id", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    open();
    const group = screen.getByRole("radiogroup", { name: "Featured image" });
    expect(
      within(group)
        .getAllByRole("img")
        .map((img) => img.getAttribute("alt")),
    ).toEqual(["First", "Second"]);
    click(within(group).getByRole("radio", { name: "Second" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, featuredImageId: "bbbb" });
  });

  it("Remove clears the choice", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ ...EMPTY, featuredImageId: "aaaa" }} onChange={onChange} />);
    open();
    expect((screen.getByRole("radio", { name: "First" }) as HTMLInputElement).checked).toBe(true);
    click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, featuredImageId: "" });
    expect(screen.getByText("No featured image")).toBeTruthy();
  });

  it("says to add an image first when the document has none", () => {
    render(<Harness document={doc()} />);
    open();
    expect(screen.getByText("Add an image to the story first.")).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("says so when the chosen image was deleted, and Remove still works", () => {
    render(<Harness initial={{ ...EMPTY, featuredImageId: "zzzz" }} />);
    open();
    expect(screen.getByRole("status").textContent).toContain("no longer in the story");
    click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("describes an image with no alt text", () => {
    render(<Harness document={doc(image("aaaa", ""))} />);
    open();
    expect(screen.getByRole("radio", { name: "Image without a description" })).toBeTruthy();
  });
});

describe("topics", () => {
  const pick = (...labels: string[]) => {
    for (const label of labels) click(screen.getByRole("checkbox", { name: label }));
  };
  const disabled = (name: string) =>
    (screen.getByRole("checkbox", { name }) as HTMLInputElement).disabled;

  it("chooses from the host's list, shows chips, and removes one", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    open();
    pick("Art", "Code");
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, topicIds: ["art", "code"] });
    click(screen.getByRole("button", { name: "Remove Art" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY, topicIds: ["code"] });
  });

  it("stops at five by default, and at the host's own limit", () => {
    render(<Harness />);
    open();
    pick("Art", "Books", "Code", "Design", "Film");
    expect(disabled("Games")).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("up to 5 topics");
    cleanup();
    render(<Harness maxTopics={1} />);
    open();
    pick("Art");
    expect(disabled("Books")).toBe(true);
  });

  it("offers no free text, and is hidden when the host gives no list", () => {
    render(<Harness />);
    open();
    const topics = document.querySelector("[data-kg-post-settings-topics]") as HTMLElement;
    expect(topics.querySelector("input[type=text]")).toBeNull();
    cleanup();
    render(<Harness topics={undefined} />);
    open();
    expect(document.querySelector("[data-kg-post-settings-topics]")).toBeNull();
  });
});

describe("the host's own items and wording", () => {
  it("lists them, runs one, closes, and returns focus to the button", async () => {
    const onSelect = vi.fn();
    render(<Harness items={[{ label: "Share draft link", onSelect }]} />);
    open();
    click(screen.getByRole("button", { name: "Share draft link" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(focused(screen.getByRole("button", { name: "Post settings" }))).toBe(true);
  });

  it("takes the host's wording over the English defaults", () => {
    render(<Harness strings={{ button: "Einstellungen", displayTitle: "Anzeigetitel" }} />);
    click(screen.getByRole("button", { name: "Einstellungen" }));
    expect(screen.getByLabelText("Anzeigetitel")).toBeTruthy();
    expect(screen.getByLabelText("Display subtitle")).toBeTruthy();
  });
});
