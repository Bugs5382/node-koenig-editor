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
import type { KoenigColorSetting, KoenigColorSlot, KoenigColorSwatch } from "node-koenig-editor";

// One colour model for every colour setting in the editor (text colour, highlight, the callout,
// Button and Header cards, table bands). Each slot has its own base palette; a host replaces a
// palette, switches the free colour picker off, or takes away the "no colour" choice, per slot.

/** A slot's setting once the host's choices are laid over the defaults. */
export interface ResolvedColorSetting {
  /** True when the person may go back to the editor's own colour. */
  none: boolean;
  palette: readonly KoenigColorSwatch[];
  /** True when the person may pick any colour. */
  picker: boolean;
}

export type KoenigColors = Partial<Record<KoenigColorSlot, KoenigColorSetting>>;

const swatches = (list: Array<[string, string]>): KoenigColorSwatch[] =>
  list.map(([label, value]) => ({ label, value }));

const SOFT = swatches([
  ["Grey", "#E3E8EC"],
  ["Blue", "#D6EAF8"],
  ["Green", "#D4EFDF"],
  ["Yellow", "#FFF3B0"],
  ["Red", "#FADBD8"],
  ["Pink", "#F9DDEB"],
  ["Purple", "#E8DAEF"],
]);

const INK = swatches([
  ["Black", "#15171A"],
  ["White", "#FFFFFF"],
  ["Grey", "#7C8B9A"],
  ["Blue", "#3B82F6"],
  ["Green", "#2E8B57"],
  ["Red", "#D64545"],
]);

const BOLD = swatches([
  ["Black", "#15171A"],
  ["Blue", "#3B82F6"],
  ["Green", "#2E8B57"],
  ["Red", "#D64545"],
  ["Purple", "#9B59B6"],
  ["Orange", "#C26A00"],
]);

/** The palette each slot starts with. */
export const DEFAULT_PALETTES: Record<KoenigColorSlot, readonly KoenigColorSwatch[]> = {
  buttonBackground: BOLD,
  buttonText: INK,
  calloutBackground: SOFT,
  calloutText: INK,
  headerBackground: BOLD,
  headerButton: BOLD,
  headerButtonText: INK,
  headerText: INK,
  highlight: swatches([
    ["Yellow", "#FFF3B0"],
    ["Green", "#D4EFDF"],
    ["Blue", "#D6EAF8"],
    ["Pink", "#FADBD8"],
    ["Purple", "#E8DAEF"],
    ["Orange", "#FDEBD0"],
  ]),
  tableBand: SOFT,
  tableBrand: BOLD,
  textColor: swatches([
    ["Red", "#D64545"],
    ["Orange", "#C26A00"],
    ["Green", "#2E8B57"],
    ["Blue", "#3B82F6"],
    ["Purple", "#9B59B6"],
    ["Grey", "#7C8B9A"],
  ]),
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
// A CSS variable and nothing more: letters, digits and hyphens after `--`, no fallback, no other
// CSS, so a stored value can never carry anything but a colour the host defined.
const CSS_VARIABLE = /^var\(--[a-z0-9]+(?:-[a-z0-9]+)*\)$/i;

/** True for a #rgb or #rrggbb colour. */
export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX.test(value);

/** A hex colour, or a plain CSS variable (`var(--name)`) the host defines. */
export const isColorValue = (value: unknown): value is string =>
  typeof value === "string" && (HEX.test(value) || CSS_VARIABLE.test(value));

/** `#abc` becomes `#aabbcc`, anything else is lower-cased; used to compare colours. */
export const normalizeColor = (value: string): string => {
  const lower = value.trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(lower)
    ? `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`
    : lower;
};

export const sameColor = (a: null | string | undefined, b: null | string | undefined): boolean =>
  !!a && !!b && normalizeColor(a) === normalizeColor(b);

/** A slot's setting: the host's choices over the defaults. A host palette that is empty or holds
 *  no valid colour falls back to the default one. */
export const resolveColorSetting = (
  slot: KoenigColorSlot,
  colors?: KoenigColors | null,
): ResolvedColorSetting => {
  const host = colors?.[slot];
  const valid = (host?.palette ?? [])
    .filter((swatch) => isColorValue(swatch?.value))
    .map((swatch) => {
      const { ink, ...rest } = swatch;
      return isColorValue(ink) ? { ...rest, ink } : rest;
    });
  return {
    none: host?.none !== false,
    palette: valid.length ? valid : DEFAULT_PALETTES[slot],
    picker: host?.picker !== false,
  };
};

/** True when the host's setting lets this value through: any colour with the picker on, otherwise
 *  only a palette colour. `null` (the editor's own colour) needs `none`. */
export const isColorAllowed = (
  setting: ResolvedColorSetting,
  value: null | string | undefined,
): boolean => {
  if (!value) return setting.none;
  if (!isColorValue(value)) return false;
  return setting.picker || setting.palette.some((swatch) => sameColor(swatch.value, value));
};

/** The palette swatch that matches `value`, if any. */
export const swatchFor = (setting: ResolvedColorSetting, value: null | string | undefined) =>
  setting.palette.find((swatch) => sameColor(swatch.value, value));

/** True when every swatch carries its own text colour, so the slot is a pair control. */
export const isPairPalette = (setting: ResolvedColorSetting): boolean =>
  setting.palette.length > 0 && setting.palette.every((swatch) => isColorValue(swatch.ink));

/** The label of the palette colour that matches `value`, if any. */
export const colorLabel = (setting: ResolvedColorSetting, value: null | string | undefined) =>
  setting.palette.find((swatch) => sameColor(swatch.value, value))?.label ?? value ?? null;
