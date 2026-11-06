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
import { type KeyboardEvent, type TouchEvent, useEffect, useId, useRef } from "react";

import { TopLayerDialog } from "./TopLayerDialog";
import { photoKey } from "./galleryText";

export interface ViewerPhoto {
  alt?: string;
  caption?: string;
  fileName?: string;
  previewSrc?: string;
  src?: string;
  title?: string;
}

export interface ViewerStrings {
  countOf: string;
  hideImageText: string;
  showImageText: string;
  viewerClose: string;
  viewerLabel: string;
  viewerNext: string;
  viewerPrevious: string;
  viewerThumbnail: string;
  viewerThumbnails: string;
}

interface GalleryViewerProps {
  index: number;
  isCollapsed: (photo: ViewerPhoto) => boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** The control that opened it; focus goes back to it on close. */
  opener: HTMLElement | null;
  photos: readonly ViewerPhoto[];
  strings: ViewerStrings;
  toggleText: (photo: ViewerPhoto) => void;
  unescape: (value: string) => string;
}

/**
 * Where to scroll a strip so that one of its thumbnails sits in the middle of it, never past
 * either end, and not at all when the strip already fits.
 */
export const centerOffset = ({
  scrollWidth,
  stripWidth,
  thumbLeft,
  thumbWidth,
}: {
  scrollWidth: number;
  stripWidth: number;
  thumbLeft: number;
  thumbWidth: number;
}): number => {
  const furthest = Math.max(scrollWidth - stripWidth, 0);
  return Math.min(Math.max(thumbLeft + thumbWidth / 2 - stripWidth / 2, 0), furthest);
};

const FOCUSABLE = "button, input, textarea, select, [href], [tabindex]:not([tabindex='-1'])";
const SWIPE_DISTANCE = 40;

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) =>
    values[name] === undefined ? match : String(values[name]),
  );

