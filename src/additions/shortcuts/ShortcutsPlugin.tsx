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
import { COMMAND_PRIORITY_LOW, KEY_DOWN_COMMAND } from "lexical";
import { useContext, useEffect, useRef, useState } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { isToolbarItemHidden, useKoenigStrings, useKoenigTool } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import { SHORTCUT_GROUPS, SHORTCUTS } from "./shortcuts";

// The keyboard shortcuts list: Ctrl or Cmd+slash opens it from the text, Escape or its button
// closes it, and focus goes back to the text. It lists only what is on for this editor.
export const ShortcutsPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const enabled = useKoenigTool("shortcuts");
  const strings = useKoenigStrings();
  const t = strings.shortcuts;
  const { toolbar } = useContext(KoenigComposerContext) as { toolbar?: readonly string[] | null };
  const tools = useKoenigTool("findReplace");
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled || editor._parentEditor) return undefined;
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false;
        if (event.code !== "Slash" && !(event.code === undefined && event.key === "/"))
          return false;
        event.preventDefault();
        setOpen(true);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, enabled]);

  useEffect(() => {
    if (open) close.current?.focus();
  }, [open]);

  if (!enabled || !open) return null;
  const target =
    (editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement | null) ?? document.body;
  const dismiss = () => {
    setOpen(false);
    editor.focus();
    editor.getRootElement()?.focus({ preventScroll: true });
  };
  const labelOf = (id: string, item?: string): string =>
    item
      ? ((strings.toolbar as Record<string, string>)[item] ?? id)
      : ((t.actions as Record<string, string>)[id] ?? id);
  return (
    <FloatingPortal to={target}>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
        data-kg-shortcuts-backdrop
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) dismiss();
        }}
      >
        <div
          aria-label={t.title}
          aria-modal="true"
          className="not-kg-prose flex max-h-[85vh] w-[46rem] max-w-[94vw] flex-col rounded-lg bg-white font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
          role="dialog"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              dismiss();
            } else if (event.key === "Tab") {
              // focus stays on the close button: nothing else here takes it
              event.preventDefault();
              close.current?.focus();
            }
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3">
            <h2 className="m-0 text-[1.6rem] font-semibold">{t.title}</h2>
            <button
              ref={close}
              className="cursor-pointer rounded-md px-2 py-1 font-medium hover:bg-grey-200/80 focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900"
              type="button"
              onClick={dismiss}
            >
              {t.close}
            </button>
          </div>
          <div className="overflow-y-auto px-4 pb-4">
            {SHORTCUT_GROUPS.map((group) => {
              const entries = SHORTCUTS.filter(
                (entry) =>
                  entry.group === group &&
                  !(entry.item && isToolbarItemHidden(toolbar as never, entry.item)) &&
                  !(entry.tool && !tools),
              );
              if (entries.length === 0) return null;
              return (
                <section key={group} aria-labelledby={`kg-shortcuts-${group}`}>
                  <h3
                    className="mb-1 mt-3 text-[1.3rem] font-semibold"
                    id={`kg-shortcuts-${group}`}
                  >
                    {t.groups[group]}
                  </h3>
                  <dl className="m-0">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 border-b border-grey-200 py-1 dark:border-grey-900"
                        data-kg-shortcut={entry.id}
                      >
                        <dt>{labelOf(entry.id, entry.item)}</dt>
                        <dd className="m-0 flex gap-1">
                          {entry.keys().map((key, index) => (
                            <kbd
                              key={`${key}-${index}`}
                              className="rounded border border-grey-400 bg-grey-100 px-[0.6rem] py-[0.1rem] font-sans text-[1.2rem] dark:border-grey-700 dark:bg-grey-900"
                            >
                              {key}
                            </kbd>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
};

export default ShortcutsPlugin;
