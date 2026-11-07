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
import { useKoenigStrings } from "../options";
import { useKoenigPreview } from "./PreviewContext";

const EyeIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4 shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 16 16"
  >
    <path
      d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
    <circle cx="8" cy="8" r="2" strokeWidth="1.4" />
  </svg>
);

/**
 * The Preview button. The editor puts one above its content unless `showPreviewToggle={false}`;
 * a host can place this anywhere inside the composer instead. It renders nothing when preview is
 * not available (the tool is off, or the editor is not editable).
 */
export const KoenigPreviewToggle = ({ className }: { className?: string }) => {
  const { available, preview, setPreview } = useKoenigPreview();
  const strings = useKoenigStrings();
  if (!available) return null;
  return (
    // the classes are scoped to the editor's own root, so the button carries one when it is placed outside it
    <span className="koenig-lexical inline-flex">
      <button
        // in the reader's view this is a plain "Back to editing" button, not a pressed toggle
        aria-pressed={preview ? undefined : false}
        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 font-sans text-sm font-medium outline-0 transition duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-transparent focus-visible:ring-2 focus-visible:ring-grey-500 motion-reduce:transition-none ${
          preview
            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
            : "border-grey-300 bg-white text-grey-900 hover:bg-grey-100 dark:border-grey-800 dark:bg-grey-950 dark:text-grey-200 dark:hover:bg-grey-900"
        } ${className ?? ""}`}
        data-kg-preview-on={preview}
        data-kg-preview-toggle
        type="button"
        // a click does not take focus from the editor, so the cursor can go back where it was
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setPreview(!preview)}
      >
        <EyeIcon />
        {preview ? strings.preview.back : strings.preview.toggle}
      </button>
    </span>
  );
};

export default KoenigPreviewToggle;
