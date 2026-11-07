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
import { type CSSProperties, type ReactNode } from "react";

import { useKoenigStrings } from "../options";
import { type PreviewWidth, useKoenigPreview } from "./PreviewContext";

const WIDTHS: Record<PreviewWidth, string> = { desktop: "100%", phone: "390px", tablet: "768px" };

/**
 * The reader preview's stage and frame. They are always in the page, and inert (`display:
 * contents`, no box) until preview is on: swapping a wrapper in and out would remount the editor
 * and lose the cursor and scroll. In preview the frame is the width of the chosen device, light or
 * dark, with the text size set through `--kg-rem`.
 */
export const KoenigPreviewFrame = ({ children }: { children: ReactNode }) => {
  const { options, preview } = useKoenigPreview();
  const strings = useKoenigStrings();
  const dark = options.theme === "dark";

  if (!preview) {
    return (
      <div data-kg-preview-stage style={{ display: "contents" }}>
        <div data-kg-preview-frame style={{ display: "contents" }}>
          {children}
        </div>
      </div>
    );
  }

  // A desktop preview is the document as it is on the page: no backdrop, no box. A tablet or phone
  // preview is narrower than the page, so its edge gets a hairline (not a grey panel around it).
  const device = options.width !== "desktop";
  const stage: CSSProperties = { display: "block", overflowX: "auto" };
  const frame = {
    "--kg-rem": `${options.textSize * 0.625}px`,
    background: dark ? "#15171a" : "#ffffff",
    border: device ? `1px solid ${dark ? "#2c2f33" : "#dde1e5"}` : "none",
    borderRadius: device ? 6 : 0,
    boxSizing: "border-box",
    colorScheme: dark ? "dark" : "light",
    display: "block",
    margin: "0 auto",
    maxWidth: "100%",
    width: WIDTHS[options.width],
  } as CSSProperties;

  return (
    <div aria-label={strings.preview.region} data-kg-preview-stage role="region" style={stage}>
      <div className={dark ? "dark" : undefined} data-kg-preview-frame style={frame}>
        {children}
      </div>
    </div>
  );
};

export default KoenigPreviewFrame;
