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
import { useId } from "react";

import { useKoenigStrings } from "../options";
import { type PreviewTextSize, useKoenigPreview } from "./PreviewContext";

const SIZES: PreviewTextSize[] = [12, 14, 16, 18, 20];

// One segmented radio group: the arrow keys move between the choices (they are native radios), the
// choice shows as a filled pill, and the keyboard focus shows as a soft ring.
const Segmented = <T extends string | number>({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}) => (
  <div className="flex items-center gap-2 font-sans text-sm text-grey-800 dark:text-grey-400">
    <span className="whitespace-nowrap">{label}</span>
    <div
      aria-label={label}
      className="flex overflow-hidden rounded-md border border-grey-300 dark:border-grey-800"
      role="radiogroup"
    >
      {options.map((option) => (
        <label
          key={String(option.value)}
          className={`flex cursor-pointer items-center px-2.5 py-1 transition duration-150 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-grey-500 motion-reduce:transition-none ${
            value === option.value
              ? "bg-black font-semibold text-white dark:bg-white dark:text-black"
              : "bg-white text-grey-900 hover:bg-grey-100 dark:bg-grey-950 dark:text-grey-200 dark:hover:bg-grey-900"
          }`}
        >
          <input
            checked={value === option.value}
            className="sr-only"
            name={name}
            type="radio"
            value={String(option.value)}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  </div>
);

/**
 * The reader simulation's controls: width (desktop, tablet, phone), theme (light, dark) and text
 * size. The editor shows them above itself in preview; a host that places its own toggle can place
 * this too. It renders nothing unless preview is on.
 */
export const KoenigPreviewOptionsPanel = ({ className }: { className?: string }) => {
  const { options, preview, setOptions } = useKoenigPreview();
  const strings = useKoenigStrings();
  const id = useId();
  if (!preview) return null;
  const text = strings.preview;
  return (
    <span className="koenig-lexical inline-flex">
      <span
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ""}`}
        data-kg-preview-options
      >
        <Segmented
          label={text.width}
          name={`${id}-width`}
          options={[
            { label: text.desktop, value: "desktop" },
            { label: text.tablet, value: "tablet" },
            { label: text.phone, value: "phone" },
          ]}
          value={options.width}
          onChange={(width) => setOptions({ width })}
        />
        <Segmented
          label={text.theme}
          name={`${id}-theme`}
          options={[
            { label: text.light, value: "light" },
            { label: text.dark, value: "dark" },
          ]}
          value={options.theme}
          onChange={(theme) => setOptions({ theme })}
        />
        <Segmented
          label={text.textSize}
          name={`${id}-size`}
          options={SIZES.map((size) => ({ label: String(size), value: size }))}
          value={options.textSize}
          onChange={(textSize) => setOptions({ textSize })}
        />
      </span>
    </span>
  );
};

export default KoenigPreviewOptionsPanel;
