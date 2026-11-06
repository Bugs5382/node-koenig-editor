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
import { type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";

interface FloatingPortalProps {
  children: ReactNode;
  /** Where to mount it: the editor's own root, so the host's theme tokens reach it. */
  to: Element;
}

// Mounts floating UI under the editor's styled root and in its dark mode, without letting
// mouse presses inside it reach the editor (which would drop the selection).
export const FloatingPortal = ({ children, to }: FloatingPortalProps) => {
  const { darkMode } = useContext(KoenigComposerContext) as { darkMode?: boolean };
  return createPortal(
    <div
      className="koenig-lexical"
      data-kg-portal
      style={{ width: "fit-content" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className={darkMode ? "dark" : ""}>{children}</div>
    </div>,
    to,
  );
};

export default FloatingPortal;
