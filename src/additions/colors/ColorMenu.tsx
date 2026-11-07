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
import { type FC, type KeyboardEvent, useEffect, useRef } from "react";

import { AnchoredMenu } from "../placement/AnchoredMenu";
import { ColorControl } from "./ColorControl";
import type { ResolvedColorSetting } from "./colors";

interface ColorMenuProps {
  anchor: Element | null;
  label: string;
  onClose: () => void;
  onPick: (value: null | string) => void;
  setting: ResolvedColorSetting;
  slot?: KoenigColorSlot;
  value: null | string | undefined;
}

// The colour list under a selection-toolbar button: the shared colour control in a floating box.
// It opens with focus on the chosen swatch (or the first), Tab moves between swatches and the
// picker, and Escape closes it. Pressing a swatch never takes the text selection away.
export const ColorMenu: FC<ColorMenuProps> = ({
  anchor,
  label,
  onClose,
  onPick,
  setting,
  slot,
  value,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const radios = [...(box.current?.querySelectorAll<HTMLElement>("[role='radio']") ?? [])];
    (radios.find((item) => item.getAttribute("aria-checked") === "true") ?? radios[0])?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <AnchoredMenu
      anchor={anchor}
      containerRef={container}
      layer={anchor?.closest("[data-kg-floating-toolbar]")}
      measure="whole"
    >
      <div
        ref={box}
        className="not-kg-prose max-w-[26rem] rounded-lg bg-white p-3 font-sans text-[1.3rem] text-black shadow-lg dark:bg-grey-950 dark:text-white forced-colors:border forced-colors:border-[ButtonText]"
        data-kg-style-menu
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).tagName !== "INPUT") event.preventDefault();
        }}
      >
        <ColorControl
          keepFocus
          label={label}
          setting={setting}
          slot={slot}
          value={value}
          onChange={(next) => onPick(next)}
        />
      </div>
    </AnchoredMenu>
  );
};

export default ColorMenu;
