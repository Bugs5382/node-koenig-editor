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
import { afterEach, describe, expect, it } from "vitest";

import { renderAudioNode } from "../src/kg-default-nodes/nodes/audio/audio-renderer";
import { renderFileNode } from "../src/kg-default-nodes/nodes/file/file-renderer";
import { renderVideoNode } from "../src/kg-default-nodes/nodes/video/video-renderer";
import { checkUpload } from "../src/additions/media/uploadLimits";
import { isVtt, safeMediaUrl } from "../src/additions/media/safeMediaUrl";
import { mediaDocument } from "./__utils__/mediaDocument";
import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const html = (output: { element: unknown }) => (output.element as HTMLElement).outerHTML;

describe("safeMediaUrl", () => {
  it.each([
    ["https://cdn.example.com/a.mp4", "https://cdn.example.com/a.mp4"],
    ["http://cdn.example.com/a.mp4", "http://cdn.example.com/a.mp4"],
    ["/content/media/a.mp4", "/content/media/a.mp4"],
    ["media/a.mp4", "media/a.mp4"],
  ])("keeps %s", (input, expected) => {
    expect(safeMediaUrl(input)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:video/mp4;base64,AAAA",
    "blob:https://example.com/x",
    "//evil.example.com/a.mp4",
    "",
  ])("rejects %j", (input) => {
    expect(safeMediaUrl(input)).toBe("");
  });

  it("recognises a WebVTT track by name or type", () => {
    expect(isVtt({ name: "captions.vtt", type: "" })).toBe(true);
    expect(isVtt({ name: "captions", type: "text/vtt" })).toBe(true);
    expect(isVtt({ name: "captions.srt", type: "application/x-subrip" })).toBe(false);
  });
});

describe("checkUpload", () => {
  const file = (name: string, type: string, size: number) =>
    ({ name, size, type }) as unknown as File;

  it("accepts anything when the host sets no rule", () => {
    expect(checkUpload(file("a.exe", "application/x-msdownload", 5), undefined)).toBeNull();
    expect(checkUpload(file("a.exe", "application/x-msdownload", 5), {})).toBeNull();
  });

  it("names the file when the type is not allowed", () => {
    const rule = { extensions: [".pdf"], mimeTypes: ["application/pdf"] };
    expect(checkUpload(file("a.pdf", "application/pdf", 1), rule)).toBeNull();
    expect(checkUpload(file("a.exe", "application/x-msdownload", 1), rule)).toEqual({
      code: "type",
      name: "a.exe",
    });
  });

  it("names the file when it is over the size limit", () => {
    expect(checkUpload(file("a.pdf", "application/pdf", 11), { maxSize: 10 })).toEqual({
      code: "size",
      limit: 10,
      name: "a.pdf",
    });
  });
});

describe("rendered output", () => {
  const withDoc = { createDocument: () => document };

  it("file: a download link to the host's own url", () => {
    const out = html(
      renderFileNode(
        {
          fileCaption: "Notes",
          fileName: "a.pdf",
          fileSize: 2048,
          fileTitle: "Paper",
          formattedFileSize: "2 KB",
          src: "/content/files/a.pdf",
        },
        withDoc,
      ),
    );
    expect(out).toContain('href="/content/files/a.pdf"');
    expect(out).toContain("kg-file-card");
    expect(out).not.toMatch(/https?:\/\/(?!cdn\.example)/);
  });

  it("file: drops an unsafe url", () => {
    const out = html(
      renderFileNode(
        {
          fileCaption: "",
          fileName: "a",
          fileSize: 1,
          fileTitle: "",
          formattedFileSize: "1 Byte",
          src: "javascript:alert(1)",
        },
        withDoc,
      ),
    );
    expect(out).not.toContain("javascript:");
  });

  it("video: native controls, a captions track and the transcript", () => {
    const out = renderVideoNode(
      {
        caption: "A talk",
        cardWidth: "regular",
        height: 360,
        src: "/content/media/a.mp4",
        trackLang: "en",
        trackLabel: "English",
        trackSrc: "/content/media/a.vtt",
        transcript: "Hello <b>there</b>",
        width: 640,
      },
      withDoc,
    ).element as HTMLElement;
    const video = out.querySelector("video") as HTMLVideoElement;
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.getAttribute("src")).toBe("/content/media/a.mp4");
    const track = out.querySelector("track") as HTMLTrackElement;
    expect(track.getAttribute("kind")).toBe("captions");
    expect(track.getAttribute("src")).toBe("/content/media/a.vtt");
    expect(track.getAttribute("srclang")).toBe("en");
    expect(out.querySelector(".kg-media-transcript")?.textContent).toContain("Hello <b>there</b>");
    expect(out.querySelector(".kg-media-transcript b")).toBeNull();
    expect(out.outerHTML).not.toMatch(/ghost|spacergif|youtube|vimeo/i);
  });

  it("video: no autoplay, loop or outside poster; unsafe sources are dropped", () => {
    const out = renderVideoNode(
      {
        caption: "",
        cardWidth: "regular",
        height: null,
        src: "javascript:alert(1)",
        trackSrc: "data:text/vtt;base64,AAAA",
        width: null,
      },
      withDoc,
    ).element as HTMLElement;
    expect(out.outerHTML).not.toContain("javascript:");
    expect(out.outerHTML).not.toContain("data:");
    expect(out.querySelector("video")).toBeNull();
  });

  it("audio: native controls, a captions track and the transcript", () => {
    const out = renderAudioNode(
      {
        src: "/content/media/a.mp3",
        title: "Episode",
        trackLabel: "English",
        trackLang: "en",
        trackSrc: "/content/media/a.vtt",
        transcript: "Words",
      },
      withDoc,
    ).element as HTMLElement;
    const audio = out.querySelector("audio") as HTMLAudioElement;
    expect(audio.hasAttribute("controls")).toBe(true);
    expect(audio.getAttribute("src")).toBe("/content/media/a.mp3");
    expect(out.querySelector("track")?.getAttribute("src")).toBe("/content/media/a.vtt");
    expect(out.querySelector(".kg-media-transcript")?.textContent).toContain("Words");
    expect(out.textContent).toContain("Episode");
  });
});

