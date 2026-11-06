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
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { FloatingPortal } from "../placement/FloatingPortal";

export interface ImageTextDialogStrings {
  imageAltLabel: string;
  imageCaptionLabel: string;
  imageTextCancel: string;
  imageTextDialogTitle: string;
  imageTextHelp: string;
  imageTextSave: string;
  imageTitleLabel: string;
}

interface ImageTextDialogProps {
  alt: string;
  caption: string;
  /** The icon that opened the dialog; focus goes back to it on close. */
  opener: HTMLElement | null;
  onClose: () => void;
  onSave: (text: { alt: string; caption: string; title: string }) => void;
  strings: ImageTextDialogStrings;
  title: string;
}

const FOCUSABLE = "input, textarea, button, [href], select, [tabindex]:not([tabindex='-1'])";

// A modal for one photo's title and caption. It mounts under the editor's own root, outside the
// card: the card is a wide, transformed box, which would carry a fixed dialog off to the side, and
// its events would reach the editor (Enter adding a paragraph, Backspace deleting the card).
export const ImageTextDialog = ({
  alt,
  caption,
  onClose,
  onSave,
  opener,
  strings,
  title,
}: ImageTextDialogProps) => {
  const headingId = useId();
  const helpId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [titleValue, setTitleValue] = useState(title);
  const [captionValue, setCaptionValue] = useState(caption);
  const [altValue, setAltValue] = useState(alt);
  const target = opener?.closest(".koenig-lexical") ?? document.body;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const close = () => {
    onClose();
    opener?.focus();
  };
  const save = () => {
    onSave({ alt: altValue.trim(), caption: captionValue.trim(), title: titleValue.trim() });
    onClose();
    opener?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Nothing typed here is for the document behind it.
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
      event.preventDefault();
      save();
      return;
    }
    if (event.key !== "Tab" || !boxRef.current) return;
    const stops = [...boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const field =
    "w-full rounded-md border border-grey-300 bg-white px-3 py-2 font-sans text-base text-grey-900 focus:border-selection focus:outline-none dark:border-grey-800 dark:bg-grey-950 dark:text-grey-200";

  return (
    <FloatingPortal to={target}>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
        data-gallery-text-backdrop
        onClick={(event) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) close();
        }}
        onKeyUp={(event) => event.stopPropagation()}
      >
        <div
          ref={boxRef}
          aria-describedby={helpId}
          aria-labelledby={headingId}
          aria-modal="true"
          className="flex w-[min(92vw,44rem)] flex-col gap-4 rounded-lg bg-white p-6 font-sans shadow-xl dark:bg-grey-950"
          role="dialog"
          onKeyDown={onKeyDown}
        >
          <h2 className="m-0 text-lg font-semibold text-grey-900 dark:text-grey-200" id={headingId}>
            {strings.imageTextDialogTitle}
          </h2>
          <p
            className="m-0 text-sm text-grey-700 dark:text-grey-500"
            data-gallery-text-help
            id={helpId}
          >
            {strings.imageTextHelp}
          </p>
          <label className="flex flex-col gap-1 text-sm font-medium text-grey-800 dark:text-grey-400">
            {strings.imageTitleLabel}
            <input
              ref={titleRef}
              className={field}
              data-gallery-text-title
              type="text"
              value={titleValue}
              onChange={(event) => setTitleValue(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-grey-800 dark:text-grey-400">
            {strings.imageCaptionLabel}
            <textarea
              className={`${field} min-h-[8rem] resize-y`}
              value={captionValue}
              onChange={(event) => setCaptionValue(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-grey-800 dark:text-grey-400">
            {strings.imageAltLabel}
            <input
              className={field}
              data-gallery-text-alt
              type="text"
              value={altValue}
              onChange={(event) => setAltValue(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              className="cursor-pointer rounded-md border border-grey-300 bg-transparent px-4 py-2 text-sm text-grey-900 dark:border-grey-800 dark:text-grey-200"
              type="button"
              onClick={close}
            >
              {strings.imageTextCancel}
            </button>
            <button
              className="cursor-pointer rounded-md border-0 bg-selection px-4 py-2 text-sm font-semibold text-white"
              data-gallery-text-save
              type="button"
              onClick={save}
            >
              {strings.imageTextSave}
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
};

export default ImageTextDialog;