const Chevron = ({ left }: { left?: boolean }) => (
  <svg aria-hidden="true" className="size-6" fill="none" stroke="currentColor" viewBox="0 0 16 16">
    <path
      d={left ? "M10.5 3.5 6 8l4.5 4.5" : "M5.5 3.5 10 8l-4.5 4.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const button =
  "flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/15 text-white transition-opacity hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white motion-reduce:transition-none";

// The gallery full screen: one photo at a time on a dark page, a strip of thumbnails under it. It
// mounts under the editor's own root, outside the card, and takes every key typed in it, so the
// card behind never sees them. Fixed, with no motion beyond a fade that reduced-motion turns off.
export const GalleryViewer = ({
  index,
  isCollapsed,
  onClose,
  onIndexChange,
  opener,
  photos,
  strings,
  toggleText,
  unescape,
}: GalleryViewerProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentThumb = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const textId = useId();
  const target = opener?.closest(".koenig-lexical") ?? document.body;
  const photo = photos[index];
  const last = photos.length - 1;

  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Keep the current thumbnail in the middle of the strip as the photo changes. The strip is
  // scrolled itself, not the page, so nothing else on screen moves.
  useEffect(() => {
    const strip = stripRef.current;
    const thumb = currentThumb.current;
    if (!strip || !thumb) return;
    strip.scrollLeft = centerOffset({
      scrollWidth: strip.scrollWidth,
      stripWidth: strip.clientWidth,
      thumbLeft: thumb.offsetLeft,
      thumbWidth: thumb.offsetWidth,
    });
  }, [index]);

  if (!photo) return null;

  const go = (next: number) => onIndexChange(Math.min(Math.max(next, 0), last));
  const close = () => {
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Nothing typed here is for the document behind it.
    event.stopPropagation();
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "ArrowLeft":
        event.preventDefault();
        go(index - 1);
        return;
      case "ArrowRight":
        event.preventDefault();
        go(index + 1);
        return;
      case "Home":
        event.preventDefault();
        go(0);
        return;
      case "End":
        event.preventDefault();
        go(last);
        return;
      case "Tab": {
        const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = stops[0];
        const end = stops[stops.length - 1];
        if (!first || !end) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          end.focus();
        } else if (!event.shiftKey && document.activeElement === end) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      default:
    }
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // a mostly sideways drag of a real length
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  const hasText = Boolean(photo.title || photo.caption);
  const collapsed = hasText && isCollapsed(photo);

  return (
    <TopLayerDialog
      aria-label={strings.viewerLabel}
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] m-0 flex size-full max-h-none max-w-none flex-col overflow-hidden border-0 bg-black p-0 font-sans text-white transition-opacity motion-reduce:transition-none"
      data-gallery-viewer
      role="dialog"
      to={target}
      onClick={(event) => {
        event.stopPropagation();
        // a click on the dark page around the photo closes it; a click on the photo or a control does not
        if ((event.target as HTMLElement).hasAttribute("data-gallery-viewer-backdrop")) close();
      }}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
      onRequestClose={close}
      returnFocusTo={opener}
    >
      <div
        className="flex items-center justify-between gap-4 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]"
        data-gallery-viewer-backdrop
        data-gallery-viewer-bar
      >
        <span aria-live="polite" className="text-sm tabular-nums" data-gallery-viewer-count>
          {fill(strings.countOf, { max: photos.length, n: index + 1 })}
        </span>
        <button
          ref={closeRef}
          aria-label={strings.viewerClose}
          className="flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/70 bg-white/20 px-3 text-sm font-medium text-white transition-opacity hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:px-4"
          data-gallery-viewer-close
          title={strings.viewerClose}
          type="button"
          onClick={close}
        >
          <svg
            aria-hidden="true"
            className="size-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"
              strokeLinecap="round"
              strokeWidth="1.6"
            />
          </svg>
          <span className="hidden sm:inline" data-gallery-viewer-close-text>
            {strings.viewerClose}
          </span>
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        data-gallery-viewer-backdrop
      >
        <button
          aria-label={strings.viewerPrevious}
          className={`${button} absolute left-2 z-10 disabled:opacity-30`}
          disabled={index <= 0}
          type="button"
          onClick={() => go(index - 1)}
        >
          <Chevron left />
        </button>
        <div
          className="flex size-full items-center justify-center"
          data-gallery-viewer-backdrop
          data-gallery-viewer-stage
          onTouchEnd={onTouchEnd}
          onTouchStart={onTouchStart}
        >
          <img
            key={photoKey(photo)}
            alt={photo.alt ?? ""}
            className="max-h-full max-w-full object-contain transition-opacity motion-reduce:transition-none"
            data-gallery-viewer-image
            src={photo.src || photo.previewSrc}
          />
        </div>
        <button
          aria-label={strings.viewerNext}
          className={`${button} absolute right-2 z-10 disabled:opacity-30`}
          disabled={index >= last}
          type="button"
          onClick={() => go(index + 1)}
        >
          <Chevron />
        </button>

        {hasText ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center px-2 sm:px-16">
            <div
              className={
                collapsed
                  ? "sr-only"
                  : "pointer-events-auto max-w-3xl flex-1 bg-black/80 py-2 pl-4 pr-14 text-sm leading-snug"
              }
              data-gallery-viewer-text
              id={textId}
            >
              {photo.title ? (
                <strong className="block font-semibold">{unescape(photo.title)}</strong>
              ) : null}
              {photo.caption ? <span className="block">{unescape(photo.caption)}</span> : null}
            </div>
            <button
              aria-controls={textId}
              aria-expanded={!collapsed}
              aria-label={collapsed ? strings.showImageText : strings.hideImageText}
              className={`${button} pointer-events-auto absolute bottom-2 right-3 size-9 bg-black/80`}
              data-gallery-viewer-text-toggle
              type="button"
              onClick={() => toggleText(photo)}
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  d={collapsed ? "M3.5 10.5 8 6l4.5 4.5" : "M3.5 5.5 8 10l4.5-4.5"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={stripRef}
        aria-label={strings.viewerThumbnails}
        className="relative flex shrink-0 overflow-x-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3"
        data-gallery-viewer-thumbs
        role="group"
      >
        <div className="mx-auto flex gap-2">
          {photos.map((item, position) => (
            <button
              key={photoKey(item) + position}
              ref={position === index ? currentThumb : undefined}
              aria-current={position === index ? "true" : undefined}
              aria-label={fill(strings.viewerThumbnail, { n: position + 1 })}
              className={`h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded border-2 bg-transparent p-0 transition-opacity motion-reduce:transition-none ${
                position === index
                  ? "border-white opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
              data-gallery-viewer-thumb
              type="button"
              onClick={() => onIndexChange(position)}
            >
              <img
                alt=""
                className="size-full object-cover"
                decoding="async"
                loading="lazy"
                src={item.src || item.previewSrc}
              />
            </button>
          ))}
        </div>
      </div>
    </TopLayerDialog>
  );
};

export default GalleryViewer;
