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
const cards: Record<string, Record<string, unknown>> = {
  audio: {
    fileName: "a.mp3",
    mimeType: "audio/mpeg",
    src: "/content/media/a.mp3",
    title: "Episode",
    trackLabel: "English",
    trackLang: "en",
    trackSrc: "/content/media/a.vtt",
    transcript: "Words",
    type: "audio",
    version: 1,
  },
  file: {
    fileCaption: "Notes",
    fileName: "a.pdf",
    fileSize: 2048,
    fileTitle: "Paper",
    src: "/content/files/a.pdf",
    type: "file",
    version: 1,
  },
  video: {
    caption: "A talk",
    cardWidth: "regular",
    fileName: "a.mp4",
    height: 360,
    mimeType: "video/mp4",
    src: "/content/media/a.mp4",
    trackLabel: "English",
    trackLang: "en",
    trackSrc: "/content/media/a.vtt",
    transcript: "Hello",
    type: "video",
    version: 1,
    width: 640,
  },
};

/** An editor state holding one media card, with any of its fields replaced. */
export const mediaDocument = (type: string, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    root: {
      children: [{ ...cards[type], ...overrides }],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
