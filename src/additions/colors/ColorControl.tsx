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
import type { KoenigColorSlot } from "node-koenig-editor";
import { type CSSProperties, type FC, useContext } from "react";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { useKoenigStrings } from "../options/strings";
import {
  type KoenigColors,
  type ResolvedColorSetting,
  isHexColor,
  isColorAllowed,
  normalizeColor,
  resolveColorSetting,
  sameColor,
} from "./colors";

/** A slot's setting for the composer it sits in (the host's `colors` over the defaults). */
export const useColorSetting = (slot: KoenigColorSlot): ResolvedColorSetting => {
  const { colors } = useContext(KoenigComposerContext) as { colors?: KoenigColors };
  return resolveColorSetting(slot, colors);
};

interface ColorControlProps {
  /** Names the group for a screen reader. */
  label: string;
  /** Called with a colour, or null for the editor's own colour. A colour the host's setting does
   *  not allow is never passed on. */
  onChange: (value: null | string) => void;
  setting: ResolvedColorSetting;
  /** The current colour (hex), or null / empty for the editor's own. */
  value: null | string | undefined;
  /** Keeps the text selection when a swatch is pressed (used inside the selection toolbar). */
  keepFocus?: boolean;
  slot?: KoenigColorSlot;
}

const swatchStyle = (color: string, selected: boolean): CSSProperties => ({
  background: color,
  border: "1px solid var(--kg-color-grey-500, #7C8B9A)",
  borderRadius: "9999px",
  boxShadow: selected ? "0 0 0 2px var(--kg-selection, #30CF43)" : "none",
  cursor: "pointer",
  height: "2.2rem",
  padding: 0,
  width: "2.2rem",
});

/** The one colour control every colour setting uses: the slot's base palette, the editor's own
 *  colour (when the host allows it) and, when the host allows it, a picker for any colour. */
export const ColorControl: FC<ColorControlProps> = ({
  keepFocus,
  label,
  onChange,
  setting,
  slot,
  value,
}) => {
  const strings = useKoenigStrings().colors;
  const current = value && isHexColor(value) ? value : null;
  const choose = (next: null | string) => {
    if (isColorAllowed(setting, next)) onChange(next);
  };
  const stop = keepFocus
    ? (event: { preventDefault: () => void }) => event.preventDefault()
    : undefined;
  const custom = !!current && !setting.palette.some((swatch) => sameColor(swatch.value, current));

  return (
    <div
      aria-label={strings.group.replace("{label}", label)}
      data-kg-color-control={slot ?? "color"}
      role="radiogroup"
      style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "0.6rem" }}
    >
      {setting.none ? (
        <button
          aria-checked={!current}
          aria-label={strings.none}
          data-kg-color-none
          role="radio"
          style={{
            ...swatchStyle("transparent", !current),
            backgroundImage:
              "linear-gradient(135deg, transparent 46%, var(--kg-color-red, #D64545) 46% 54%, transparent 54%)",
          }}
          title={strings.none}
          type="button"
          onClick={() => choose(null)}
          onMouseDown={stop}
        />
      ) : null}
      {setting.palette.map((swatch) => (
        <button
          key={swatch.value}
          aria-checked={sameColor(swatch.value, current)}
          aria-label={swatch.label}
          data-kg-color-swatch={swatch.value}
          role="radio"
          style={swatchStyle(swatch.value, sameColor(swatch.value, current))}
          title={swatch.label}
          type="button"
          onClick={() => choose(swatch.value)}
          onMouseDown={stop}
        />
      ))}
      {setting.picker ? (
        <label
          data-kg-color-picker
          style={{
            ...swatchStyle(custom && current ? current : "transparent", custom),
            alignItems: "center",
            backgroundImage: custom
              ? "none"
              : "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            display: "inline-block",
            overflow: "hidden",
            position: "relative",
          }}
          title={strings.custom}
        >
          <input
            aria-label={strings.custom}
            style={{
              cursor: "pointer",
              height: "100%",
              inset: 0,
              opacity: 0,
              position: "absolute",
              width: "100%",
            }}
            type="color"
            value={current ? normalizeColor(current) : "#000000"}
            onChange={(event) => choose(event.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
};

export default ColorControl;
