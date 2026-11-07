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
import {
  type KeyboardEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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
  viewerPause?: string;
  viewerPlay?: string;
  viewerCloseHint: string;
  viewerLabel: string;
  viewerNext: string;
  viewerPrevious: string;
  viewerThumbnail: string;
  viewerThumbnails: string;
}

/** Seconds without input before screen mode hides the controls. */
export const CONTROLS_HIDE_AFTER = 3000;

interface GalleryViewerProps {
  /** Next, Previous and the auto-advance follow a random pass: every photo once, then a new pass. */
  shuffle?: boolean;
  /** Seconds between photos; 0 or none is off. The last photo goes back to the first. */
  autoplaySeconds?: number;
  /** The thumbnail strip is not shown and the controls hide themselves when nothing is touched. */
  screenMode?: boolean;
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

// One quiet look for every control in the viewer: a soft translucent fill, no visible border at
// rest or after a click, a fade and a one-pixel lift on hover, and one translucent ring that shows
// only for the keyboard (a transparent outline stands in for it in high-contrast mode, where shadows
// are dropped). Under reduced motion nothing moves.
const CONTROL =
  "peer relative flex cursor-pointer items-center justify-center rounded-full border border-transparent bg-white/10 text-white outline-0 backdrop-blur-sm transition duration-150 ease-out hover:-translate-y-px hover:bg-white/20 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default disabled:opacity-30 disabled:hover:translate-y-0 disabled:hover:bg-white/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

// The editor's own tooltip: small, dark, rounded, with the key that does the same thing. It sits
// after its control as a sibling and shows on hover or keyboard focus, not after a click.
const Tip = ({
  className,
  hint,
  id,
  label,
}: {
  className: string;
  hint: string;
  id: string;
  label: string;
}) => (
  <span
    className={`pointer-events-none absolute z-20 hidden items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2 py-1 text-xs font-medium text-white shadow-lg peer-hover:flex peer-focus-visible:flex ${className}`}
    id={id}
    role="tooltip"
  >
    {label}
    <kbd className="rounded bg-white/15 px-1.5 font-sans text-[0.7rem] leading-4">{hint}</kbd>
  </span>
);

// The gallery full screen: one photo at a time on a dark page, a strip of thumbnails under it. It
// mounts under the editor's own root, outside the card, and takes every key typed in it, so the
// card behind never sees them. Fixed, with no motion beyond a fade that reduced-motion turns off.
export const GalleryViewer = ({
  autoplaySeconds = 0,
  screenMode = false,
  index,
  isCollapsed,
  onClose,
  onIndexChange,
  opener,
  photos,
  strings,
  toggleText,
  unescape,
  shuffle = false,
}: GalleryViewerProps) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const currentThumb = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const textId = useId();
  const closeTipId = useId();
  const prevTipId = useId();
  const nextTipId = useId();
  const target = opener?.closest(".koenig-lexical") ?? document.body;
  const photo = photos[index];
  const last = photos.length - 1;
  const autoplay = autoplaySeconds > 0 && photos.length > 1;
  const [playing, setPlaying] = useState(true);
  const [hidden, setHidden] = useState(false);
  // The random pass: every photo once in a shuffled order, and where in it the viewer is. Next and
  // Previous (and the timer) walk it; a new pass starts when the last one is used up.
  const pass = useRef<{ cursor: number; order: number[] } | null>(null);
  const moveRef = useRef<(direction: number) => void>(() => undefined);
  const onIndexRef = useRef(onIndexChange);
  onIndexRef.current = onIndexChange;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Screen mode: the controls go after a few seconds without input and come back on any input
  const reveal = useCallback(() => {
    setHidden(false);
    clearTimeout(hideTimer.current);
    if (screenMode) hideTimer.current = setTimeout(() => setHidden(true), CONTROLS_HIDE_AFTER);
  }, [screenMode]);
  useEffect(() => {
    reveal();
    return () => clearTimeout(hideTimer.current);
  }, [reveal]);

