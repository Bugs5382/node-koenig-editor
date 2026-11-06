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
// A side sheet with the cards guide (guides/cards.md in the repo), rendered from the same Markdown.
import MarkdownIt from "markdown-it";
import { useEffect, useRef } from "react";
import guide from "../../guides/cards.md?raw";

// Raw HTML in the guide is switched off, so the file can only produce the Markdown elements.
const html = new MarkdownIt({ html: false, linkify: false }).render(guide);

interface Props {
  onClose: () => void;
  open: boolean;
}

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function HelpSheet({ onClose, open }: Props) {
  const sheet = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  // Focus goes to the Close button when the sheet opens and back to where it was when it closes.
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    return () => before?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Tab and Shift+Tab wrap inside the sheet.
  const trap = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !sheet.current) return;
    const items = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div className="sheet-backdrop" onMouseDown={onClose} />
      <aside
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Help: the default cards"
        onKeyDown={trap}
      >
        <div className="sheet-head">
          <strong>Help</strong>
          <div className="sheet-actions">
            <button
              type="button"
              className="ctl-button ctl-button-quiet"
              onClick={() => window.print()}
            >
              Print
            </button>
            <button
              ref={close}
              type="button"
              className="ctl-button ctl-button-quiet"
              aria-label="Close help"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        {/* The guide is this repo's own file, rendered with raw HTML switched off. */}
        <div className="md" tabIndex={0} dangerouslySetInnerHTML={{ __html: html }} />
      </aside>
    </>
  );
}
