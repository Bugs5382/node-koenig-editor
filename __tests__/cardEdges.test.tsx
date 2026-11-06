import { act, cleanup, fireEvent } from "@testing-library/react";
import {
  $createNodeSelection,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalCommand,
} from "lexical";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

type Api = Awaited<ReturnType<typeof mount>>["api"];

const card = (type: string, extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  ...extra,
});
const callout = () =>
  card("callout", { backgroundColor: "blue", calloutEmoji: "", calloutText: "Note" });
const divider = () => card("horizontalrule");
const blank = () => ({
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
});

const documentWith = (...children: unknown[]) =>
  JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });

/** The top-level node types, with "gap" for an empty paragraph and "paragraph" for a filled one. */
const shape = (api: Api) =>
  api.editorInstance.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) =>
        $isParagraphNode(child)
          ? child.getTextContent() === ""
            ? "gap"
            : "paragraph"
          : child.getType(),
      ),
  );

const selectionKind = (api: Api) =>
  api.editorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    if ($isNodeSelection(selection)) return `card:${selection.getNodes()[0]?.getType()}`;
    if ($isRangeSelection(selection)) {
      return `text:${selection.anchor.getNode().getTopLevelElement()?.getIndexWithinParent()}`;
    }
    return "none";
  });

const selectNode = async (api: Api, index: number, asCard: boolean) => {
  await act(async () => {
    api.editorInstance.getRootElement()?.focus();
    api.editorInstance.update(() => {
      const node = $getRoot().getChildAtIndex(index)!;
      if (asCard) {
        const selection = $createNodeSelection();
        selection.add(node.getKey());
        $setSelection(selection);
      } else {
        node.selectStart();
      }
    });
  });
};

const press = async (api: Api, command: LexicalCommand<KeyboardEvent>, key: string) => {
  await act(async () => {
    api.editorInstance.dispatchCommand(command, new KeyboardEvent("keydown", { key }));
  });
};

const insertFromMenu = async (api: Api, label: string) => {
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector(`[data-kg-card-menu-item="${label}"]`) as Element);
  });
};

describe("the editor keeps room for the cursor at the ends of a document", () => {
  it("adds a paragraph either side of a document that is only a card", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    expect(shape(api)).toEqual(["gap", "callout", "gap"]);
  });

  it("adds them to a document of only cards, and none between the cards", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout(), divider(), callout()) },
    });
    expect(shape(api)).toEqual(["gap", "callout", "horizontalrule", "callout", "gap"]);
  });

  it("leaves a document that already has them alone", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(blank(), callout(), blank()) },
    });
    expect(shape(api)).toEqual(["gap", "callout", "gap"]);
  });

  it("puts the end paragraph back if there is none, but only at the ends", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(blank(), callout(), blank()) },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().getLastChild()?.remove();
      });
    });
    expect(shape(api)).toEqual(["gap", "callout", "gap"]);
  });

  it("does not touch a read-only editor", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout()) },
      editor: { readOnly: true },
    });
    expect(shape(api)).toEqual(["callout"]);
  });
});

describe("a gap between two cards is the person's to keep or delete", () => {
  it("callout then divider: at most one empty paragraph between them", async () => {
    const { api } = await mount();
    await insertFromMenu(api, "Callout");
    await insertFromMenu(api, "Divider");
    const order = shape(api);
    const between = order.slice(order.indexOf("callout") + 1, order.indexOf("horizontalrule"));
    expect(between.filter((node) => node === "gap").length).toBeLessThanOrEqual(1);
    expect(order.at(-1)).toBe("gap");
  });

  it("a gap that is removed stays removed", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith(blank(), callout(), blank(), divider(), blank()),
      },
    });
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().getChildAtIndex(2)?.remove();
      });
    });
    expect(shape(api)).toEqual(["gap", "callout", "horizontalrule", "gap"]);
  });

  it("Backspace in the gap deletes it, and it is not added back", async () => {
    const { api } = await mount({
      composer: {
        initialEditorState: documentWith(blank(), callout(), blank(), divider(), blank()),
      },
    });
    await selectNode(api, 2, false);
    await press(api, KEY_BACKSPACE_COMMAND as LexicalCommand<KeyboardEvent>, "Backspace");
    const order = shape(api);
    expect(order.filter((node) => node === "gap").length).toBeLessThan(3);
    expect(order).not.toContain("paragraph");
    const between = order.slice(order.indexOf("callout") + 1, order.indexOf("horizontalrule"));
    expect(between).toEqual([]);
  });

  it("callout, divider, callout: nothing is added between them", async () => {
    const { api } = await mount();
    await insertFromMenu(api, "Callout");
    await insertFromMenu(api, "Divider");
    await insertFromMenu(api, "Callout");
    const order = shape(api);
    const first = order.indexOf("callout");
    const last = order.lastIndexOf("callout");
    expect(
      order.slice(first + 1, last).filter((node) => node === "gap").length,
    ).toBeLessThanOrEqual(2);
    expect(order.at(-1)).toBe("gap");
  });

  it("undo and redo settle on the same document", async () => {
    const { api } = await mount();
    await insertFromMenu(api, "Callout");
    await insertFromMenu(api, "Divider");
    const before = shape(api);
    await act(async () => {
      api.editorInstance.dispatchCommand(UNDO_COMMAND, undefined);
    });
    const undone = shape(api);
    expect(undone.filter((node) => node === "horizontalrule")).toHaveLength(0);
    expect(undone.at(-1)).not.toBe("horizontalrule");
    await act(async () => {
      api.editorInstance.dispatchCommand(REDO_COMMAND, undefined);
    });
    expect(shape(api)).toEqual(before);
  });
});

describe("the keyboard reaches the space around a card", () => {
  it("Arrow up on the first card puts the cursor in the paragraph above", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    await selectNode(api, 1, true);
    await press(api, KEY_ARROW_UP_COMMAND, "ArrowUp");
    expect(selectionKind(api)).toBe("text:0");
  });

  it("Arrow down on the last card puts the cursor in the paragraph below", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    await selectNode(api, 1, true);
    await press(api, KEY_ARROW_DOWN_COMMAND, "ArrowDown");
    expect(selectionKind(api)).toBe("text:2");
  });

  it("Arrow down between two cards moves to the next card", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout(), divider()) },
    });
    await selectNode(api, 1, true);
    await press(api, KEY_ARROW_DOWN_COMMAND, "ArrowDown");
    expect(selectionKind(api)).toBe("card:horizontalrule");
  });

  it("Enter on a card with no paragraph after it creates one and puts the cursor in it", async () => {
    const { api } = await mount({
      composer: { initialEditorState: documentWith(callout(), divider()) },
    });
    await selectNode(api, 1, true);
    await press(api, KEY_ENTER_COMMAND as LexicalCommand<KeyboardEvent>, "Enter");
    expect(shape(api).slice(0, 4)).toEqual(["gap", "callout", "gap", "horizontalrule"]);
    expect(selectionKind(api)).toBe("text:2");
  });

  it("Enter on the last card leaves the cursor in a paragraph below it", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentWith(callout()) } });
    await selectNode(api, 1, true);
    await press(api, KEY_ENTER_COMMAND as LexicalCommand<KeyboardEvent>, "Enter");
    expect(shape(api).slice(0, 2)).toEqual(["gap", "callout"]);
    expect(shape(api).at(-1)).toBe("gap");
    expect(selectionKind(api)).toMatch(/^text:/);
  });
});
