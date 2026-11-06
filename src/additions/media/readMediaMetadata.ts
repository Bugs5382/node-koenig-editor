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

export interface MediaMetadata {
  duration?: number;
  height?: number;
  width?: number;
}

/**
 * Reads duration (and size, for video) from the chosen file in the browser, from a local
 * object url: nothing leaves the page. Resolves to `{}` where the browser cannot tell
 * (no object urls, an unreadable file, or no answer within a few seconds).
 */
export const readMediaMetadata = (file: Blob, kind: "audio" | "video"): Promise<MediaMetadata> =>
  new Promise((resolve) => {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      resolve({});
      return;
    }
    let url = "";
    try {
      url = URL.createObjectURL(file);
    } catch {
      resolve({});
      return;
    }
    const element = document.createElement(kind);
    let done = false;
    const finish = (result: MediaMetadata) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      element.removeAttribute("src");
      URL.revokeObjectURL?.(url);
      resolve(result);
    };
    const timer = setTimeout(() => finish({}), 4000);
    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? Math.round(element.duration) : undefined;
      if (kind === "video") {
        const video = element as HTMLVideoElement;
        finish({
          duration,
          height: video.videoHeight || undefined,
          width: video.videoWidth || undefined,
        });
      } else {
        finish({ duration });
      }
    };
    element.onerror = () => finish({});
    element.src = url;
  });
