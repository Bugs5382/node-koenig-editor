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
// A small styled confirm dialog and an undo toast, replacing the browser's confirm(). Plain React
// and CSS (controls.css); no dependency on the rest of the demo, so the staging playground reuses
// this file as it is.
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

interface ConfirmProps {
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

/** Asks before something is thrown away. Escape or a press outside cancels; focus starts on Cancel. */
export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
}: ConfirmProps) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => before?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div className="confirm-backdrop" onMouseDown={onCancel}>
      <div
        ref={box}
        className="confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id={`${id}-title`} className="confirm-title">
          {title}
        </h2>
        <p id={`${id}-text`} className="confirm-text">
          {message}
        </p>
        <div className="confirm-actions">
          <button
            ref={cancel}
            type="button"
            className="ctl-button ctl-button-quiet"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className="ctl-button ctl-button-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  actionLabel: string;
  message: string;
  onAction: () => void;
  onDismiss: () => void;
}

/** A short message with one action (Undo). It goes away by itself after a while. */
export function Toast({ actionLabel, message, onAction, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 12000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button type="button" className="ctl-button ctl-button-quiet" onClick={onAction}>
        {actionLabel}
      </button>
      <button
        type="button"
        className="ctl-button ctl-button-quiet toast-close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        &times;
      </button>
    </div>
  );
}
