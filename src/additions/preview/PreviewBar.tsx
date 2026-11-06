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
import { useKoenigPreview } from "./PreviewContext";
import { KoenigPreviewOptionsPanel } from "./PreviewOptionsPanel";
import { KoenigPreviewToggle } from "./PreviewToggle";

/**
 * The default chrome above the editor: the Preview button, and in the reader's view the "Back to
 * editing" button in the same place, unless the host places its own. It is a strip of its own
 * above the writing area, in the normal flow (no floating, no z-index), so its height is part of
 * the layout and it can never cover text, the plus button, a menu or a toolbar.
 */
export const KoenigPreviewBar = () => {
  const { available, showToggle } = useKoenigPreview();
  if (!available || !showToggle) return null;
  return (
    // the classes are scoped to the editor's root, so they sit on an element inside one
    <div className="koenig-lexical">
      <div
        className="mb-4 flex min-h-[4rem] flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b border-grey-200 pb-2 font-sans dark:border-grey-900"
        data-kg-preview-bar
      >
        <KoenigPreviewOptionsPanel />
        <KoenigPreviewToggle />
      </div>
    </div>
  );
};

export default KoenigPreviewBar;
