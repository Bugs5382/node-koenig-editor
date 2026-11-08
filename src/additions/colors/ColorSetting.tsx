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
import type { FC } from "react";

import { ColorControl, useColorSetting } from "./ColorControl";
import { isColorValue } from "./colors";

interface ColorSettingProps {
  dataTestId?: string;
  label: string;
  /** Called with a hex colour, or null for the card's own colour. */
  onChange: (value: null | string) => void;
  slot: KoenigColorSlot;
  value: null | string | undefined;
}

// A labelled colour row for a card's settings panel: the shared colour control for one slot.
export const ColorSetting: FC<ColorSettingProps> = ({
  dataTestId,
  label,
  onChange,
  slot,
  value,
}) => {
  const setting = useColorSetting(slot);
  return (
    <div className="flex w-full flex-col gap-2 text-[1.3rem]" data-testid={dataTestId}>
      <div className="text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">
        {label}
      </div>
      <ColorControl
        label={label}
        setting={setting}
        slot={slot}
        value={isColorValue(value) ? value : null}
        onChange={onChange}
      />
    </div>
  );
};

export default ColorSetting;
