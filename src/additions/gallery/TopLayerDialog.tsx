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
import { type DialogHTMLAttributes, type ReactNode, useEffect, useRef } from "react";

import { FloatingPortal } from "../placement/FloatingPortal";

interface TopLayerDialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "onCancel"> {
  children: ReactNode;
  /** Called when the person asks to close it: Escape, or the browser's own cancel. */
  onRequestClose: () => void;
  /** Where focus goes once the dialog is gone. It cannot go sooner: while a modal dialog is open
   *  everything outside it is inert, and focusing something there does nothing. */
  returnFocusTo?: HTMLElement | null;
  /** Where the editor's own root is, so the theme tokens and dark mode reach it. */
  to: Element;
}

/**
 * A modal that is drawn in the browser's top layer: a native `<dialog>` opened with `showModal()`.
 * The top layer sits above every z-index on the page, so no host stylesheet (a sticky bar at the
 * highest z-index, say) can cover a modal's controls. Where the browser has no native dialog it is
 * the same element held `open` with `position: fixed`, which is only as good as the page's z-index.
 */
export const TopLayerDialog = ({
  children,
  onRequestClose,
  returnFocusTo,
  to,
  ...props
}: TopLayerDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const returnRef = useRef(returnFocusTo);
  returnRef.current = returnFocusTo;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    // Escape fires the browser's cancel event; closing is ours to do, so the dialog's own state and
    // the card's (and focus going back to the button that opened it) never disagree.
    const onCancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      if (typeof dialog.close === "function" && dialog.open) dialog.close();
      // now the page is live again, so focus can go back
      returnRef.current?.focus();
    };
  }, []);

  return (
    <FloatingPortal to={to}>
      <dialog ref={ref} {...props}>
        {children}
      </dialog>
    </FloatingPortal>
  );
};

export default TopLayerDialog;