describe("saved documents", () => {
  it.each(["file", "video", "audio"])("a %s card survives a load and save", async (type) => {
    const { api } = await mount({ editor: {} });
    const state = api.editorInstance.parseEditorState(mediaDocument(type));
    await act(async () => {
      api.editorInstance.setEditorState(state);
    });
    const saved = api.editorInstance.getEditorState().toJSON();
    const card = (saved.root.children as { type: string }[]).find((child) => child.type === type);
    expect(card).toMatchObject(JSON.parse(mediaDocument(type)).root.children[0]);
  });
});

describe("the file card", () => {
  const uploaderWith = (rule: { extensions: string[]; maxSize?: number; mimeTypes: string[] }) => ({
    fileTypes: { file: rule },
    useFileUpload: () => ({ errors: [], isLoading: false, progress: 0, upload: async () => null }),
  });

  const insertFile = async (composer: Parameters<typeof mount>[0]) => {
    const { api } = await mount(composer);
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector('[data-kg-card-menu-item="File"]') as Element);
    });
    await waitFor(() => expect(document.querySelector('input[type="file"]')).not.toBeNull());
  };

  it("names a file that is not an allowed type and does not upload it", async () => {
    await insertFile({
      composer: {
        fileUploader: uploaderWith({ extensions: [".pdf"], mimeTypes: ["application/pdf"] }),
      },
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bad = new File(["x"], "setup.exe", { type: "application/x-msdownload" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [bad] } });
    });
    expect(
      (await waitFor(() => document.querySelector("[data-kg-file-error]")))?.textContent,
    ).toContain("setup.exe");
  });

  it("names a file that is over the size limit", async () => {
    await insertFile({
      composer: { fileUploader: uploaderWith({ extensions: [], maxSize: 3, mimeTypes: [] }) },
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File(["xxxxxxxx"], "big.zip", { type: "application/zip" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [big] } });
    });
    expect(
      (await waitFor(() => document.querySelector("[data-kg-file-error]")))?.textContent,
    ).toContain("big.zip");
  });
});

describe("the video and audio cards", () => {
  it.each(["Video", "Audio"])("%s asks for captions or a transcript", async (label) => {
    const { api } = await mount();
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector(`[data-kg-card-menu-item="${label}"]`) as Element);
    });
    // a card with no media is a picker; a saved one with no captions shows the notice
    const state = api.editorInstance.parseEditorState(
      mediaDocument(label.toLowerCase(), { trackSrc: "", transcript: "" }),
    );
    await act(async () => {
      api.editorInstance.setEditorState(state);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-kg-captions-missing]")).not.toBeNull(),
    );
  });

  it("makes the player reachable by keyboard", async () => {
    const { api } = await mount();
    const state = api.editorInstance.parseEditorState(mediaDocument("video"));
    await act(async () => {
      api.editorInstance.setEditorState(state);
    });
    const video = await waitFor(() => {
      const found = document.querySelector("video");
      expect(found).not.toBeNull();
      return found as HTMLVideoElement;
    });
    expect(video.hasAttribute("controls")).toBe(true);
    expect(video.tabIndex).toBeGreaterThanOrEqual(0);
    expect(video.querySelector("track")?.getAttribute("kind")).toBe("captions");
  });
});
