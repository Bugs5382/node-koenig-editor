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
import { useCollaborationContext } from "@lexical/react/LexicalCollaborationContext";
import { act, screen, waitFor } from "@testing-library/react";
import {
  $getRoot,
  $isTextNode,
  createCommand,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";
import {
  DEFAULT_STRINGS,
  KOENIG_CARD_NAMES,
  KOENIG_TOOLBAR_ITEMS,
  type CardMenuItem,
  type KoenigCollaboration,
  type KoenigEditorAPI,
} from "node-koenig-editor";
import type { JSX } from "react";
import { describe, expect, it } from "vitest";

import { documentOf, mount, openSlashMenu } from "./__utils__/mount";

const INSERT_BADGE_COMMAND = createCommand<unknown>("INSERT_BADGE_COMMAND");

/** A host's own card: a plain decorator node with a menu entry. */
class BadgeNode extends DecoratorNode<JSX.Element> {
  static kgMenu = {
    insertCommand: INSERT_BADGE_COMMAND,
    label: "Badge",
    matches: ["badge"],
  };

  static override getType(): string {
    return "badge";
  }

  static override clone(node: BadgeNode): BadgeNode {
    return new BadgeNode(node.__key);
  }

  static override importJSON(): BadgeNode {
    return new BadgeNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  override createDOM(): HTMLElement {
    return document.createElement("span");
  }

  override decorate(): JSX.Element {
    return <span>badge</span>;
  }

  override exportJSON(): SerializedLexicalNode {
    return { type: "badge", version: 1 };
  }

  override updateDOM(): false {
    return false;
  }
}

describe("cards", () => {
  it("lists every shipped card when the host picks none", async () => {
    const { api } = await mount();
    const labels = await openSlashMenu(api);
    for (const card of KOENIG_CARD_NAMES) {
      expect(labels).toContain(DEFAULT_STRINGS.cards[card].label);
    }
  });

  it("leaves a card the host did not pick out of the menus and the editor", async () => {
    const { api } = await mount({ composer: { cards: ["image", "divider"] } });
    const labels = await openSlashMenu(api);
    expect(labels).toEqual(expect.arrayContaining(["Image", "Divider"]));
    expect(labels).not.toContain("Callout");
    expect(labels).not.toContain("Toggle");
    expect(labels).not.toContain("Table");
    const types = [...api.editorInstance._nodes.keys()];
    expect(types).not.toContain("callout");
    expect(types).not.toContain("table");
  });
});

describe("custom nodes and menu entries", () => {
  it("registers a host node next to the shipped ones and lists its menu entry", async () => {
    const { api } = await mount({ composer: { customNodes: [BadgeNode] } });
    expect(api.editorInstance.hasNodes([BadgeNode as unknown as typeof LexicalNode])).toBe(true);
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Badge");
    expect(labels).toContain("Image");
  });

  it("adds the host's own menu entries to the menus", async () => {
    const entry: CardMenuItem = {
      insertCommand: createCommand<unknown>("INSERT_DATE_COMMAND"),
      label: "Today's date",
      matches: ["date"],
    };
    const { api } = await mount({ composer: { menuItems: [entry] } });
    expect(await openSlashMenu(api)).toContain("Today's date");
  });
});

describe("strings", () => {
  it("uses English by default", async () => {
    await mount();
    expect(await screen.findByText(DEFAULT_STRINGS.placeholder)).toBeDefined();
  });

  it("takes the host's wording for the placeholder and the menus", async () => {
    const { api } = await mount({
      composer: {
        strings: { cards: { image: { label: "Picture" } }, placeholder: "Write something" },
      },
    });
    expect(await screen.findByText("Write something")).toBeDefined();
    const labels = await openSlashMenu(api);
    expect(labels).toContain("Picture");
    expect(labels).not.toContain("Image");
    expect(labels).toContain("Divider");
  });
});

/** Selects all the text, which shows the format toolbar, and lists its buttons. */
const toolbarButtons = async (api: KoenigEditorAPI) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const text = $getRoot().getFirstDescendant();
      if ($isTextNode(text)) text.select(0, text.getTextContentSize());
    });
  });
  // Browsers announce a new selection with this event; jsdom does not.
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
  await waitFor(() => expect(document.querySelector("[data-kg-toolbar-button]")).not.toBeNull());
  return [...document.querySelectorAll("[data-kg-toolbar-button]")].map((button) =>
    button.getAttribute("data-kg-toolbar-button"),
  );
};

describe("toolbar", () => {
  it("names every format button the package ships", () => {
    expect(KOENIG_TOOLBAR_ITEMS).toEqual(
      expect.arrayContaining(["bold", "italic", "heading2", "heading3", "quote", "link"]),
    );
  });

  it("shows every format button when the host picks none", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Hello") } });
    expect(await toolbarButtons(api)).toEqual(
      expect.arrayContaining(["bold", "italic", "h2", "h3", "quote", "link"]),
    );
  });

  it("shows only the format buttons the host picked", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentOf("Hello"), toolbar: ["bold", "link"] },
    });
    expect(await toolbarButtons(api)).toEqual(["bold", "link"]);
  });
});

const CollabState = ({ onState }: { onState: (active: boolean) => void }) => {
  onState(useCollaborationContext().isCollabActive);
  return null;
};

describe("collaboration", () => {
  it("edits alone with no provider when the host passes no collaboration", async () => {
    const seen: boolean[] = [];
    await mount({ extra: <CollabState onState={(active) => seen.push(active)} /> });
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen.every((active) => active === false)).toBe(true);
  });

  it("asks the host's factory for the main provider when collaboration is on", async () => {
    const asked: string[] = [];
    const collaboration: KoenigCollaboration = {
      providerFactory: (id) => {
        asked.push(id);
        return {
          awareness: {
            getLocalState: () => null,
            getStates: () => new Map(),
            off: () => {},
            on: () => {},
            setLocalState: () => {},
            setLocalStateField: () => {},
          },
          connect: () => {},
          disconnect: () => {},
          off: () => {},
          on: () => {},
        };
      },
    };
    await mount({ composer: { collaboration } });
    await waitFor(() => expect(asked).toContain("main"));
  });
});
