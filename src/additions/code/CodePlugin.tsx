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
import { $createCodeNode, $isCodeNode, CodeNode } from "@lexical/code";
import { registerCodeHighlighting } from "@lexical/code-prism";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
} from "lexical";
import { type FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { FloatingPortal } from "../placement/FloatingPortal";
import { useKoenigEditable } from "../preview/PreviewContext";
import { useKoenigStrings } from "../options/strings";
import { PLAIN_TEXT, resolveCodeLanguages } from "./codeLanguages";
import { INSERT_CODE_BLOCK_COMMAND } from "./codeMenu";

// The code card: Lexical's own code block with Prism highlighting (language set per block),
// line numbers drawn by the stylesheet from the block's `data-gutter`, and a small bar on the
// block under the pointer or the cursor with a language list and a copy button. The numbers are
// generated content, so they are never part of the copied text.

const CopyIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="14"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="14"
  >
    <rect height="13" rx="2" width="13" x="9" y="9" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the older route
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  } catch {
    return false;
  }
};

interface Active {
  element: HTMLElement;
  key: string;
}

export const CodePlugin: FC = () => {
  const [editor] = useLexicalComposerContext();
  const strings = useKoenigStrings().code;
  const editable = useKoenigEditable();
  const { codeLanguages } = useContext(KoenigComposerContext) as {
    codeLanguages?: readonly { label: string; value: string }[];
  };
  const languages = useMemo(
    () => resolveCodeLanguages(codeLanguages, strings.plainText),
    [codeLanguages, strings.plainText],
  );
  const [hovered, setHovered] = useState<Active | null>(null);
  const [inside, setInside] = useState<Active | null>(null);
  const [language, setLanguage] = useState<string>(PLAIN_TEXT);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = hovered ?? inside;

  const hasCode = editor.hasNodes([CodeNode]);

  useEffect(() => {
    if (!hasCode) return undefined;
    return registerCodeHighlighting(editor);
  }, [editor, hasCode]);

  // the "+" and slash menus' Code entry
  useEffect(() => {
    if (!hasCode) return undefined;
    return editor.registerCommand(
      INSERT_CODE_BLOCK_COMMAND,
      () => {
        const selection = $getSelection();
        const top = $isRangeSelection(selection)
          ? selection.anchor.getNode().getTopLevelElement()
          : null;
        const code = $createCodeNode();
        if (top && $isParagraphNode(top) && top.getTextContentSize() === 0) {
          top.replace(code);
        } else if (top) {
          top.insertAfter(code);
        } else {
          $getRoot().append(code);
        }
        // a line to carry on writing in after the block
        if (!code.getNextSibling()) code.insertAfter($createParagraphNode());
        code.selectStart();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, hasCode]);

  // the code block holding the cursor
  useEffect(() => {
    if (!hasCode) return undefined;
    return editor.registerUpdateListener(({ editorState }) => {
      const found = editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return null;
        const node = $findMatchingParent(selection.anchor.getNode(), $isCodeNode);
        return node ? { key: node.getKey(), language: node.getLanguage() ?? PLAIN_TEXT } : null;
      });
      if (!found) {
        setInside(null);
        return;
      }
      const element = editor.getElementByKey(found.key);
      setInside(element ? { element, key: found.key } : null);
      setLanguage(found.language);
    });
  }, [editor, hasCode]);

  // the code block under the pointer
  useEffect(() => {
    const root = editor.getRootElement();
    if (!hasCode || !root) return undefined;
    const over = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest?.<HTMLElement>(
        ".kg-code-block",
      );
      if (!element || !root.contains(element)) return;
      setHovered((current) => {
        if (current?.element === element) return current;
        const key = editor.read(() => $getNearestNodeFromDOMNode(element)?.getKey() ?? null);
        return key ? { element, key } : null;
      });
      const found = editor.read(() => {
        const node = $getNearestNodeFromDOMNode(element);
        return $isCodeNode(node) ? (node.getLanguage() ?? PLAIN_TEXT) : PLAIN_TEXT;
      });
      setLanguage(found);
    };
    const leave = (event: MouseEvent) => {
      if (event.relatedTarget instanceof Node && bar.current?.contains(event.relatedTarget)) return;
      setHovered(null);
    };
    root.addEventListener("mouseover", over);
    root.addEventListener("mouseleave", leave);
    return () => {
      root.removeEventListener("mouseover", over);
      root.removeEventListener("mouseleave", leave);
    };
  }, [editor, hasCode]);

  // keep the bar at the block's top right edge
  useEffect(() => {
    if (!active) {
      setRect(null);
      return undefined;
    }
    const place = () => {
      const box = active.element.getBoundingClientRect();
      setRect({ left: box.right, top: box.top });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [active]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    if (!active) return;
    const text = editor.read(() => {
      const node = $getNodeByKey(active.key);
      return $isCodeNode(node) ? node.getTextContent() : "";
    });
    const done = await copyText(text);
    setCopied(done ? "done" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  }, [active, editor]);

  const choose = (value: string) => {
    if (!active) return;
    editor.update(() => {
      const node = $getNodeByKey(active.key);
      if ($isCodeNode(node)) node.setLanguage(value === PLAIN_TEXT ? "" : value);
    });
    setLanguage(value);
  };

  if (!hasCode || !active || !rect) return null;
  const host = editor.getRootElement()?.closest(".koenig-lexical") ?? document.body;
  // a language the block has that the host's list leaves out is still shown, as it is
  const options = languages.some((entry) => entry.value === language)
    ? languages
    : [...languages, { label: language, value: language }];

  return (
    <FloatingPortal to={host}>
      <div
        ref={bar}
        className="not-kg-prose fixed z-[9999999] flex -translate-x-full items-center gap-1 rounded-md bg-white/95 p-1 font-sans text-[1.2rem] text-grey-800 shadow dark:bg-grey-950/95 dark:text-grey-300 forced-colors:border forced-colors:border-[ButtonText]"
        data-kg-code-bar
        style={{ left: rect.left - 8, top: rect.top + 8 }}
        onMouseLeave={() => setHovered(null)}
      >
        {editable ? (
          <select
            aria-label={strings.language}
            className="max-w-[12rem] cursor-pointer rounded border-0 bg-transparent py-0.5 text-[1.2rem] outline-0 focus-visible:ring-2 focus-visible:ring-selection"
            data-kg-code-language
            value={language}
            onChange={(event) => choose(event.target.value)}
          >
            {options.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        ) : null}
        <button
          aria-label={strings.copy}
          className="flex cursor-pointer items-center gap-1 rounded border-0 bg-transparent px-1.5 py-0.5 text-[1.2rem] outline-0 hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-selection dark:hover:bg-grey-900"
          data-kg-code-copy
          type="button"
          onClick={copy}
          onMouseDown={(event) => event.preventDefault()}
        >
          <CopyIcon />
          <span aria-live="polite">
            {copied === "done"
              ? strings.copied
              : copied === "failed"
                ? strings.copyFailed
                : strings.copy}
          </span>
        </button>
      </div>
    </FloatingPortal>
  );
};

export default CodePlugin;
