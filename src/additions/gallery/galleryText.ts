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
import { useCallback, useState } from "react";

// Whether each photo's title and caption is shown or collapsed, remembered in the viewer's own
// browser. Collapsing is visual only: the text stays in the page for screen readers.
//
// One flag per photo, keyed by the photo itself, not by the gallery or its order: moving a photo
// or adding one must not lose what the viewer chose.
const STORAGE_KEY = "koenig-gallery-photo-text";

/** A short stable key for a string; photo sources can be very long (data: URLs). */
export const shortHash = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
};

interface PhotoLike {
  fileName?: string;
  src?: string;
}

export const photoKey = (photo: PhotoLike): string =>
  shortHash(`${photo.fileName ?? ""}|${photo.src ?? ""}`);

/** true is collapsed. */
type Flags = Record<string, boolean>;

const read = (): Flags => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const write = (flags: Flags) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Private windows and blocked storage: the choice just lasts until the page closes.
  }
};

/**
 * Shown or collapsed, per photo and for the whole gallery. The gallery-wide control writes every
 * photo's own flag, so a photo added later starts shown and a photo's flag stays with the photo.
 */
export const useGalleryText = (_photos: PhotoLike[], withText: PhotoLike[]) => {
  const [flags, setFlags] = useState<Flags>(read);

  const isCollapsed = useCallback((photo: PhotoLike) => flags[photoKey(photo)] === true, [flags]);

  const commit = (next: Flags) => {
    setFlags(next);
    // merge into what is stored, so another gallery's flags are kept
    write({ ...read(), ...next });
  };

  const toggleImage = (photo: PhotoLike) =>
    commit({ ...flags, [photoKey(photo)]: !isCollapsed(photo) });

  const allCollapsed = withText.length > 0 && withText.every(isCollapsed);
  const toggleAll = () => {
    const next = { ...flags };
    for (const photo of withText) next[photoKey(photo)] = !allCollapsed;
    commit(next);
  };

  return { allCollapsed, isCollapsed, toggleAll, toggleImage };
};
