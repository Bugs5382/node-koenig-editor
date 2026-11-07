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
import { safeMediaUrl } from "./safeMediaUrl";

export interface MediaTextData {
  trackLabel?: string;
  trackLang?: string;
  trackSrc?: string;
  transcript?: string;
}

const LANGUAGE_TAG = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;

/** True when the card has the accessible text it is meant to have: a track or a transcript. */
export const hasCaptions = (data: MediaTextData): boolean =>
  Boolean(safeMediaUrl(data.trackSrc) || data.transcript?.trim());

/**
 * The `<track kind="captions">` for a card, or null without a safe track url. Built with
 * DOM calls, never an HTML string, so no value can break out of its attribute.
 */
export const buildTrack = (document: Document, data: MediaTextData): HTMLTrackElement | null => {
  const src = safeMediaUrl(data.trackSrc);
  if (!src) return null;
  const lang = LANGUAGE_TAG.test(data.trackLang ?? "") ? (data.trackLang as string) : "en";
  const track = document.createElement("track");
  track.setAttribute("kind", "captions");
  track.setAttribute("src", src);
  track.setAttribute("srclang", lang);
  track.setAttribute("label", data.trackLabel?.trim() || lang);
  return track;
};

/** The transcript as plain text in a block of its own, or null when there is none. */
export const buildTranscript = (document: Document, data: MediaTextData): HTMLElement | null => {
  const text = data.transcript?.trim();
  if (!text) return null;
  const block = document.createElement("div");
  block.setAttribute("class", "kg-media-transcript");
  block.textContent = text;
  return block;
};
