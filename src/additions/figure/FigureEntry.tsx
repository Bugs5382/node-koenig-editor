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
import { useEffect, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import type { Figure } from "./figure";

// The form for the optional figure entry, shared by tables, images and galleries: a label, a title,
// above or below, and whether the label is numbered automatically. Enter or Done saves, Escape
// closes, and Remove takes the entry away.

interface FigureEntryProps {
  figure: Figure | null;
  /** The label to start from when the node has no entry yet ("Table", "Figure"). */
  initialLabel?: string;
  /** Initial position when the node has no entry yet. */
  initialAbove?: boolean;
  onClose: () => void;
  onCommit: (figure: Figure | null) => void;
}

export const FigureEntry = ({
  figure,
  initialAbove = false,
  initialLabel = "",
  onClose,
  onCommit,
}: FigureEntryProps) => {
  const t = useKoenigStrings().figure;
  const [label, setLabel] = useState(figure?.label ?? initialLabel);
  const [title, setTitle] = useState(figure?.title ?? "");
  const [above, setAbove] = useState(figure?.above ?? initialAbove);
  const [numbered, setNumbered] = useState(figure?.numbered ?? true);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const save = () => {
    if (!label.trim() && !title.trim()) onCommit(null);
    else onCommit({ above, label: label.trim(), numbered, title: title.trim() });
  };
  const field = "w-full rounded-md border border-grey-300 bg-white px-2 py-1 dark:bg-grey-900";
  return (
    <div
      aria-label={t.button}
      className="not-kg-prose flex w-[28rem] max-w-[92vw] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
      data-kg-allow-clickthrough="true"
      data-kg-figure-entry
      role="dialog"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          save();
        }
      }}
    >
      <label className="flex flex-col gap-1">
        {t.label}
        <input
          ref={first}
          className={field}
          list="kg-figure-labels"
          placeholder={t.labelPlaceholder}
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <datalist id="kg-figure-labels">
          <option value="Table" />
          <option value="Figure" />
          <option value="Chart" />
          <option value="Photo" />
        </datalist>
      </label>
      <label className="flex flex-col gap-1">
        {t.title}
        <input
          className={field}
          placeholder={t.titlePlaceholder}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        {t.position}
        <select
          className={field}
          value={above ? "above" : "below"}
          onChange={(event) => setAbove(event.target.value === "above")}
        >
          <option value="above">{t.above}</option>
          <option value="below">{t.below}</option>
        </select>
      </label>
      <label className="flex items-center gap-2">
        <input
          checked={numbered}
          type="checkbox"
          onChange={(event) => setNumbered(event.target.checked)}
        />
        {t.numbered}
      </label>
      <div className="flex justify-end gap-2">
        {figure ? (
          <button
            className="cursor-pointer rounded-md px-2 py-1 hover:bg-grey-200/80 dark:hover:bg-grey-900"
            data-kg-figure-remove
            type="button"
            onClick={() => onCommit(null)}
          >
            {t.remove}
          </button>
        ) : null}
        <button
          className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-grey-200/80 dark:hover:bg-grey-900"
          data-kg-figure-done
          type="button"
          onClick={save}
        >
          {t.done}
        </button>
      </div>
    </div>
  );
};

export default FigureEntry;
