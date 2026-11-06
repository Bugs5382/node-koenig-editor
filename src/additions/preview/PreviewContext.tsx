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
import { $getSelection, $setSelection, type BaseSelection } from "lexical";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { useKoenigTool } from "../options/tools";

// The reader's view of the document, in the same live editor: made read-only with its editing
// chrome hidden, so it is one document, with the cursor and selection kept, nothing copied.

export type PreviewWidth = "desktop" | "phone" | "tablet";
export type PreviewTheme = "dark" | "light";
export type PreviewTextSize = 12 | 14 | 16 | 18 | 20;

export interface PreviewOptions {
  textSize: PreviewTextSize;
  theme: PreviewTheme;
  width: PreviewWidth;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
  textSize: 16,
  theme: "light",
  width: "desktop",
};

export interface PreviewContextValue {
  /** Preview can be used: the tool is on and the editor is editable to begin with. */
  available: boolean;
  options: PreviewOptions;
  /** True while the reader's view is showing. Always false when `available` is not. */
  preview: boolean;
  /** Whether comment highlights show in preview. */
  previewComments: boolean;
  setOptions: (changes: Partial<PreviewOptions>) => void;
  setPreview: (on: boolean) => void;
  showToggle: boolean;
}

const OFF: PreviewContextValue = {
  available: false,
  options: DEFAULT_PREVIEW_OPTIONS,
  preview: false,
  previewComments: false,
  setOptions: () => {},
  setPreview: () => {},
  showToggle: false,
};

const PreviewContext = createContext<PreviewContextValue>(OFF);

/** The preview state for the composer this component sits in. */
export const useKoenigPreview = (): PreviewContextValue => useContext(PreviewContext);

interface PreviewScroll {
  key: string;
  offset: number;
  scroller: HTMLElement | null;
}

const isScroller = (element: HTMLElement): boolean => {
  const overflow = window.getComputedStyle(element).overflowY;
  return (
    (overflow === "auto" || overflow === "scroll") && element.scrollHeight > element.clientHeight
  );
};

const scrollerOf = (root: HTMLElement): HTMLElement | null => {
  for (
    let element = root.parentElement;
    element && element !== document.body;
    element = element.parentElement
  ) {
    if (isScroller(element)) return element;
  }
  return null;
};

/** The top-level block at the top of the visible area, and how far below the top it sits. */
const captureScroll = (editorRoot: HTMLElement): PreviewScroll | null => {
  const scroller = scrollerOf(editorRoot);
  const top = scroller ? scroller.getBoundingClientRect().top : 0;
  for (const child of editorRoot.children) {
    const rect = child.getBoundingClientRect();
    if (rect.bottom > top + 1) {
      const key = Object.keys(child).find((name) => name.startsWith("__lexicalKey_"));
      if (!key) return null;
      return {
        key: (child as unknown as Record<string, string>)[key] as string,
        offset: rect.top - top,
        scroller,
      };
    }
  }
  return null;
};

const restoreScroll = (
  editorRoot: HTMLElement,
  saved: PreviewScroll | null,
  getElement: (key: string) => HTMLElement | null,
) => {
  if (!saved) return;
  const element = getElement(saved.key);
  if (!element) return;
  const top = saved.scroller ? saved.scroller.getBoundingClientRect().top : 0;
  const delta = element.getBoundingClientRect().top - top - saved.offset;
  if (Math.abs(delta) < 1) return;
  if (saved.scroller) saved.scroller.scrollTop += delta;
  else window.scrollBy(0, delta);
  void editorRoot;
};

