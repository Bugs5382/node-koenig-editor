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
import { useCallback, useMemo, useState } from "react";

// Whether each photo's title and caption is shown or collapsed, remembered in the viewer's own
// browser. Collapsing is visual only: the text stays in the page for screen readers.
const STORAGE_KEY = "koenig-gallery-text";

export interface GalleryTextState {
  /** The gallery-wide choice: every photo collapsed or expanded; null when none was made. */
  all: "collapsed" | "expanded" | null;
  /** A photo's own choice, which wins over the gallery-wide one. true is collapsed. */
  images: Record<string, boolean>;
}

const EMPTY: GalleryTextState = { all: null, images: {} };

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
export const galleryKey = (photos: PhotoLike[]): string =>
  shortHash(photos.map(photoKey).join(","));

const readAll = (): Record<string, GalleryTextState> => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeOne = (key: string, state: GalleryTextState) => {
  try {
    const all = readAll();
    all[key] = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Private windows and blocked storage: the choice just lasts until the page closes.
  }
};

const load = (key: string): GalleryTextState => {
  const stored = readAll()[key];
  if (!stored) return EMPTY;
  return {
    all: stored.all === "collapsed" || stored.all === "expanded" ? stored.all : null,
    images: stored.images && typeof stored.images === "object" ? stored.images : {},
  };
};

/**
 * Shown or collapsed, per photo and for the whole gallery. Precedence: a photo's own choice wins;
 * otherwise the gallery-wide choice applies. The gallery-wide control sets every photo and clears
 * the individual choices, so it always means what it says.
 */
export const useGalleryText = (photos: PhotoLike[], withText: PhotoLike[]) => {
  const key = useMemo(() => galleryKey(photos), [photos]);
  const [state, setState] = useState<GalleryTextState>(() => load(key));
  const [loadedFor, setLoadedFor] = useState(key);
  if (loadedFor !== key) {
    setLoadedFor(key);
    setState(load(key));
  }

  const isCollapsed = useCallback(
    (photo: PhotoLike) => {
      const own = state.images[photoKey(photo)];
      return own !== undefined ? own : state.all === "collapsed";
    },
    [state],
  );

  const commit = (next: GalleryTextState) => {
    setState(next);
    writeOne(key, next);
  };

  const toggleImage = (photo: PhotoLike) =>
    commit({ ...state, images: { ...state.images, [photoKey(photo)]: !isCollapsed(photo) } });

  const allCollapsed = withText.length > 0 && withText.every(isCollapsed);
  const toggleAll = () => commit({ all: allCollapsed ? "expanded" : "collapsed", images: {} });

  return { allCollapsed, isCollapsed, toggleAll, toggleImage };
};
