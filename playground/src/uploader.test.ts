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
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SAMPLES } from "./seed";
import { fileUploader, setSampleUploads } from "./uploader";

const picture = (name: string) => new File(["x"], name, { type: "image/png" });

beforeEach(() => {
  URL.createObjectURL = () => "blob:fake";
  setSampleUploads(false);
});

const upload = async (type: string, files: File[]) => {
  const { result } = renderHook(() => fileUploader.useFileUpload(type));
  const out = await act(async () => result.current.upload(files));
  return { errors: result.current.errors, out };
};

describe("fake uploader", () => {
  it("turns a picked file into an object url", async () => {
    const { out } = await upload("image", [picture("mine.png")]);
    expect(out).toEqual([{ fileName: "mine.png", url: "blob:fake" }]);
  });

  it("refuses a file of the wrong type", async () => {
    const { out, errors } = await upload("image", [
      new File(["x"], "a.txt", { type: "text/plain" }),
    ]);
    expect(out).toBeNull();
    expect(errors[0]?.message).toContain("a.txt");
  });

  it("answers an image upload with the sample pictures, one per file, in turn", async () => {
    setSampleUploads(true);
    const first = await upload("image", [picture("a.png"), picture("b.png")]);
    expect(first.out?.map((f) => f.url)).toEqual([SAMPLES[0]!.url, SAMPLES[1]!.url]);
    const next = await upload("image", [picture("c.png")]);
    expect(next.out?.map((f) => f.url)).toEqual([SAMPLES[2]!.url]);
  });

  it("starts over after the tenth, and leaves other kinds of upload alone", async () => {
    setSampleUploads(true);
    const many = await upload(
      "image",
      Array.from({ length: 11 }, (_, i) => picture(`${i}.png`)),
    );
    expect(many.out?.[10]?.url).toBe(SAMPLES[0]!.url);
    const file = await upload("file", [new File(["x"], "doc.pdf")]);
    expect(file.out).toEqual([{ fileName: "doc.pdf", url: "blob:fake" }]);
  });
});
