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

import { mount, openSlashMenu } from "./__utils__/mount";

afterEach(() => cleanup());

const refusing = {
  useFileUpload: () => ({
    errors: [{ message: "Too big" }],
    isLoading: false,
    progress: 0,
    upload: async () => null,
  }),
};

describe("an upload refusal can be styled and found by the host (#98)", () => {
  it("marks each refusal with a stable attribute and the alert role", async () => {
    const { api } = await mount({ composer: { fileUploader: refusing } });
    await openSlashMenu(api);
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card-menu-item='Image']") as Element);
    });
    await waitFor(() => expect(document.querySelector("[data-kg-upload-error]")).not.toBeNull());
    const error = document.querySelector("[data-kg-upload-error]") as HTMLElement;
    expect(error.textContent).toBe("Too big");
    expect(error.getAttribute("role")).toBe("alert");
  });
});
