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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useState,
} from "react";

import { FloatingPortal } from "./FloatingPortal";
import { placeFloating } from "./placeFloating";

interface AnchoredMenuProps {
  /** The element the menu hangs from: the empty line for "/", the plus button for "+". */
  anchor: Element | null;
  children: ReactNode;
  containerRef: RefObject<HTMLDivElement | null>;
}

// A menu drawn in a portal at the editor's own root, positioned fixed against the viewport:
// the editor's overflow can't clip it, and it flips above the anchor or shrinks and scrolls
// when there isn't room below. It sits inside the host's themed tree, so --kg-* tokens set
// on an ancestor reach it. The editor sets no tokens of its own here.
export const AnchoredMenu = ({ anchor, children, containerRef }: AnchoredMenuProps) => {
  const [editor] = useLexicalComposerContext();
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const root = editor.getRootElement();
  const target = (root?.closest(".koenig-lexical") as HTMLElement | null) ?? document.body;

  useLayoutEffect(() => {
    if (!anchor) return undefined;
    const place = () => {
      const menu = containerRef.current;
      if (!menu) return;
      const rect = anchor.getBoundingClientRect();
      const natural = menu.firstElementChild?.firstElementChild as HTMLElement | null;
      const placed = placeFloating(
        { bottom: rect.bottom, left: rect.left, top: rect.top },
        {
          height: natural?.scrollHeight ?? menu.scrollHeight,
          width: menu.offsetWidth,
        },
        { height: window.innerHeight, width: window.innerWidth },
      );
      setStyle({
        ["--kg-menu-fit" as string]: `${placed.maxHeight}px`,
        left: placed.left,
        opacity: 1,
        top: placed.top,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, containerRef, children]);

  return (
    <FloatingPortal to={target}>
      <div ref={containerRef} className="fixed z-[9999999]" data-kg-menu-portal style={style}>
        {children}
      </div>
    </FloatingPortal>
  );
};

export default AnchoredMenu;
