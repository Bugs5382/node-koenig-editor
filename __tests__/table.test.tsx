import { $isTableCellNode, $isTableNode, $isTableRowNode, TableNode } from "@lexical/table";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import {
  type ElementNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  KEY_TAB_COMMAND,
} from "lexical";
import type { KoenigEditorAPI } from "node-koenig-editor";
import { afterEach, describe, expect, it } from "vitest";

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const insertTable = async (api: KoenigEditorAPI) => {
  await openSlashMenu(api);
  await act(async () => {
    fireEvent.click(document.querySelector('[data-kg-card-menu-item="Table"]') as Element);
  });
};

/** Rows of cell text-free shape: the header state of each cell. */
const shape = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => {
    const table = $getRoot().getChildren().find($isTableNode) as TableNode;
    return table
      .getChildren()
      .map((row) =>
        $isTableRowNode(row)
          ? row.getChildren().map((cell) => ($isTableCellNode(cell) ? cell.getHeaderStyles() : -1))
          : [],
      );
  });

/** Puts the cursor in the cell at (row, column). */
const focusCell = async (api: KoenigEditorAPI, row: number, column: number) => {
  await act(async () => {
    api.editorInstance.update(() => {
      const table = $getRoot().getChildren().find($isTableNode) as TableNode;
      const cell = (table.getChildAtIndex(row) as ElementNode | null)?.getChildAtIndex(column);
      (cell as ElementNode | undefined)?.selectStart();
    });
  });
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
  });
};

/** The (row, column) the cursor is in. */
const cursorCell = (api: KoenigEditorAPI) =>
  api.editorInstance.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return null;
    const cell = selection.anchor.getNode().getParents().find($isTableCellNode);
    const row = cell?.getParent();
    if (!cell || !row) return null;
    return [row.getIndexWithinParent(), cell.getIndexWithinParent()];
  });

const action = (name: string) =>
  document.querySelector(`[data-kg-table-action="${name}"]`) as HTMLElement;

const press = async (name: string) => {
  await act(async () => {
    fireEvent.click(action(name));
  });
};

describe("table card", () => {
  it("inserts a 3 by 3 table with a header row", async () => {
    const { api } = await mount();
    await insertTable(api);
    expect(shape(api).map((row) => row.length)).toEqual([3, 3, 3]);
    expect(shape(api)[0]!.every((state) => state !== 0)).toBe(true);
    expect(shape(api)[1]!.every((state) => state === 0)).toBe(true);
  });

  it("shows an accessible toolbar only while the cursor is in the table", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    const bar = await screen.findByRole("toolbar", { name: /table/i });
    expect(bar).toBeTruthy();
    for (const name of [
      "add-row-above",
      "add-row-below",
      "add-column-left",
      "add-column-right",
      "delete-row",
      "delete-column",
      "toggle-header-row",
      "delete-table",
    ]) {
      expect(action(name), name).toBeTruthy();
      expect(action(name).getAttribute("aria-label"), name).toBeTruthy();
      expect(action(name).getAttribute("type")).toBe("button");
    }
    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().selectEnd();
      });
    });
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
    });
    await waitFor(() => expect(screen.queryByRole("toolbar", { name: /table/i })).toBeNull());
  });

  it("adds a row below and above the cursor's row", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 0);
    await press("add-row-below");
    expect(shape(api).length).toBe(4);
    await press("add-row-above");
    expect(shape(api).length).toBe(5);
    expect(shape(api)[0]!.every((state) => state !== 0)).toBe(true);
  });

  it("adds a column to the right and the left of the cursor's column", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    await press("add-column-right");
    expect(shape(api).map((row) => row.length)).toEqual([4, 4, 4]);
    await press("add-column-left");
    expect(shape(api).map((row) => row.length)).toEqual([5, 5, 5]);
  });

  it("removes the cursor's row and column", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 2, 2);
    await press("delete-row");
    expect(shape(api).length).toBe(2);
    await focusCell(api, 1, 1);
    await press("delete-column");
    expect(shape(api).map((row) => row.length)).toEqual([2, 2]);
  });

  it("turns the header row off and on", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    await press("toggle-header-row");
    expect(shape(api)[0]!.every((state) => state === 0)).toBe(true);
    await press("toggle-header-row");
    expect(shape(api)[0]!.every((state) => state !== 0)).toBe(true);
    expect(shape(api)[1]!.every((state) => state === 0)).toBe(true);
  });

  it("deletes the table and leaves a paragraph to type in", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    await press("delete-table");
    const types = api.editorInstance.getEditorState().read(() =>
      $getRoot()
        .getChildren()
        .map((child) => child.getType()),
    );
    expect(types).not.toContain("table");
    expect(types.length).toBeGreaterThan(0);
  });

  it("moves between cells with Tab and Shift+Tab", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 0, 0);
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_TAB_COMMAND,
        new KeyboardEvent("keydown", { cancelable: true, key: "Tab" }),
      );
    });
    expect(cursorCell(api)).toEqual([0, 1]);
    await act(async () => {
      api.editorInstance.dispatchCommand(
        KEY_TAB_COMMAND,
        new KeyboardEvent("keydown", { cancelable: true, key: "Tab", shiftKey: true }),
      );
    });
    expect(cursorCell(api)).toEqual([0, 0]);
  });

  it("marks header cells with a scope and body cells without one", async () => {
    const { api } = await mount();
    await insertTable(api);
    await waitFor(() => expect(document.querySelectorAll("th").length).toBe(3));
    for (const th of document.querySelectorAll("th")) {
      expect(th.getAttribute("scope")).toBe("col");
    }
    expect(document.querySelectorAll("td").length).toBe(6);
    expect(document.querySelectorAll("td[scope]").length).toBe(0);
  });

  it("keeps the scope when the header row is toggled off", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    await press("toggle-header-row");
    await waitFor(() => expect(document.querySelectorAll("th").length).toBe(0));
    expect(document.querySelectorAll("[scope]").length).toBe(0);
  });

  it("offers no merge or colour controls: tables stay simple", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    expect(document.querySelector("[data-kg-table-action*='merge']")).toBeNull();
    expect(document.querySelector("[data-kg-table-action*='color']")).toBeNull();
  });

  it("round-trips through the document model, header row and added rows included", async () => {
    const { api } = await mount();
    await insertTable(api);
    await focusCell(api, 1, 1);
    await press("add-row-below");
    await press("add-column-right");
    const before = shape(api);
    const saved = JSON.stringify(api.editorInstance.getEditorState().toJSON());
    cleanup();
    const { api: reopened } = await mount({ composer: { initialEditorState: saved } });
    expect(shape(reopened)).toEqual(before);
    await waitFor(() => expect(document.querySelectorAll("th[scope='col']").length).toBe(4));
    void $getNodeByKey;
  });
});
