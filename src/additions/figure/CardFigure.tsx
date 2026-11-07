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
import { $getNodeByKey } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { AnchoredMenu } from "../placement/AnchoredMenu";
import { FigureEntry } from "./FigureEntry";
import { $figureText, $getFigure, $setFigure, type Figure } from "./figure";

// The figure entry on a card: the line above or below the picture, and, while the card is selected
// in an editable editor, the button that opens the shared form. Image and gallery cards use it.

interface CardFigureProps {
  nodeKey: string;
  selected: boolean;
  slot: "above" | "below";
}

export const CardFigure = ({ nodeKey, selected, slot }: CardFigureProps) => {
  const [editor] = useLexicalComposerContext();
  const t = useKoenigStrings().figure;
  const [figure, setFigure] = useState<Figure | null>(null);
  const [text, setText] = useState("");
  const [editable, setEditable] = useState(editor.isEditable());
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const read = useCallback(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      setFigure(node ? $getFigure(node) : null);
      setText(node ? $figureText(node) : "");
    });
  }, [editor, nodeKey]);

  useEffect(() => {
    read();
    const stopUpdates = editor.registerUpdateListener(read);
    const stopEditable = editor.registerEditableListener(setEditable);
    return () => {
      stopUpdates();
      stopEditable();
    };
  }, [editor, read]);

  useEffect(() => {
    if (!selected) setOpen(false);
  }, [selected]);

  const placed = figure?.above ? "above" : "below";
  return (
    <>
      {text && placed === slot ? (
        <div
          className="not-kg-prose px-2 py-1 text-center font-sans text-[1.4rem] text-grey-700 dark:text-grey-300"
          data-kg-figure-line={slot}
        >
          {text}
        </div>
      ) : null}
      {slot === "below" && selected && editable ? (
        <div className="flex justify-center py-1" data-kg-allow-clickthrough="true">
          <button
            ref={setAnchor}
            aria-expanded={open}
            aria-haspopup="dialog"
            className="cursor-pointer rounded-md px-2 py-1 font-sans text-[1.2rem] text-grey-700 hover:bg-grey-200/80 focus-visible:ring-2 focus-visible:ring-selection dark:text-grey-300 dark:hover:bg-grey-900"
            data-kg-figure-open
            type="button"
            onClick={() => setOpen((value) => !value)}
          >
            {t.button}
          </button>
          {open ? (
            <AnchoredMenu anchor={anchor} containerRef={menuRef} measure="whole">
              <FigureEntry
                figure={figure}
                initialLabel="Figure"
                onClose={() => setOpen(false)}
                onCommit={(next) => {
                  editor.update(
                    () => {
                      const node = $getNodeByKey(nodeKey);
                      if (node) $setFigure(node, next);
                    },
                    { discrete: true },
                  );
                  setOpen(false);
                }}
              />
            </AnchoredMenu>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default CardFigure;
