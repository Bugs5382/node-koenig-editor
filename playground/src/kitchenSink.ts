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
// A document that shows every card the package has, for the "Load the kitchen sink" button. It is
// saved-state JSON, like seed.ts, so it needs no editor instance. Cards the package lacks, or that
// are switched off, are left out: a document holding a node the composer was built without would
// not load.
import { galleryNode, headerNode, imageNode, SAMPLES, type CardNode } from "./seed";

/** The cards of a build that does not list its own. */
export const KITCHEN_SINK_FALLBACK = [
  "image",
  "gallery",
  "header",
  "divider",
  "callout",
  "toggle",
  "table",
];

const base = (import.meta.env.BASE_URL as string) ?? "/";
export const SAMPLE_SOUND = `${base}media/sample-tone.wav`;
export const SAMPLE_FILE = `${base}media/sample-notes.txt`;
export const SAMPLE_FILE_BYTES = 229; // the size of public/media/sample-notes.txt (a test checks)

const wrap = (
  type: string,
  children: CardNode[],
  extra: Record<string, unknown> = {},
): CardNode => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const text = (value: string, format = 0): CardNode => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const paragraph = (...parts: (string | CardNode)[]): CardNode =>
  wrap(
    "paragraph",
    parts.map((p) => (typeof p === "string" ? text(p) : p)),
  );

const heading = (tag: string, value: string): CardNode => wrap("heading", [text(value)], { tag });

const bulletList = (...items: string[]): CardNode =>
  wrap(
    "list",
    items.map((item, index) => wrap("listitem", [text(item)], { value: index + 1 })),
    { listType: "bullet", start: 1, tag: "ul" },
  );

const cell = (value: string, header: boolean): CardNode =>
  wrap("tablecell", [paragraph(value)], {
    backgroundColor: null,
    colSpan: 1,
    headerState: header ? 1 : 0,
    rowSpan: 1,
  });

const table = (rows: string[][]): CardNode =>
  wrap(
    "table",
    rows.map((row, r) =>
      wrap(
        "tablerow",
        row.map((value) => cell(value, r === 0)),
      ),
    ),
  );

// The twelve cards, each as saved data, keyed by the card name the composer's `cards` option uses.
const CARD_NODES: Record<string, () => CardNode[]> = {
  header: () => [headerNode(SAMPLES[SAMPLES.length - 1]!)],
  image: () => [imageNode(SAMPLES[1]!)],
  gallery: () => [galleryNode(SAMPLES.slice(0, 6))],
  callout: () => [
    {
      type: "callout",
      version: 1,
      calloutText: "A callout makes a note, a tip or a warning stand out.",
      calloutEmoji: "\u{1F4A1}",
      backgroundColor: "blue",
    },
  ],
  toggle: () => [
    {
      type: "toggle",
      version: 1,
      heading: "What is a toggle?",
      content: "Text that stays hidden until the reader opens it.",
    },
  ],
  divider: () => [{ type: "horizontalrule", version: 1 }],
  table: () => [
    table([
      ["Card", "Add it with"],
      ["Gallery", "/gallery"],
      ["Table", "/table"],
    ]),
  ],
  file: () => [
    {
      type: "file",
      version: 1,
      src: SAMPLE_FILE,
      fileTitle: "Sample notes",
      fileCaption: "A small text file kept with the demo",
      fileName: "sample-notes.txt",
      fileSize: SAMPLE_FILE_BYTES,
    },
  ],
  // No video file is bundled, so this card opens as its empty state, ready for a drop or an upload.
  video: () => [{ type: "video", version: 1, src: "" }],
  audio: () => [
    {
      type: "audio",
      version: 1,
      src: SAMPLE_SOUND,
      title: "A one second tone",
      transcript: "A single steady tone, one and a half seconds long. There are no words.",
      fileName: "sample-tone.wav",
      mimeType: "audio/wav",
      duration: 1.5,
    },
  ],
  button: () => [
    {
      type: "button",
      version: 1,
      buttonText: "Read the cards guide",
      buttonUrl: "https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/cards.md",
      alignment: "center",
    },
  ],
  markdown: () => [
    {
      type: "markdown",
      version: 1,
      markdown:
        "## Markdown card\n\nWritten in **Markdown**, shown as formatted text.\n\n- one\n- two",
    },
  ],
};

// The order they appear in: pictures first, then text-like cards, then files and links.
const ORDER = [
  "header",
  "image",
  "gallery",
  "callout",
  "toggle",
  "divider",
  "table",
  "markdown",
  "button",
  "file",
  "audio",
  "video",
];

/** The kitchen sink as saved-state JSON. `available` is what the package has, `enabled` what is on. */
export function kitchenSink(
  available: readonly string[],
  enabled: readonly string[] | null,
): string {
  const has = available.length ? available : KITCHEN_SINK_FALLBACK;
  const on = (card: string) => has.includes(card) && (!enabled || enabled.includes(card));

  const children: CardNode[] = [
    heading("h1", "Kitchen sink"),
    paragraph(
      "Every card in one document, with plain writing around them: ",
      { ...text("bold", 1) },
      ", ",
      { ...text("italic", 2) },
      " and a list.",
    ),
    bulletList("Headings from H1 to H5", "Bold and italic", "Lists and quotes"),
    wrap("quote", [text("A quote is for words that are not yours.")]),
  ];
  for (const card of ORDER) {
    if (!on(card)) continue;
    children.push(heading("h2", card[0]!.toUpperCase() + card.slice(1)), ...CARD_NODES[card]!());
  }
  children.push(paragraph("That is every card."));

  return JSON.stringify({
    root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
  });
}
