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
import { type CSSProperties, type FC, useRef, useState } from "react";

import { useKoenigTool } from "../options";
import { AnchoredMenu } from "../placement/AnchoredMenu";
import { EmojiPicker } from "./EmojiPicker";

interface EmojiFieldProps {
  /** Names the button that opens the picker. */
  label: string;
  onChange: (emoji: string) => void;
  placeholder: string;
  removeLabel: string;
  style?: CSSProperties;
  value: string | undefined;
}

// An optional emoji for a card's label (the Button and Header cards): a button showing the chosen
// emoji, or the placeholder when none is set, that opens the offline picker; a second button takes
// the emoji away. Shown only while the emoji picker tool is on.
export const EmojiField: FC<EmojiFieldProps> = ({
  label,
  onChange,
  placeholder,
  removeLabel,
  style,
  value,
}) => {
  const enabled = useKoenigTool("emojiPicker");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  if (!enabled) return null;

  return (
    <span
      data-kg-emoji-field
      style={{ alignItems: "center", display: "inline-flex", gap: "0.6rem" }}
    >
      <button
        ref={button}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        data-kg-emoji-field-button
        style={style}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {value || placeholder}
      </button>
      {value ? (
        <button
          aria-label={removeLabel}
          data-kg-emoji-field-remove
          style={style}
          type="button"
          onClick={() => onChange("")}
        >
          {"×"}
        </button>
      ) : null}
      {open ? (
        <AnchoredMenu anchor={button.current} containerRef={container} measure="whole">
          <div data-kg-emoji-field-picker>
            <EmojiPicker
              onClose={() => setOpen(false)}
              onSelect={(emoji) => {
                onChange(emoji.native);
                setOpen(false);
              }}
            />
          </div>
        </AnchoredMenu>
      ) : null}
    </span>
  );
};

export default EmojiField;
