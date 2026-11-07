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

import { fileExtension, resolveFileIcons } from "../src/additions/fileIcons/fileIcons";
import { mount } from "./__utils__/mount";

afterEach(() => cleanup());

describe("file extensions", () => {
  it.each([
    ["Report.PDF", "pdf"],
    ["archive.tar.gz", "gz"],
    ["C:\\docs\\notes.txt", "txt"],
    ["/a/b/photo.JPeG", "jpeg"],
    ["README", ""],
    [".gitignore", ""],
    ["trailing.", ""],
    ["", ""],
  ])("reads %j as %j", (name, extension) => {
    expect(fileExtension(name)).toBe(extension);
  });

  it("resolves the host's option: on by default, off with false, overrides by bare lower-case type", () => {
    expect(resolveFileIcons(undefined).enabled).toBe(true);
    expect(resolveFileIcons(false).enabled).toBe(false);
    const Icon = () => null;
    expect(resolveFileIcons({ overrides: { ".PDF": Icon } }).overrides).toEqual({ pdf: Icon });
  });
});

const empty = {
  children: [],
  direction: null,
  format: "",
  indent: 0,
  type: "paragraph",
  version: 1,
};
const fileDoc = (fileName: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    root: {
      children: [
        empty,
        {
          fileCaption: "",
          fileName,
          fileSize: 2048,
          fileTitle: "A file",
          src: `/content/files/${fileName}`,
          type: "file",
          version: 1,
          ...extra,
        },
        empty,
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const icon = () => document.querySelector("[data-kg-file-icon]");

describe("the file card's icon", () => {
  it("shows the type's icon for a reader, and a generic one for a type it does not know", async () => {
    await mount({ composer: { editable: false, initialEditorState: fileDoc("report.pdf") } });
    expect(icon()?.getAttribute("data-kg-file-icon")).toBe("pdf");
    expect(icon()?.querySelector("svg")).not.toBeNull();
    cleanup();
    await mount({ composer: { editable: false, initialEditorState: fileDoc("data.zzzz") } });
    expect(icon()?.getAttribute("data-kg-file-icon")).toBe("zzzz");
    expect(icon()?.querySelector("svg")).not.toBeNull();
    cleanup();
    await mount({ composer: { editable: false, initialEditorState: fileDoc("README") } });
    expect(icon()?.getAttribute("data-kg-file-icon")).toBe("generic");
  });

  it("is not there when the host switches icons off", async () => {
    await mount({
      composer: { editable: false, fileIcons: false, initialEditorState: fileDoc("report.pdf") },
    });
    expect(icon()).toBeNull();
  });

  it("is not there when the card says no", async () => {
    await mount({
      composer: { editable: false, initialEditorState: fileDoc("report.pdf", { showIcon: false }) },
    });
    expect(icon()).toBeNull();
  });

  it("uses the host's own icon for a type, and the default for the rest", async () => {
    const Pdf = ({ extension }: { extension: string }) => <b data-mine={extension}>PDF</b>;
    await mount({
      composer: {
        editable: false,
        fileIcons: { overrides: { pdf: Pdf } },
        initialEditorState: fileDoc("report.pdf"),
      },
    });
    expect(icon()?.querySelector("[data-mine='pdf']")).not.toBeNull();
    cleanup();
    await mount({
      composer: {
        editable: false,
        fileIcons: { overrides: { pdf: Pdf } },
        initialEditorState: fileDoc("notes.txt"),
      },
    });
    expect(icon()?.querySelector("[data-mine]")).toBeNull();
    expect(icon()?.querySelector("svg")).not.toBeNull();
  });

  it("keeps the choice in the saved data", async () => {
    const { api } = await mount({ composer: { initialEditorState: fileDoc("report.pdf") } });
    const saved = JSON.parse(String(api.serialize())) as {
      root: { children: { showIcon?: boolean; type: string }[] };
    };
    expect(saved.root.children.find((child) => child.type === "file")?.showIcon).toBe(true);
  });
});
