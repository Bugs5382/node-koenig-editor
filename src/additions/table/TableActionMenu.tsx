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
import { type FC, type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

export interface TableMenuItem {
  /** A colour to show before the label. */
  swatch?: string;
  /** For a toggle (`checkbox`) or one of a set (`radio`): whether it is on. */
  checked?: boolean;
  disabled?: boolean;
  id: string;
  kind?: "checkbox" | "item" | "radio";
  label: string;
  onSelect: () => void;
}

export interface TableMenuSection {
  items: TableMenuItem[];
  label?: string;
}

interface TableMenuProps {
  /** Names the menu for a screen reader. */
  label: string;
  onClose: () => void;
  sections: TableMenuSection[];
  /** Extra content under the items, for example a text field. */
  footer?: ReactNode;
}

// A menu of table actions: arrow keys, Home and End move, Enter or Space picks, Escape and Tab
// close it. Used by the toolbar's groups and by the right-click menu, so they behave the same.
export const TableActionMenu: FC<TableMenuProps> = ({ footer, label, onClose, sections }) => {
  const ref = useRef<HTMLDivElement>(null);
  const items = () => [
    ...(ref.current?.querySelectorAll<HTMLElement>(
      "[role^='menuitem']:not([aria-disabled='true'])",
    ) ?? []),
  ];

  useEffect(() => {
    items()[0]?.focus();
    // opens with focus on its first available item
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
    <div
      ref={ref}
      aria-label={label}
      className="not-kg-prose max-h-[min(40rem,70vh)] min-w-[18rem] overflow-y-auto rounded-lg bg-white py-1 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white"
      data-kg-table-menu
      role="menu"
      onKeyDown={onKeyDown}
      onMouseDown={(event) => {
        // keep the cursor in the table while a menu item is pressed
        if (!(event.target as HTMLElement).closest("input")) event.preventDefault();
      }}
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.label ?? sectionIndex}
          aria-label={section.label}
          className={sectionIndex > 0 ? "border-t border-grey-200 dark:border-grey-900" : undefined}
          role="group"
        >
          {section.items.map((item) => (
            <button
              key={item.id}
              aria-checked={item.kind && item.kind !== "item" ? Boolean(item.checked) : undefined}
              aria-disabled={item.disabled || undefined}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-[0.7rem] text-left hover:bg-grey-100 focus:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-selection aria-disabled:cursor-default aria-disabled:opacity-40 dark:hover:bg-grey-900 dark:focus:bg-grey-900"
              data-kg-table-menu-item={item.id}
              role={
                item.kind === "checkbox"
                  ? "menuitemcheckbox"
                  : item.kind === "radio"
                    ? "menuitemradio"
                    : "menuitem"
              }
              tabIndex={-1}
              type="button"
              onClick={() => {
                if (!item.disabled) item.onSelect();
              }}
            >
              {item.swatch ? (
                <span
                  aria-hidden="true"
                  className="inline-block size-[1.6rem] rounded border border-grey-500"
                  style={{ background: item.swatch }}
                />
              ) : null}
              <span className="flex-1">{item.label}</span>
              {item.kind && item.kind !== "item" && item.checked ? (
                <span
                  aria-hidden="true"
                  className="inline-block size-[0.8rem] rounded-full bg-current"
                />
              ) : null}
            </button>
          ))}
        </div>
      ))}
      {footer}
    </div>
  );
};

export default TableActionMenu;