// Switches the editor between editing and reading. Entering: the selection and scroll are noted,
// a selected or editing card is let go (that state lives outside the document), open dialogs are
// closed, and the editor becomes read-only. Leaving: it gets back the editability the host gave it
// (never more), the selection returns, and focus goes back if it was in the editor.
const PreviewController = ({
  hostEditable,
  onCardLet,
  preview,
}: {
  hostEditable: boolean;
  onCardLet: () => void;
  preview: boolean;
}) => {
  const [editor] = useLexicalComposerContext();
  const first = useRef(true);
  const saved = useRef<{
    focused: boolean;
    scroll: PreviewScroll | null;
    selection: BaseSelection | null;
  }>({
    focused: false,
    scroll: null,
    selection: null,
  });

  useEffect(() => {
    const root = editor.getRootElement();
    const getElement = (key: string) => editor.getElementByKey(key) as HTMLElement | null;
    const settle = (action: () => void) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(action));

    if (first.current) {
      first.current = false;
      if (preview) editor.setEditable(false);
      return;
    }
    if (preview) {
      saved.current = {
        focused: Boolean(root && root.contains(document.activeElement)),
        scroll: root ? captureScroll(root) : null,
        selection: editor.getEditorState().read(() => $getSelection()?.clone() ?? null),
      };
      onCardLet();
      for (const dialog of document.querySelectorAll<HTMLDialogElement>(
        ".koenig-lexical dialog[open]",
      )) {
        dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      }
      editor.update(() => $setSelection(null), { discrete: true });
      editor.setEditable(false);
      if (root) settle(() => restoreScroll(root, saved.current.scroll, getElement));
    } else {
      editor.setEditable(hostEditable);
      const { focused, scroll, selection } = saved.current;
      if (selection) {
        editor.update(
          () => {
            try {
              $setSelection(selection.clone());
            } catch {
              // the selection's nodes were removed meanwhile; there is nothing to put back
            }
          },
          { discrete: true },
        );
      }
      if (focused && root) root.focus({ preventScroll: true });
      if (root) settle(() => restoreScroll(root, scroll, getElement));
    }
    // only a change of preview does anything
  }, [preview]);

  return null;
};

interface KoenigPreviewProviderProps {
  children: ReactNode;
  defaultPreview?: boolean;
  /** Whether the host's editor is editable; preview has nothing to switch off when it is not. */
  editable: boolean;
  onPreviewChange?: (preview: boolean) => void;
  onPreviewOptionsChange?: (options: PreviewOptions) => void;
  /** A card being selected or edited is let go when previewing starts. */
  onStart: () => void;
  preview?: boolean;
  previewComments?: boolean;
  previewOptions?: Partial<PreviewOptions>;
  showPreviewToggle?: boolean;
}

export const KoenigPreviewProvider = ({
  children,
  defaultPreview = false,
  editable,
  onPreviewChange,
  onPreviewOptionsChange,
  onStart,
  preview: controlled,
  previewComments = false,
  previewOptions,
  showPreviewToggle = true,
}: KoenigPreviewProviderProps) => {
  const toolOn = useKoenigTool("preview");
  const available = toolOn && editable;
  const [own, setOwn] = useState(defaultPreview);
  const [options, setOptionsState] = useState<PreviewOptions>({
    ...DEFAULT_PREVIEW_OPTIONS,
    ...previewOptions,
  });
  const isControlled = controlled !== undefined;
  const preview = available && (isControlled ? controlled : own);

  const latest = useRef({
    isControlled,
    onPreviewChange,
    onPreviewOptionsChange,
    options,
    preview,
  });
  latest.current = { isControlled, onPreviewChange, onPreviewOptionsChange, options, preview };

  const setPreview = useCallback((next: boolean) => {
    const current = latest.current;
    if (next === current.preview) return;
    if (!current.isControlled) setOwn(next);
    current.onPreviewChange?.(next);
  }, []);

  const setOptions = useCallback((changes: Partial<PreviewOptions>) => {
    const next = { ...latest.current.options, ...changes };
    setOptionsState(next);
    latest.current.onPreviewOptionsChange?.(next);
  }, []);

  const value = useMemo<PreviewContextValue>(
    () => ({
      available,
      options,
      preview,
      previewComments,
      setOptions,
      setPreview,
      showToggle: showPreviewToggle,
    }),
    [available, options, preview, previewComments, setOptions, setPreview, showPreviewToggle],
  );

  // Everything that reads the editor's dark mode (the editor, its menus, the viewer) follows the
  // preview's theme while previewing, and the host's own darkMode the rest of the time.
  const parent = useContext(KoenigComposerContext) as Record<string, unknown>;
  const composerValue = useMemo(
    () => (preview ? { ...parent, darkMode: options.theme === "dark" } : parent),
    [parent, preview, options.theme],
  );

  return (
    <PreviewContext.Provider value={value}>
      <PreviewController hostEditable={editable} preview={preview} onCardLet={onStart} />
      <KoenigComposerContext.Provider value={composerValue}>
        {children}
      </KoenigComposerContext.Provider>
    </PreviewContext.Provider>
  );
};

/**
 * Whether the editor this component sits in can be edited right now: false in the reader's view
 * and for a host that gave `editable={false}`. A card draws its reader form (text, not inputs; no
 * upload placeholders; no controls) when this is false.
 */
export const useKoenigEditable = (): boolean => {
  const [editor] = useLexicalComposerContext();
  const [editable, setEditable] = useState(() => editor.isEditable());
  useEffect(() => {
    setEditable(editor.isEditable());
    return editor.registerEditableListener(setEditable);
  }, [editor]);
  return editable;
};
