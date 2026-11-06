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
// The demo's settings: what the checkboxes hold, how they travel in the page address, and the
// code snippet that matches them. No React in here, so it is unit tested on its own.

export const SIZES = [12, 14, 16, 18, 20] as const;
const DEFAULT_SIZE = 16;

/** The swatches offered for the selection colour. */
export const SELECTION_COLORS = [
  { label: "Blue", value: "#2f80ed" },
  { label: "Green", value: "#27ae60" },
  { label: "Pink", value: "#e0457b" },
  { label: "Orange", value: "#f2994a" },
  { label: "Purple", value: "#9b51e0" },
  { label: "Teal", value: "#14a3a3" },
] as const;

/** Card sets to try without ticking each box. A preset only lists cards the package has. Every
 *  preset keeps the divider: a composer built without it fails to start. */
export const PRESETS = [
  { id: "all", label: "All cards", cards: null },
  { id: "text", label: "Text and structure", cards: ["callout", "divider", "toggle", "table"] },
  { id: "media", label: "Pictures", cards: ["image", "gallery", "header", "divider"] },
  { id: "minimal", label: "Divider only", cards: ["divider"] },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

/** The cards a preset turns on, in the package's order. */
export function applyPreset(id: PresetId, catalog: Catalog): string[] {
  const preset = PRESETS.find((p) => p.id === id);
  const wanted: readonly string[] | null = preset?.cards ?? null;
  return catalog.cards.filter((card) => !wanted || wanted.includes(card));
}

/** The preset whose cards are exactly `cards` (as a list in the package's order), or "custom". */
export function presetOf(cards: readonly string[], catalog: Catalog): PresetId | "custom" {
  const same = PRESETS.find((p) => sameList(applyPreset(p.id, catalog), cards));
  return same ? same.id : "custom";
}

/** What the package under test offers. Tools and the word count exist only in newer builds. */
export interface Catalog {
  cards: readonly string[];
  tools: readonly string[];
  wordCount?: boolean;
}

export interface Settings {
  cards: string[];
  tools: string[];
  toolbarActions: boolean;
  comments: boolean;
  wordCount: boolean;
  readOnly: boolean;
  dark: boolean;
  sampleUploads: boolean;
  /** A colour from SELECTION_COLORS for the editor's text selection; empty keeps the editor's own. */
  selection: string;
  size: number;
}

export function defaultSettings(catalog: Catalog): Settings {
  return {
    cards: [...catalog.cards],
    tools: [...catalog.tools],
    toolbarActions: true,
    comments: true,
    wordCount: true,
    readOnly: false,
    dark: false,
    sampleUploads: true,
    selection: "",
    size: DEFAULT_SIZE,
  };
}

const FLAGS = [
  "toolbarActions",
  "comments",
  "wordCount",
  "readOnly",
  "dark",
  "sampleUploads",
] as const;

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Keeps only names the package knows, in the package's order, so a stale link cannot break the page.
const pickKnown = (value: string, known: readonly string[]) => {
  const wanted = new Set(value.split(",").filter(Boolean));
  return known.filter((name) => wanted.has(name));
};

/** Reads a query string (with or without the leading "?"). Anything missing or invalid is the default. */
export function parseSettings(search: string, catalog: Catalog): Settings {
  const params = new URLSearchParams(search);
  const settings = defaultSettings(catalog);

  const cards = params.get("cards");
  if (cards !== null) settings.cards = pickKnown(cards, catalog.cards);
  const tools = params.get("tools");
  if (tools !== null) settings.tools = pickKnown(tools, catalog.tools);

  for (const flag of FLAGS) {
    const value = params.get(flag);
    if (value === "1") settings[flag] = true;
    else if (value === "0") settings[flag] = false;
  }

  const selection = params.get("selection");
  const color = SELECTION_COLORS.find((c) => c.value.slice(1) === selection?.toLowerCase());
  if (color) settings.selection = color.value;

  const size = Number(params.get("size"));
  if ((SIZES as readonly number[]).includes(size)) settings.size = size;
  return settings;
}

/** The query string for a shareable link: only what differs from the defaults, so a plain page has none. */
export function serializeSettings(settings: Settings, catalog: Catalog): string {
  const defaults = defaultSettings(catalog);
  const params = new URLSearchParams();
  if (!sameList(settings.cards, defaults.cards)) params.set("cards", settings.cards.join(","));
  if (!sameList(settings.tools, defaults.tools)) params.set("tools", settings.tools.join(","));
  for (const flag of FLAGS) {
    if (settings[flag] !== defaults[flag]) params.set(flag, settings[flag] ? "1" : "0");
  }
  if (settings.selection !== defaults.selection)
    params.set("selection", settings.selection.slice(1));
  if (settings.size !== defaults.size) params.set("size", String(settings.size));
  // Commas stay readable in the address bar.
  return params.toString().replaceAll("%2C", ",");
}

const list = (names: readonly string[]) => `[${names.map((n) => JSON.stringify(n)).join(", ")}]`;

/** The host component that does what the checkboxes currently do. */
export function buildSnippet(settings: Settings, catalog: Catalog): string {
  const props: string[] = [];
  if (!sameList(settings.cards, catalog.cards)) props.push(`cards={${list(settings.cards)}}`);
  if (catalog.tools.length && !sameList(settings.tools, catalog.tools)) {
    props.push(`tools={${list(settings.tools)}}`);
  }
  if (settings.toolbarActions) props.push("toolbarActions={toolbarActions}");
  if (settings.comments) props.push("comments={comments}");
  if (settings.readOnly) props.push("editable={false}");
  props.push("fileUploader={fileUploader}");

  const imports = ["KoenigComposer", "KoenigEditor"];
  if (catalog.wordCount && settings.wordCount) imports.push("useKoenigWordCount");

  const lines = [
    'import "node-koenig-editor/styles.css";',
    `import { ${imports.join(", ")} } from "node-koenig-editor";`,
    "",
    "export function MyEditor() {",
    "  return (",
    "    <KoenigComposer",
    ...props.map((p) => `      ${p}`),
    "    >",
    settings.readOnly ? "      <KoenigEditor readOnly />" : "      <KoenigEditor />",
  ];
  if (catalog.wordCount && settings.wordCount) {
    lines.push("      <WordCount /> {/* calls useKoenigWordCount() inside the composer */}");
  }
  lines.push("    </KoenigComposer>", "  );", "}");
  return lines.join("\n");
}