  // Auto-advance: the next photo after the set seconds, starting over after the last. A move by
  // hand starts the wait again.
  useEffect(() => {
    if (!autoplay || !playing) return undefined;
    const timer = setTimeout(() => moveRef.current(1), autoplaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [autoplay, autoplaySeconds, index, photos.length, playing]);

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

  // Past the last photo is the first, and before the first is the last, by hand and by the timer
  const go = (next: number) => onIndexChange(next > last ? 0 : next < 0 ? last : next);

  // A pass through all the photos in a random order; `first` leads it (a new pass never starts
  // with `avoid`, the photo that is on screen).
  const makePass = (first: number | null, avoid: number | null) => {
    const all = photos.map((_, position) => position);
    const rest = all.filter((position) => position !== first);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j] as number, rest[i] as number];
    }
    if (first === null && rest.length > 1 && rest[0] === avoid) {
      [rest[0], rest[1]] = [rest[1] as number, rest[0] as number];
    }
    return { cursor: 0, order: first === null ? rest : [first, ...rest] };
  };
  const current = () => {
    const now = pass.current;
    if (!now || now.order.length !== photos.length || now.order[now.cursor] !== index) {
      pass.current = makePass(index, null);
    }
    return pass.current as { cursor: number; order: number[] };
  };

  // Next (1) and Previous (-1): in the set order, or along the random pass when it is on
  const move = (direction: number) => {
    if (!shuffle || photos.length < 2) {
      go(index + direction);
      return;
    }
    const now = current();
    if (direction > 0 && now.cursor >= now.order.length - 1) {
      pass.current = makePass(null, index);
    } else {
      now.cursor =
        direction > 0 ? now.cursor + 1 : now.cursor > 0 ? now.cursor - 1 : now.order.length - 1;
    }
    onIndexChange(
      (pass.current as { order: number[]; cursor: number }).order[
        (pass.current as { cursor: number }).cursor
      ] as number,
    );
  };
  moveRef.current = move;
  // A thumbnail, Home or End: straight there. In a random pass the photo counts as shown, so it is
  // not shown again before the pass ends.
  const jump = (position: number) => {
    if (shuffle && photos.length > 1) {
      const now = current();
      const at = now.order.indexOf(position);
      if (at > now.cursor) {
        now.order.splice(at, 1);
        now.order.splice(now.cursor + 1, 0, position);
        now.cursor += 1;
      } else if (at >= 0) {
        now.cursor = at;
      }
    }
    onIndexChange(position);
  };
  const close = () => {
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    // Nothing typed here is for the document behind it.
    event.stopPropagation();
    // In screen mode a key first brings the controls back; Escape then needs a second press to exit
    const wasHidden = screenMode && hidden;
    reveal();
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        if (!wasHidden) close();
        return;
      case " ":
        if (autoplay && (event.target as HTMLElement).tagName !== "BUTTON") {
          event.preventDefault();
          setPlaying((value) => !value);
        }
        return;
      case "ArrowLeft":
        event.preventDefault();
        move(-1);
        return;
      case "ArrowRight":
        event.preventDefault();
        move(1);
        return;
      case "Home":
        event.preventDefault();
        jump(0);
        return;
      case "End":
        event.preventDefault();
        jump(last);
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
    move(dx < 0 ? 1 : -1);
  };

  const hasText = Boolean(photo.title || photo.caption);
  const collapsed = hasText && isCollapsed(photo);

  return (
    <TopLayerDialog
      aria-label={strings.viewerLabel}
      aria-modal="true"
      className={`fixed inset-0 z-[2147483647] m-0 flex size-full max-h-none max-w-none flex-col overflow-hidden border-0 bg-black p-0 font-sans text-white transition-opacity motion-reduce:transition-none ${screenMode && hidden ? "cursor-none" : ""}`}
      data-gallery-viewer-controls={screenMode && hidden ? "hidden" : "shown"}
      data-gallery-viewer-screen-mode={screenMode ? "true" : undefined}
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
      onMouseMove={screenMode ? reveal : undefined}
      onPointerDown={screenMode ? reveal : undefined}
      onRequestClose={close}
      returnFocusTo={opener}
    >
      <div
        className={`flex items-center justify-between gap-4 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] transition-opacity duration-300 motion-reduce:transition-none ${screenMode && hidden ? "invisible opacity-0" : ""}`}
        data-gallery-viewer-backdrop
        data-gallery-viewer-bar
      >
        <span aria-live="polite" className="text-sm tabular-nums" data-gallery-viewer-count>
          {fill(strings.countOf, { max: photos.length, n: index + 1 })}
        </span>
        <span className="flex items-center gap-2">
          {autoplay ? (
            <button
              aria-label={
                playing ? (strings.viewerPause ?? "Pause") : (strings.viewerPlay ?? "Play")
              }
              aria-pressed={playing}
              className={`${CONTROL} h-11 px-4 text-sm font-medium`}
              data-gallery-viewer-play
              type="button"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? (strings.viewerPause ?? "Pause") : (strings.viewerPlay ?? "Play")}
            </button>
          ) : null}
          <span className="relative">
            <button
              ref={closeRef}
              aria-describedby={closeTipId}
              aria-label={strings.viewerClose}
              className={`${CONTROL} h-11 min-w-11 gap-2 px-3 text-sm font-medium sm:px-4`}
              data-gallery-viewer-close
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
            {/* from the small breakpoint up the button shows "Exit full screen" itself, so a tooltip
                repeating it would be a second exit notice; below it the button is an icon only */}
            <Tip
              className="right-0 top-full mt-2 sm:peer-hover:hidden sm:peer-focus-visible:hidden"
              hint={strings.viewerCloseHint}
              id={closeTipId}
              label={strings.viewerClose}
            />
          </span>
        </span>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        data-gallery-viewer-backdrop
      >
        <div
          className={`absolute left-2 z-10 transition-opacity duration-300 motion-reduce:transition-none ${screenMode && hidden ? "invisible opacity-0" : ""}`}
        >
          <button
            aria-describedby={prevTipId}
            aria-label={strings.viewerPrevious}
            className={`${CONTROL} size-11`}
            data-gallery-viewer-prev
            disabled={photos.length < 2}
            type="button"
            onClick={() => move(-1)}
          >
            <Chevron left />
          </button>
          <Tip
            className="left-0 top-full mt-2"
            hint={"\u2190"}
            id={prevTipId}
            label={strings.viewerPrevious}
          />
        </div>
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
        <div
          className={`absolute right-2 z-10 transition-opacity duration-300 motion-reduce:transition-none ${screenMode && hidden ? "invisible opacity-0" : ""}`}
        >
          <button
            aria-describedby={nextTipId}
            aria-label={strings.viewerNext}
            className={`${CONTROL} size-11`}
            data-gallery-viewer-next
            disabled={photos.length < 2}
            type="button"
            onClick={() => move(1)}
          >
            <Chevron />
          </button>
          <Tip
            className="right-0 top-full mt-2"
            hint={"\u2192"}
            id={nextTipId}
            label={strings.viewerNext}
          />
        </div>

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
              className={`${CONTROL} pointer-events-auto absolute bottom-2 right-3 size-9`}
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

      {screenMode ? null : (
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
                className={`h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded border-2 bg-transparent p-0 outline-0 transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-white/40 motion-reduce:transition-none ${
                  position === index
                    ? "border-white/80 opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
                data-gallery-viewer-thumb
                type="button"
                onClick={() => jump(position)}
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
      )}
    </TopLayerDialog>
  );
};

export default GalleryViewer;
