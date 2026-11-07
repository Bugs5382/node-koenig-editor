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
import { useCallback, useEffect, useRef, useState } from "react";

import { useKoenigStrings, useKoenigTool } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import { $findMatches, $matchPoints, $replaceAll, $replaceMatch, type Match } from "./findReplace";

// The find bar. Ctrl or Cmd+F opens it with the find field focused; Enter and Shift+Enter step
// through the matches, which are counted and highlighted in the text (where the browser supports
// the CSS Custom Highlight API); Replace, Replace all and Match case are in the bar, and Escape
// closes it and returns to the text. The matches follow the text while it is edited.

const fill = (template: string, values: Record<string, number>) =>
  template.replaceAll(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

const supportsHighlights = () =>
  typeof CSS !== "undefined" &&
  "highlights" in CSS &&
  typeof (globalThis as { Highlight?: unknown }).Highlight === "function";

export const FindReplacePlugin = () => {
  const [editor] = useLexicalComposerContext();
  const enabled = useKoenigTool("findReplace");
  const t = useKoenigStrings().find;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [editable, setEditable] = useState(editor.isEditable());
  const findRef = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || editor._parentEditor) return undefined;
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false;
        if (
          event.code !== "KeyF" &&
          !(event.code === undefined && event.key.toLowerCase() === "f")
        ) {
          return false;
        }
        event.preventDefault();
        // start from the selected text, when there is some on one line
        const selected = window.getSelection()?.toString() ?? "";
        if (selected && !selected.includes("\n")) setQuery(selected);
        setOpen(true);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, enabled]);

  useEffect(() => editor.registerEditableListener(setEditable), [editor]);

  // the matches, again whenever the query, the option or the text changes
  const refresh = useCallback(() => {
    if (!open) return;
    editor.getEditorState().read(() => setMatches($findMatches(query, matchCase)));
  }, [editor, matchCase, open, query]);
  useEffect(() => {
    refresh();
    if (!open) return undefined;
    return editor.registerUpdateListener(refresh);
  }, [editor, open, refresh]);
  useEffect(() => {
    setIndex((current) => (matches.length === 0 ? 0 : Math.min(current, matches.length - 1)));
  }, [matches]);
  useEffect(() => {
    setMessage("");
  }, [query, matchCase]);

  useEffect(() => {
    if (!open) return undefined;
    const element = bar.current as
      (HTMLDivElement & { hidePopover?: () => void; showPopover?: () => void }) | null;
    // in the browser's top layer where it has one, so a host's sticky bar cannot cover it
    if (element && typeof element.showPopover === "function") {
      try {
        element.setAttribute("popover", "manual");
        element.showPopover();
      } catch {
        // stays a fixed box
      }
    }
    findRef.current?.focus();
    return () => {
      try {
        element?.hidePopover?.();
      } catch {
        // already hidden
      }
    };
  }, [open]);

  // highlights in the page, and the current match scrolled into view
  useEffect(() => {
    if (!supportsHighlights()) return undefined;
    const registry = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    const HighlightClass = (
      globalThis as unknown as { Highlight: new (...ranges: Range[]) => unknown }
    ).Highlight;
    if (!open || matches.length === 0) {
      registry.delete("kg-find");
      registry.delete("kg-find-current");
      return undefined;
    }
    const ranges: Range[] = [];
    let current: Range | null = null;
    editor.getEditorState().read(() => {
      matches.forEach((match, position) => {
        const points = $matchPoints(match);
        if (!points) return;
        const startElement = editor.getElementByKey(points.start.key);
        const endElement = editor.getElementByKey(points.end.key);
        const from =
          startElement && document.createTreeWalker(startElement, NodeFilter.SHOW_TEXT).nextNode();
        const to =
          endElement && document.createTreeWalker(endElement, NodeFilter.SHOW_TEXT).nextNode();
        if (!from || !to) return;
        const range = document.createRange();
        range.setStart(from, Math.min(points.start.offset, from.textContent?.length ?? 0));
        range.setEnd(to, Math.min(points.end.offset, to.textContent?.length ?? 0));
        ranges.push(range);
        if (position === index) current = range;
      });
    });
    registry.set("kg-find", new HighlightClass(...ranges));
    if (current) {
      registry.set("kg-find-current", new HighlightClass(current));
      (current as Range).startContainer.parentElement?.scrollIntoView?.({ block: "center" });
    } else {
      registry.delete("kg-find-current");
    }
    return () => {
      registry.delete("kg-find");
      registry.delete("kg-find-current");
    };
  }, [editor, index, matches, open]);

  if (!enabled || !open) return null;

  const step = (by: number) => {
    if (matches.length === 0) return;
    setIndex((current) => (current + by + matches.length) % matches.length);
  };
  const dismiss = () => {
    setOpen(false);
    editor.focus();
    editor.getRootElement()?.focus({ preventScroll: true });
  };
  const replaceCurrent = () => {
    const match = matches[index];
    if (!match) return;
    editor.update(
      () => {
        $replaceMatch(match, replacement);
      },
      { discrete: true },
    );
  };
  const replaceEvery = () => {
    let count = 0;
    editor.update(
      () => {
        count = $replaceAll(query, replacement, matchCase);
      },
      { discrete: true },
    );
    setMessage(fill(t.replaced, { count }));
  };
  const status =
    message ||
    (!query
      ? ""
      : matches.length === 0
        ? t.none
        : fill(t.status, { current: index + 1, total: matches.length }));
  const target =
    (editor.getRootElement()?.closest(".koenig-lexical") as HTMLElement | null) ?? document.body;
  const field =
    "min-w-0 flex-1 rounded-md border border-grey-300 bg-white px-2 py-1 text-black dark:bg-grey-900 dark:text-white";
  const action =
    "cursor-pointer rounded-md px-2 py-1 hover:bg-grey-200/80 focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900 forced-colors:border forced-colors:border-[ButtonText]";

  return (
    <FloatingPortal to={target}>
      <div
        aria-label={t.title}
        ref={bar}
        className="not-kg-prose fixed z-[9999] m-0 flex w-[34rem] max-w-[94vw] flex-col gap-2 rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
        data-kg-find-bar
        role="search"
        style={{ inset: "auto", right: "0.8rem", top: "0.8rem" }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            dismiss();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={findRef}
            aria-label={t.find}
            className={field}
            placeholder={t.find}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                step(event.shiftKey ? -1 : 1);
              }
            }}
          />
          <button aria-label={t.previous} className={action} type="button" onClick={() => step(-1)}>
            {"↑"}
          </button>
          <button aria-label={t.next} className={action} type="button" onClick={() => step(1)}>
            {"↓"}
          </button>
          <button className={action} type="button" onClick={dismiss}>
            {t.close}
          </button>
        </div>
        {editable ? (
          <div className="flex items-center gap-2">
            <input
              aria-label={t.replace}
              className={field}
              placeholder={t.replace}
              type="text"
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  replaceCurrent();
                }
              }}
            />
            <button className={action} type="button" onClick={replaceCurrent}>
              {t.replaceOne}
            </button>
            <button className={action} type="button" onClick={replaceEvery}>
              {t.replaceAll}
            </button>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2">
            <input
              checked={matchCase}
              type="checkbox"
              onChange={(event) => setMatchCase(event.target.checked)}
            />
            {t.matchCase}
          </label>
          <span aria-live="polite" data-kg-find-status role="status">
            {status}
          </span>
        </div>
      </div>
    </FloatingPortal>
  );
};

export default FindReplacePlugin;
