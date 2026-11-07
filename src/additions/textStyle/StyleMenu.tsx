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
import { type CSSProperties, type FC, type KeyboardEvent, useEffect, useRef } from "react";

import { AnchoredMenu } from "../placement/AnchoredMenu";

export interface StyleOption {
  checked: boolean;
  id: string;
  label: string;
  /** A colour shown before the label. */
  swatch?: string;
  /** Style applied to the label, to show the choice as it will look (a size, a font). */
  sample?: CSSProperties;
}

interface StyleMenuProps {
  anchor: Element | null;
  /** Names the menu for a screen reader. */
  label: string;
  onClose: () => void;
  onPick: (id: string) => void;
  options: StyleOption[];
}

// The list under a selection-toolbar button (text size, colour, highlight, font). It opens with
// focus on the chosen option (or the first), the arrow keys, Home and End move, Enter or Space
// picks, and Escape or Tab closes. Pressing an option never takes the text selection away.
export const StyleMenu: FC<StyleMenuProps> = ({ anchor, label, onClose, onPick, options }) => {
  const container = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = () => [
    ...(menu.current?.querySelectorAll<HTMLElement>("[role='menuitemradio']") ?? []),
  ];

  useEffect(() => {
    const list = items();
    (list.find((item) => item.getAttribute("aria-checked") === "true") ?? list[0])?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        return move(index + 1);
      case "ArrowUp":
        return move(index - 1);
      case "Home":
        return move(0);
      case "End":
        return move(list.length - 1);
      case "Escape":
      case "Tab":
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      default:
    }
  };

  return (
    <AnchoredMenu anchor={anchor} containerRef={container} measure="whole">
      <div
        ref={menu}
        aria-label={label}
        className="not-kg-prose max-h-[min(40rem,70vh)] min-w-[16rem] overflow-y-auto rounded-lg bg-white py-1 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
        data-kg-style-menu
        role="menu"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => event.preventDefault()}
      >
        {options.map((option) => (
          <button
            key={option.id}
            aria-checked={option.checked}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-[0.7rem] text-left hover:bg-grey-100 focus:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900 dark:focus:bg-grey-900 forced-colors:focus:outline forced-colors:focus:outline-2"
            data-kg-style-item={option.id}
            role="menuitemradio"
            tabIndex={-1}
            type="button"
            onClick={() => onPick(option.id)}
          >
            {option.swatch ? (
              <span
                aria-hidden="true"
                className="inline-block size-[1.6rem] rounded border border-grey-500"
                style={{ background: option.swatch }}
              />
            ) : null}
            <span className="flex-1" style={option.sample}>
              {option.label}
            </span>
            {option.checked ? (
              <span
                aria-hidden="true"
                className="inline-block size-[0.8rem] rounded-full bg-current"
              />
            ) : null}
          </button>
        ))}
      </div>
    </AnchoredMenu>
  );
};

export default StyleMenu;
