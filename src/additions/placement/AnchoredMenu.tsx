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
  /**
   * What counts as the menu's height when it is placed. "list" (the default) is the list inside
   * the menu, which scrolls to fit `--kg-menu-fit`; "whole" is everything in it, for a panel with
   * a search box and a strip around its list, which limits its own height and is placed again
   * whenever its size changes.
   */
  measure?: "list" | "whole";
  /**
   * Where to draw the menu instead of the editor's root: the layer of the thing that opened it. A
   * menu opened from the selection toolbar goes in the toolbar's own layer, because the toolbar is
   * in the page's top layer and a menu in the editor's root (inside a host's stacking context)
   * would sit under it, however high its z-index.
   */
  layer?: Element | null;
}

// A menu drawn in a portal at the editor's own root, positioned fixed against the viewport:
// the editor's overflow can't clip it, and it flips above the anchor or shrinks and scrolls
// when there isn't room below. It sits inside the host's themed tree, so --kg-* tokens set
// on an ancestor reach it. The editor sets no tokens of its own here.
export const AnchoredMenu = ({
  anchor,
  children,
  containerRef,
  measure = "list",
  layer,
}: AnchoredMenuProps) => {
  const [editor] = useLexicalComposerContext();
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const root = editor.getRootElement();
  const target =
    (layer as HTMLElement | null | undefined) ??
    (root?.closest(".koenig-lexical") as HTMLElement | null) ??
    document.body;

  useLayoutEffect(() => {
    if (!anchor) return undefined;
    const place = () => {
      const menu = containerRef.current;
      if (!menu) return;
      const rect = anchor.getBoundingClientRect();
      const natural = (
        measure === "whole" ? menu.firstElementChild : menu.firstElementChild?.firstElementChild
      ) as HTMLElement | null;
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
    // A panel that fills in after it opens (the emoji are loaded on first use) is placed again
    // once it has its real height, so it flips or moves to fit.
    const watched = measure === "whole" ? containerRef.current : null;
    const observer =
      watched && typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (watched) observer?.observe(watched);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      observer?.disconnect();
    };
  }, [anchor, containerRef, children, measure]);

  return (
    <FloatingPortal to={target}>
      <div ref={containerRef} className="fixed z-[9999999]" data-kg-menu-portal style={style}>
        {children}
      </div>
    </FloatingPortal>
  );
};

export default AnchoredMenu;
