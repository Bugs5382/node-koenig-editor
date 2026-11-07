# node-koenig-editor 🧩

> 🧭 Ghost's Koenig editor on Lexical 0.52 and React 19, packaged for reuse, with optional Yjs collaboration.

Koenig is the rich text editor behind Ghost. This package is a build of it on your own Lexical,
React and Yjs, with Lexical's stock table nodes added. It is a configurable base: each host app
builds its own editor component on top of it and turns on only what it needs (the cards, the
menu entries, the toolbar buttons, the wording, the theme), and adds its own nodes. 🔌 **The host
owns the transport:** collaboration is a provider factory you pass in, and without one the
editor works alone.

## ✨ Highlights

- 🧱 **Pick your cards** — image, gallery, header, file, video, audio, button, markdown, divider, callout, toggle, toggle group and table, on by default, off one by one.
- 🧩 **Bring your own nodes** — register custom nodes and cards, and add your own "+" and slash menu entries.
- 🗣️ **Your wording** — every label, placeholder and menu text comes from a `strings` option with English defaults.
- 🖼️ **Crop, rotate and emoji, offline** — an image editor before upload and an emoji picker, both switchable with `tools`.
- 👀 **Preview the reader's view** — a toggle that shows the same live document as a reader sees it, at desktop, tablet or phone width, light or dark.
- 🎛️ **Your toolbar** — show only the format buttons you want.
- 🎨 **Theme with tokens** — CSS custom properties with documented defaults; no class overrides needed.
- 💬 **Inline comments** — threads anchored on any selected text, kept in the document, with events for your own storage.
- 🤝 **Optional collaboration** — a Yjs provider factory per document, remote carets included.
- 📄 **Plain Lexical documents** — stock node names (`text`, `heading`, `table`), readable by any Lexical consumer.
- 🪶 **Peers stay yours** — Lexical, `@lexical/*`, React and Yjs are peer dependencies, never bundled.

## 📚 Guides

- [The default cards on one page](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/cards.md):
  what each card and tool is for, how to add it, its limits, keyboard use, accessibility notes and
  how a host switches it off or replaces it. The playground shows the same page under its Guide tab, with a Try it link under each card.

## 📦 Install

```bash
npm install node-koenig-editor lexical@^0.52.0 @lexical/clipboard@^0.52.0 @lexical/code@^0.52.0 @lexical/html@^0.52.0 @lexical/link@^0.52.0 @lexical/list@^0.52.0 @lexical/mark@^0.52.0 @lexical/markdown@^0.52.0 @lexical/react@^0.52.0 @lexical/rich-text@^0.52.0 @lexical/selection@^0.52.0 @lexical/table@^0.52.0 @lexical/text@^0.52.0 @lexical/utils@^0.52.0 @lexical/yjs@^0.52.0 react@^19.3.0 react-dom@^19.3.0 yjs@^13.6.31
```

Lexical and `@lexical/*` must be 0.52.x (the peer range is `^0.52.0`), React 19.3 or later
and Yjs 13.6.31 or later. The package is ESM only and ships one stylesheet. It runs in the browser; importing it on the
server is safe, but render the editor on the client.

## 🚀 Use

```tsx
import "node-koenig-editor/styles.css";
import { KoenigComposer, KoenigEditor, type FileUploader } from "node-koenig-editor";

const uploader: FileUploader = {
  useFileUpload: () => ({
    errors: [],
    isLoading: false,
    progress: 0,
    upload: async (files) => [...files].map((file) => ({ fileName: file.name, url: "" })),
  }),
};

export function Editor({ json, save }: { json?: string; save: (state: unknown) => void }) {
  return (
    <KoenigComposer fileUploader={uploader} initialEditorState={json}>
      <KoenigEditor onChange={(state) => save(state)} />
    </KoenigComposer>
  );
}
```

`onChange` hands you the Lexical serialized editor state. Store it as JSON and pass it back as
`initialEditorState` next time. Consumers type-check against the hand-written `index.d.ts`, not
the sources.

## 🎛️ Options

`KoenigComposer` takes the options; every editor under it, nested ones included, follows them.

| Prop                 | Type                                                   | Default               | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards`              | `KoenigCardName[]`                                     | all                   | The shipped cards to register: `image`, `gallery`, `header`, `file`, `video`, `audio`, `button`, `markdown`, `divider`, `callout`, `toggle`, `toggleGroup`, `table`. A card left out is not registered, so it is missing from the menus and its commands do nothing.                                                                                                                                                                           |
| `cardRenderers`      | `KoenigCardRenderers`                                  | none                  | Your own layout for the `gallery` and `header` cards; see [Gallery and header cards](#-gallery-and-header-cards).                                                                                                                                                                                                                                                                                                                              |
| `gallery`            | `{ maxImages?: number }`                               | `{ maxImages: 50 }`   | Options for the gallery card. `maxImages` is the most photos a gallery takes, and the ceiling for each gallery's own setting. It limits adding photos, never cuts off photos a document already has.                                                                                                                                                                                                                                           |
| `customNodes`        | `EditorNodes`                                          | none                  | Your own node classes, registered after the shipped ones. A node with a static `kgMenu` (a `CardMenuItem` or a list) is listed in the menus.                                                                                                                                                                                                                                                                                                   |
| `comments`           | `KoenigCommentsOptions`                                | off                   | Turns on inline comment threads; see [Inline comments](#-inline-comments).                                                                                                                                                                                                                                                                                                                                                                     |
| `menuItems`          | `CardMenuItem[]`                                       | none                  | Extra "+" and slash menu entries. Each dispatches its `insertCommand` with `insertParams`; your plugin handles it.                                                                                                                                                                                                                                                                                                                             |
| `strings`            | `KoenigStringsInput`                                   | English               | Your wording, laid over `DEFAULT_STRINGS`. Pass only what you change.                                                                                                                                                                                                                                                                                                                                                                          |
| `toolbar`            | `KoenigToolbarItem[]`                                  | all                   | The format buttons to show: `bold`, `italic`, `underline`, `strikethrough`, `subscript`, `superscript`, `code`, `fontSize`, `textColor`, `highlight`, `fontFamily`, `clearFormatting`, `bulletList`, `numberList`, `checkList`, `indent`, `outdent`, `lineSpacing`, `paragraphSpacing`, `textDirection`, `heading1` to `heading5` (headings stop at H5), `quote`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `link`, `snippet`. |
| `colors`             | `Partial<Record<KoenigColorSlot, KoenigColorSetting>>` | the editor's palettes | Per colour slot: a `palette` of swatches, `picker: false` to switch the colour wheel off, `none: false` to take away the editor's own colour. See [Colours](#-colours).                                                                                                                                                                                                                                                                        |
| `fileIcons`          | `false \| { overrides? }`                              | on                    | The file card's type icons; `false` switches them off, `overrides` maps an extension to your own icon component; see [File, video and audio cards](#-file-video-and-audio-cards).                                                                                                                                                                                                                                                              |
| `codeLanguages`      | `KoenigCodeLanguage[]`                                 | highlighter's         | The languages the code block's list offers, each a `label` and a Prism language `value`; see [Code blocks](#-code-blocks).                                                                                                                                                                                                                                                                                                                     |
| `fonts`              | `KoenigFont[]`                                         | none                  | The fonts the font button offers, each a `label` and a CSS `font-family` `value`; with none the button is not shown.                                                                                                                                                                                                                                                                                                                           |
| `toolbarRows`        | `1 \| 2`                                               | `2`                   | The rows the selection toolbar uses; see [Toolbar actions](#-toolbar-actions).                                                                                                                                                                                                                                                                                                                                                                 |
| `toolbarActions`     | `KoenigToolbarAction[]`                                | none                  | Your own buttons and cards on the selection toolbar; see [Toolbar actions](#-toolbar-actions).                                                                                                                                                                                                                                                                                                                                                 |
| `tools`              | `KoenigTool[]`                                         | all                   | The features that are not cards: `imageEditor`, `emojiPicker`, `preview`, `shortcuts`, `findReplace` and `cleanPaste`. Pass a list to keep only those; see [Image editor and emoji picker](#-image-editor-and-emoji-picker) and [Preview](#-preview).                                                                                                                                                                                          |
| `spellCheck`, `lang` | `boolean`, `string`                                    | on, none              | `spellCheck={false}` switches the browser's spell check off in the editing area; `lang` names the language of the text for it.                                                                                                                                                                                                                                                                                                                 |
| `collaboration`      | `KoenigCollaboration \| null`                          | `null`                | The Yjs provider factory. Without it the editor works alone and asks for no provider.                                                                                                                                                                                                                                                                                                                                                          |
| `nodes`              | `EditorNodes`                                          | `DEFAULT_NODES`       | The base node set the `cards` choice filters. `BASIC_NODES` and `MINIMAL_NODES` are smaller sets.                                                                                                                                                                                                                                                                                                                                              |
| `initialEditorState` | `string \| SerializedEditorState`                      | empty                 | The document to open. In a collaborative session it seeds the room only while the room is empty.                                                                                                                                                                                                                                                                                                                                               |
| `fileUploader`       | `Partial<FileUploader>`                                | none                  | The upload hook cards call as `useFileUpload("image")`, and the accepted file types. Without it the editor and its cards still work, and an upload attempt fails and logs why.                                                                                                                                                                                                                                                                 |
| `cardConfig`         | `Record<string, unknown>`                              | `{}`                  | Card settings, for example `createSnippet` and `snippets` to turn on snippets.                                                                                                                                                                                                                                                                                                                                                                 |
| `darkMode`           | `boolean`                                              | `false`               | Use the dark card styles.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `editable`           | `boolean`                                              | `true`                | Start editable or read-only.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `onError`            | `(error: Error) => void`                               | `console.error`       | Called with errors Lexical catches during updates.                                                                                                                                                                                                                                                                                                                                                                                             |

`KoenigEditor` takes the per-editor props:

| Prop                                              | Type             | What it does                                                                      |
| ------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `onChange`                                        | `(json) => void` | The whole document after every change.                                            |
| `registerAPI`                                     | `(api) => void`  | Hands you `editorInstance`, `serialize()`, `editorIsEmpty()` and `focusEditor()`. |
| `placeholderText`                                 | `string`         | This editor's placeholder; otherwise `strings.placeholder`.                       |
| `readOnly`                                        | `boolean`        | Show the document without editing.                                                |
| `hiddenFormats`                                   | `string[]`       | Upstream's way to hide the bold button; prefer the composer's `toolbar`.          |
| `isDragEnabled`, `isSnippetsEnabled`              | `boolean`        | Card drag to reorder, and the snippet toolbar.                                    |
| `className`, `placeholderClassName`, `dataTestId` | `string`         | Styling and test hooks.                                                           |
| `onFocus`, `onBlur`                               | `() => void`     | Focus events.                                                                     |

### Wording

`DEFAULT_STRINGS` holds every piece of text the editor shows, grouped as `placeholder`,
`nestedPlaceholder`, `errorFallback` (the message a failed card shows; `{card}` is replaced with the card's name), `cards` (each card's menu `label` and `desc`), `menu`, `toolbar`, `table` (the table card's controls), `card`
(card toolbar buttons), `link`, `image`, `button`, `markdown`, `wordCount`, `file`, `video`, `audio`, `callout`, `toggle`, `snippet`, `imageEditor` and `emojiPicker`. Plug your i18n in by
building the `strings` object from your translations. Your own cards read the wording in effect
with `useKoenigStrings()`.

### Exports

`KoenigComposer`, `KoenigEditor`, `KoenigComposableEditor`, `AllDefaultPlugins`, `TablePlugin`,
`TABLE_MENU_ITEM`, `DEFAULT_NODES`, `BASIC_NODES`, `MINIMAL_NODES`, `KOENIG_CARD_NAMES`,
`KOENIG_TOOLBAR_ITEMS`, `DEFAULT_STRINGS`, `KoenigStringsContext`, `useKoenigStrings`,
`isSafeUrl`, `toSafeUrl`, `renderMarkdown` and the word count functions
(`useKoenigWordCount`, `getWordCount`, `countWords`, `getReadingTime`), plus the types in
`index.d.ts`.

## 🧱 A complete host component

A generic wrapper that picks three cards, adds one custom node with its own menu entry, sets the
wording and the theme tokens, and wires collaboration when the host passes it in:

```tsx
import "node-koenig-editor/styles.css";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  DecoratorNode,
  type NodeKey,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import {
  type CardMenuItem,
  type FileUploader,
  type KoenigCollaboration,
  KoenigComposer,
  KoenigEditor,
  type KoenigStringsInput,
} from "node-koenig-editor";
import { type CSSProperties, type JSX, useEffect, useMemo, useRef } from "react";

const INSERT_NOTE_COMMAND = createCommand<unknown>("INSERT_NOTE_COMMAND");

/** The host's own card: a note block with a "+" and slash menu entry. */
class NoteNode extends DecoratorNode<JSX.Element> {
  static kgMenu: CardMenuItem = {
    desc: "A highlighted note",
    insertCommand: INSERT_NOTE_COMMAND,
    label: "Note",
    matches: ["note"],
  };

  static override getType(): string {
    return "note";
  }

  static override clone(node: NoteNode): NoteNode {
    return new NoteNode(node.__key);
  }

  static override importJSON(): NoteNode {
    return new NoteNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  override createDOM(): HTMLElement {
    return document.createElement("div");
  }

  override updateDOM(): false {
    return false;
  }

  override exportJSON(): SerializedLexicalNode {
    return { type: "note", version: 1 };
  }

  override decorate(): JSX.Element {
    return <aside className="my-note">Note</aside>;
  }
}

/** Handles the menu entry's command. */
function NotePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        INSERT_NOTE_COMMAND,
        () => {
          $insertNodes([new NoteNode()]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );
  return null;
}

const STRINGS: KoenigStringsInput = {
  cards: { image: { desc: "Upload a picture", label: "Picture" } },
  placeholder: "Start your note...",
  toolbar: { italic: "Italic" },
};

// The box is also the positioning context remote carets are drawn against.
const THEME = {
  "--kg-accent-color": "#2563eb",
  "--kg-color-grey-900": "#1f2937",
  "--kg-font-serif": "Georgia, serif",
  position: "relative",
} as CSSProperties;

export interface MyEditorProps {
  collaboration?: KoenigCollaboration | null;
  initialState?: string;
  onChange?: (state: SerializedEditorState) => void;
  uploader: FileUploader;
}

export function MyEditor({
  collaboration = null,
  initialState,
  onChange,
  uploader,
}: MyEditorProps) {
  const cursors = useRef<HTMLDivElement | null>(null);
  const collab = useMemo(
    () => (collaboration ? { ...collaboration, cursorsContainerRef: cursors } : null),
    [collaboration],
  );
  return (
    <div ref={cursors} style={THEME}>
      <KoenigComposer
        cards={["image", "divider", "callout"]}
        collaboration={collab}
        customNodes={[NoteNode]}
        fileUploader={uploader}
        initialEditorState={initialState}
        strings={STRINGS}
        toolbar={["bold", "italic", "heading2", "link"]}
      >
        <KoenigEditor onChange={onChange} />
        <NotePlugin />
      </KoenigComposer>
    </div>
  );
}
```

## 🧰 Toolbar actions

`toolbarActions` adds your own buttons to the toolbar that appears over selected text, after
Bold, Italic, the headings, Quote and Link. A button either runs a function or opens a card
under the toolbar. This is how a host adds, for example, a card that marks the selection as a note.

```tsx
const actions: KoenigToolbarAction[] = [
  {
    id: "highlight-note",
    label: "Highlight note",
    Icon: NoteIcon, // optional; the first letters of the label show otherwise
    Card: ({ text, replaceSelection, close }) => (
      <NoteCard text={text} onAccept={(note) => replaceSelection(note)} onCancel={close} />
    ),
  },
];

<KoenigComposer toolbarActions={actions} />;
```

The card gets the selected `text`, `replaceSelection(text)`, `close()` and the `editor`.
`replaceSelection` puts the text in place of what was selected when the button was pressed, even
after focus has moved into your card or the answer arrives later. It returns `false` and changes
nothing when that text has been edited or removed in the meantime. Set `hidden: true` to leave
a button out for the person using it (permissions, a feature switch). An action with no `Card`
calls `onSelect` with the same object. The button's `data-kg-toolbar-button` value is its `id`.

### Rows and where a button goes

The toolbar has two rows: the text formats and styles on the first (Bold to Clear formatting),
blocks, lists, spacing, alignment and Link on the second. Pass `toolbarRows={1}` for a single row
that wraps where the window is narrow. An action chooses its place with two optional fields:

- `row`: the row, counted from 1. Without it the button ends the last built-in row. A number past
  the built-in rows adds a row of your own.
- `after`: a built-in button's name (`"italic"`, `"heading2"`, `"link"`, any value of the `toolbar`
  option) or another action's `id`. The button goes right after it, in that button's row. A name
  that is not known is ignored and `row` decides.

```tsx
const actions: KoenigToolbarAction[] = [
  { id: "note", label: "Note", after: "highlight" }, // first row, next to Highlight
  { id: "cite", label: "Cite", row: 2 }, // end of the second row
  { id: "ai", label: "Rewrite", row: 3 }, // a third row
];
```

## 📋 Tables

The `table` card (on by default, `cards` to leave it out) inserts a 3 by 3 table with a header
row from the "+" and slash menus. While the cursor is in a table, a toolbar above it (and a
right-click menu with the same actions) edits it:

- **Row** and **Column**: insert above, below, left or right; move; delete; switch the header row or
  header column; select the whole row or column.
- **Cell**: merge a selected range, split a merged cell, select the whole table.
- **Colour**: shade the cell, or every cell of a selected range, row, column or table, from a fixed
  palette of eight (or no shading). The text in a shaded cell is always dark, so it reads in light
  and dark. Colours are saved on the cell as real colours, not the editor's own variables, so they
  show on a reader's page.
- **Align**: left, center, right or justify, and top, middle or bottom, for the cell or the selected
  range. The selection toolbar offers the same for text selected in a cell, applied to this cell, the
  row, the column or the table.
- **Width**: automatic, narrow, medium or wide for the cell's column.
- **Size**: the width of the cursor's column and the height of its row in pixels (never narrower than
  40 or shorter than 24), how wide the table is (fill the column, fit its content, or the total of its
  columns), and a button that makes the columns equal again. You can also drag the right border of a
  column or the bottom border of a row (a tip shows the size), double-click a column border to fit the
  column to its text, or select a row or column and press **Alt** with the arrow keys (10 pixels, 40
  with Shift). Column widths are saved as shares of the whole table and row heights as minimum
  heights, so the table looks the same in Preview, in print and in the saved HTML; a table wider than
  its column scrolls sideways inside its own box.
- **Borders**: none, solid, dashed or dotted lines, thin, medium or thick, in a colour from the
  palette, on the outer lines, the inner lines or all lines of a cell, selected range, row, column or
  the whole table. A line two cells share is written on both. They are saved on the cell and written
  into the saved HTML, and "Remove borders" goes back to the table's default lines.
- **Style**: header row and header column switches (the header row is marked up as column headers
  and the header column as row headers), banded rows and banded columns (every second row or column
  in a band colour), and a brand colour on the header row and/or the first column. Each table has
  its own settings. The band and brand colours use the editor's shared colour control: a palette per
  slot, an optional colour wheel, and the host's choices through the composer's `colors` option
  (`colors.tableBand` and `colors.tableBrand`: `palette`, `picker: false` to limit the choice to the
  palette). The ink on each colour is chosen to read on it. The colours are written onto the cells in
  the saved HTML, and a cell you shaded yourself keeps its own colour.
- **Caption**: the figure entry (see below) for the table: a label such as "Table", an automatic
  number, a title, above or below. The text is the table's accessible name in the editor and a real
  `caption` element in the saved HTML.
- **Drag a row or column**: a grip at the left of the cursor's row and above its column moves it; a
  line shows where it will land. Move up, down, left and right in the menu do the same from the
  keyboard.
- Drag across cells, or use Shift with the arrow keys, to select a range; pasting text from a
  spreadsheet (tabs and line breaks) fills the cells from the cursor and adds the rows and columns it
  needs. A table in the pasted HTML is ignored, so one is never nested in a cell.
- The toolbar and menus show only while the editor is editable, so the reader's view (Preview) has
  none of them. A live region says the row and column of the cell the cursor moves to, and what a
  merged cell spans.

- Keyboard: Tab and Shift+Tab move between cells, the arrow keys move within and between them,
  and Alt+F10 moves focus to the table toolbar (Escape closes a menu, then returns to the cell). In
  a menu the arrow keys, Home and End move, Enter or Space picks and Escape closes.
- Markup: a real `table` with `th scope="col"` (or `scope="row"` for a header column) header cells
  and `td` body cells; the controls are buttons in a labelled `role="toolbar"` that open
  `role="menu"` lists. The wording is `strings.table`.
- Document: a table is stock `@lexical/table` nodes (merged cells, shading, vertical alignment and
  column widths are fields they already save; the cell's alignment is its format; the caption is
  node state on the table), so it saves and loads with the rest of the document, and a table saved
  by an earlier version loads unchanged. The saved HTML carries the merged cells, the shading (with
  dark ink), the alignment, the vertical alignment and the caption.

**How it looks.** A new table shows its grid: 1px cell borders that stay at least 3:1 against the
editor in light and dark (`--grey-700`), a header row that reads as one by its bold text (no
shade of its own), a minimum cell size so an empty table
is a visible grid, an outline on the cell the cursor is in, and a soft highlight on the cells of a
selected range. While the editor is editable the borders are **dashed**, so an empty grid reads as
a place to write; in the reader's view (Preview), in print, and wherever the editor is read-only
they are solid. In forced-colours mode the grid uses the system colours, with a heavier line under
the header. Set the tokens on any ancestor of the editor:

| Token                          | Default                 | What it does                                     |
| ------------------------------ | ----------------------- | ------------------------------------------------ |
| `--kg-table-border-color`      | `--grey-700`            | Cell border colour                               |
| `--kg-table-border-style`      | `solid`                 | Cell border style in the reader's view and print |
| `--kg-table-edit-border-style` | `dashed`                | Cell border style while the editor is editable   |
| `--kg-table-header-bg`         | none (transparent)      | Header row background                            |
| `--kg-table-selected-bg`       | selection colour at 14% | Background of the selected cells                 |

The table, its rows and cells carry the classes `kg-table`, `kg-table-row`, `kg-table-cell`,
`kg-table-cell-header` and `kg-table-cell-selected` for your own rules, and the cell the cursor is
in has `data-kg-active-cell`. The saved HTML is a plain `table`: to show it with the same look on
your own page, wrap it in an element with the class `koenig-lexical` (the stylesheet is scoped to
it), or copy the border and header rules from the tokens above.

### Figure label (tables, images and galleries)

One optional entry gives a table, an image card or a gallery card a **label**, an **automatic number**,
a **title** and a position, **above** or **below**: "Table 1: Quarterly totals". Numbers count the
figures with the same label in reading order and can be switched off per entry. On a table it is the
caption; on an image or gallery card it shows as a line next to the picture (select the card and use
"Figure label"). It is saved with the node, and in the saved HTML it becomes the table's `caption` or
the figure's `figcaption` (a card that already has an author caption keeps it, with the entry as its
own line before it). Its wording is `strings.figure`.

## 🖼️ Gallery and header cards

Both are in the default card set, so they are in the "+" and slash menus (`/gallery`, `/header`).
`cards` leaves either out, like any other card.

**Gallery.** Up to 50 images by default (`gallery.maxImages` on the composer changes the ceiling; each gallery can set a lower limit of its own, see below). Reorder by dragging. Without a mouse, select the card, focus a
photo (Tab) and press Alt with the left or right arrow key; a short announcement follows ("Image
2 of 5, moved before image 1"). The host's `fileUploader` is called once per image, so a progress
bar or a failure belongs to one picture. Files outside `fileUploader.fileTypes.image.mimeTypes`,
and images past the ninth, are refused with a message (`strings.gallery`) before the uploader is
called. A gallery has its own caption too.

_Full screen._ A button on the gallery, and one on each photo, opens a viewer that fills the
screen, for editors and for people reading the document. It is a modal dialog: focus stays in it,
Escape closes it and returns focus to the button, Left and Right (and swipe on a touch screen)
move between photos, Home and End jump to the first and last, a thumbnail strip jumps to any
photo, and the photo's title and caption show over the bottom with the same collapse control. It
fades only when the person has not asked for reduced motion. The photo's alt text is on the
image, not printed over it.

_Slideshow._ A selected gallery's settings panel also has **Auto-advance** with a seconds box (the
viewer goes to the next photo after that many seconds and starts over after the last; a Pause and
Play button and the Space key stop and start it, and a move by hand starts the wait again),
**Random order** (the strip and the counter keep the set order, the counter showing the photo's own
number; Next, Previous and the automatic advance follow one random pass in which every photo shows
once before any repeats, and a clicked thumbnail counts as shown; the button is disabled, with its
reason, while auto-advance is off) and **Screen mode** (no thumbnail strip; the controls hide after three seconds without
input, and a key, a tap or a mouse move brings them back; Escape shows them first and a second
Escape exits). The exit control of the normal viewer never hides. The settings are saved in the
card and written to the saved HTML as `data-kg-autoplay` (seconds), `data-kg-shuffle` and
`data-kg-screen-mode`, for a page that plays the gallery itself. A host switches any of them off
with `gallery={{ autoAdvance: false, shuffle: false, screenMode: false }}`; a switched-off setting
is not shown and a stored one does not play. A custom `cardRenderers.gallery` gets `slideshow`,
`setSlideshow` and `slideshowOptions`. The wording is `strings.gallery`.

_How many photos._ `gallery.maxImages` (default 50) is the host's ceiling. Select a gallery and its
settings panel has a "Maximum number of images" box for that gallery: at most the host's ceiling,
at least the number of photos already in it, and saved in the card, so the reader's view and the
HTML output (`data-kg-max-images`, never more photos than that) keep to it. The card shows "n of
max". Adding past the limit is refused with a message. A document that already has more photos
than the host's limit keeps them all: the limit is for adding. Many photos load lazily, and the
host's `fileUploader.upload` is called once per photo, up to three at a time, so a host's upload
hook must cope with overlapping calls.

_Title, caption and alt text._ Selecting a photo shows its icons: remove, and an icon that opens a
dialog for that photo's title, caption and alt text (its help text says how to move the photo; focus stays in the dialog, Escape closes it without saving,
Enter in the title saves). The text shows as an overlay along the bottom of the photo, on a solid
dark band so it reads on any picture. Each photo's overlay has a control that collapses it, and
the gallery has one control that collapses or expands them all. Collapsing hides the text from
the eye only: it stays in the page for screen readers (`aria-expanded` on the controls). The
choice is remembered in the viewer's own browser (`localStorage`, under `koenig-gallery-text`);
a photo's own choice wins over the gallery-wide one, and the gallery-wide control sets every
photo again. Where the browser's storage is blocked the choice lasts until the page closes. In
the HTML output the text is written under the photo, inside the photo's `.kg-gallery-image`
block (`.kg-gallery-image-text` with `.kg-gallery-image-title` and `.kg-gallery-image-caption`),
as plain text, and a print rule puts the on-screen overlay under the photo too, collapsed or not.
The wording is `strings.gallery`.

**Header.** A section opener: title, subtitle, a background colour or image, and an optional
button. Its settings are the background and text colours (the shared [colour control](#-colours)),
a background image, alignment (a left, centred or right choice, so there is no list to open) and the
button (a label of text, an emoji or both, with its own two colours); each label stays on one line. Its sizes are multiples of `--kg-rem` and its type uses `--kg-font-sans` and
`--kg-font-size-h1`, so it follows the [theme tokens](#-styles-and-theme-tokens). The title is
not a heading node: the H1 to H5 limit and any outline numbering a host builds from headings do
not see it. The background image goes through the host's `fileUploader`.

### Replacing the layout

Pass `cardRenderers` to draw either card yourself, with no fork. A renderer is a React component;
the editor keeps the node, the uploads, the limits and the saving, and hands the component what
it needs. Without an entry the default layout draws. A custom renderer changes how the card looks
in the editor; the saved document and the HTML output are the same.

**The gallery contract** (`KoenigGalleryRenderProps`) has four groups of props:

| Group        | Props                                                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What to show | `images` (each with `alt`, `title` and `caption`, all plain text, plus `src`, `previewSrc`, `width`, `height`), `caption` (the gallery's own caption editor, ready to place), `errorMessage`, `isUploading`, `progress` |
| State        | `isSelected`, and `readOnly`: true when the editor is not editable, so draw a reader's view with no editing controls                                                                                                    |
| Settings     | `maxImages` (this gallery's limit), `hostMaxImages` (the ceiling it cannot exceed), `mimeTypes`                                                                                                                         |
| Callbacks    | `addFiles(files)`, `removeImage(index)`, `moveImage(from, to)`, `replaceImages(list)` (the whole list, for your own drag and drop), `updateImage(index, { alt, title, caption })`, `setMaxImages(n)`, `clearError()`    |

**The header contract** (`KoenigHeaderRenderProps`) carries the card's values (`title`,
`subtitle`, `backgroundColor`, `backgroundImageSrc`, `buttonText`, `buttonEmoji`, `buttonUrl`, `alignment` (`left`, `center` or `right`), the
colours, `layout`), `titleField` and `subtitleField` (their editors, ready to place), `isEditing`,
`isSelected`, `readOnly`, `update(changes)`, `uploadBackgroundImage(file)` and `uploadError`.

**Wrap the default.** `KoenigGalleryCard` and `KoenigHeaderCard` are the default renderers, taking
exactly those props, so you can add to the default instead of replacing it. This adds a download
link to the reader's view of every gallery and leaves editing, the dialog and the full-screen
viewer as they are:

```tsx
import { KoenigGalleryCard, type KoenigGalleryRenderProps } from "node-koenig-editor";

const WithDownloadLink = (props: KoenigGalleryRenderProps) => (
  <div>
    <KoenigGalleryCard {...props} />
    {props.readOnly ? <a href="#all">Download all {props.images.length} photos</a> : null}
  </div>
);

<KoenigComposer cardRenderers={{ gallery: WithDownloadLink }} fileUploader={uploader}>
```

The header works the same way:

```tsx
import { KoenigHeaderCard, type KoenigHeaderRenderProps } from "node-koenig-editor";

const WithBanner = (props: KoenigHeaderRenderProps) => (
  <div className="my-banner">
    <KoenigHeaderCard {...props} />
  </div>
);

<KoenigComposer cardRenderers={{ header: WithBanner }} fileUploader={uploader}>
```

**Draw it all yourself.** This is a bare strip with no full-screen viewer; it shows the contract
at its smallest:

```tsx
import type { KoenigGalleryRenderProps } from "node-koenig-editor";

const Strip = ({
  images,
  addFiles,
  removeImage,
  updateImage,
  moveImage,
  caption,
  maxImages,
  readOnly,
}: KoenigGalleryRenderProps) => (
  <div className="my-gallery">
    {images.map((image, index) => (
      <figure key={image.fileName}>
        <img alt={image.alt} src={image.previewSrc ?? image.src} />
        {readOnly ? null : (
          <>
            <input
              value={image.alt}
              onChange={(e) => updateImage(index, { alt: e.target.value })}
            />
            <button onClick={() => moveImage(index, index - 1)}>Earlier</button>
            <button onClick={() => removeImage(index)}>Remove</button>
          </>
        )}
      </figure>
    ))}
    {!readOnly && images.length < maxImages ? (
      <input multiple type="file" onChange={(e) => addFiles(e.target.files!)} />
    ) : null}
    {caption}
  </div>
);
```

Not included: the parts of upstream's header and gallery that need a Ghost site or service
(Unsplash, the Pintura image editor, the version 1 header editor).
A version 1 header in a saved document still loads and exports; the card edits it with the
current controls.

## 🔘 Button and Markdown cards

Both are in the default card set (`/button`, `/md`) and `cards` leaves either out.

**Links.** Wherever a card writes a link, only an absolute `http`, `https` or `mailto` URL is
kept. One rule, `isSafeUrl(url)` / `toSafeUrl(url)`, runs when you type in the editor, when a
document loads (JSON or HTML), and again when the HTML is written out. It reads a URL the way a
browser does (leading spaces and control characters, tabs and line breaks inside the URL are
ignored), so `JaVaScRiPt:`, `data:`, `vbscript:`, relative and protocol-relative links are all
refused. The button's link field shows `strings.button.invalidUrl` and does not store the value.

**Button.** A label, a link, left, centre or right alignment, an optional emoji before the label and
its own background and text colours (the `buttonBackground` and `buttonText` colour slots, see
[Colours](#-colours)). A picked colour is written as inline CSS on the link. A button with no valid link exports
nothing. Upstream's email-specific markup is not included: every target gets the same link.

**Markdown.** Write or paste Markdown into a text area; the card shows the rendered result.
`renderMarkdown(source)` does the rendering for both the preview and the exported HTML, so they
cannot differ. Raw HTML in the source is escaped, never passed through. Links and image sources
follow the URL rule above (a link that fails stays plain text), and `######` becomes an H5 to
match the [heading limit](#-headings). Rendering uses [`markdown-it`](https://github.com/markdown-it/markdown-it)
(MIT), a regular dependency that stays external in the build. Upstream's CodeMirror editor and
its Ghost image uploads are not included.

## 💻 Code blocks

A code block is Lexical's own (`@lexical/code`), highlighted with Prism through `@lexical/code-prism`
(add it next to the other `@lexical/*` peers). Type three backticks and a language (` ```ts `) on an
empty line, or pick **Code** from the "+" or slash menu (`/code`). Every block has line numbers (drawn
by the stylesheet, so they are never selected or copied) and, on hover or with the cursor in it, a
small bar with a language list and a **Copy** button. A reader (read-only or Preview) gets the copy
button alone.

- **Languages.** `codeLanguages={[{ label: 'TypeScript', value: 'typescript' }, ...]}` lists the
  languages the bar offers; "Plain text" is always there. Without a list you get what the highlighter
  ships with (C, C++, CSS, Go, HTML, Java, JavaScript, Markdown, Objective-C, PowerShell, Python, Rust,
  SQL, Swift, TypeScript and XML). The value must be a language name Prism knows.
- **Saved HTML.** `<pre class="language-ts" data-language="ts">` with the code as plain text: no token
  spans and no line numbers, so your site can colour it again.
- **Colours.** The token colours come from `--kg-code-*` custom properties on `.kg-code-block`
  (`--kg-code-bg`, `--kg-code-fg`, `--kg-code-gutter`, `--kg-code-comment`, `--kg-code-keyword`,
  `--kg-code-string`, `--kg-code-number`, `--kg-code-function`, `--kg-code-attr`, `--kg-code-builtin`);
  set them to match your page. In forced-colours mode the block uses the system colours.
- **Wording.** `strings.code` (copy, copied, copy failed, language list name, plain text).

## 🔢 Word count and reading time

`useKoenigWordCount()` returns `{ words, minutes, wordsLabel, readingTimeLabel }` for the editor it
sits under and updates as the text changes. Place it in any component rendered inside
`KoenigComposer`:

```tsx
const WordCount = () => {
  const { wordsLabel, readingTimeLabel } = useKoenigWordCount({ wordsPerMinute: 200 });
  return (
    <p>
      {wordsLabel} · {readingTimeLabel}
    </p>
  );
};

<KoenigComposer>
  <KoenigEditor />
  <WordCount />
</KoenigComposer>;
```

`wordsPerMinute` defaults to `DEFAULT_WORDS_PER_MINUTE` (238); minutes are rounded up. Outside a
component, `getWordCount(editorState)`, `countWords(text)` and `getReadingTime(words, wpm)` give the
same numbers. The labels come from `strings.wordCount` (`{count}` and `{minutes}` are filled in).

What counts: the document's own text (paragraphs, headings, lists, quotes, code and table
cells). Cards are not counted at all, so a gallery's alt text, an image caption, a button's label
and link, callout and toggle text, and the source of a Markdown card add nothing. A word is a run
between spaces ("well-known" is one); Chinese, Japanese and Thai text is split with the browser's
word segmenter.

## 📎 File, video and audio cards

All three are in the default card set (`/file`, `/video`, `/audio`) and upload through your
`fileUploader`: `useFileUpload("file")`, `useFileUpload("video")` and `useFileUpload("audio")`.
Nothing is embedded from outside and nothing is fetched from a third party; a video or audio file
plays from the url your uploader returned.

- **Limits.** If `fileUploader.fileTypes.file` (or `.video`, `.audio`) is set, the card checks the
  chosen file against its `extensions`, `mimeTypes` and an optional `maxSize` in bytes _before_
  uploading, and names the file in the message (`strings.file.typeError`, `strings.file.sizeError`).
  A host with no `fileTypes` gets no pre-check; the uploader has the last word.
- **File.** A title, a description, and the file name and size. It saves as a download link. The
  card shows a picture for the file's type (react-file-icon, MIT: a PDF, a spreadsheet, an archive and
  several hundred more; a type it does not know gets a plain page with the extension on it). The icon
  is optional: `fileIcons={false}` switches it off for the whole editor, a card has its own "Show the
  file type icon" box, and `fileIcons={{ overrides: { pdf: PdfIcon } }}` draws your own for a type
  (the component gets `extension`). The icon is in the editor and Preview; the saved HTML is unchanged.
- **Video and audio** play in the browser's own player, so play, seek, volume and mute work from the
  keyboard and show the browser's focus ring. Captions are required for accessibility: a card has a
  **transcript** field and a **WebVTT (`.vtt`) track upload**, saved as a
  `<track kind="captions">`. A card with neither shows `strings.video.captionsMissing` (or
  `strings.audio.captionsMissing`) until one is added. The track file goes through
  `useFileUpload("file")`, so allow `.vtt` there. The transcript is plain text.
- **Safe urls.** Every source is checked in the editor, on import and in the HTML output: `http`,
  `https` or a path on your own origin. `javascript:`, `data:`, `blob:` and protocol-relative urls
  are dropped.
- **Switch off** any of them with `cards`, for example `cards={["image", "video"]}`.

```tsx
const uploader = {
  fileTypes: {
    file: {
      extensions: [".pdf", ".zip"],
      mimeTypes: ["application/pdf", "application/zip"],
      maxSize: 20_000_000,
    },
    video: {
      extensions: [".mp4", ".webm"],
      mimeTypes: ["video/mp4", "video/webm"],
      maxSize: 200_000_000,
    },
  },
  useFileUpload: (type) => useMyUploader(type), // returns { upload, isLoading, progress, errors }
};
```

## 🖼️ Image editor and emoji picker

Neither is a card, so the composer's `cards` option does not list them. Both are on by default;
`tools` turns them off one by one: `tools={["emojiPicker"]}` keeps only the emoji picker, and
`tools={[]}` turns both off. The reader's view has its own tool, `preview`; see [Preview](#-preview).

**Image editor.** When someone picks, drops or pastes a single image into an image card, a dialog
opens first to crop and rotate it, and the edited copy (`photo-edited.jpg`) goes to your
`fileUploader` instead of the original. Cancel uploads nothing. The work happens on a canvas in
the browser: no dependency, no network call. GIF and SVG files skip the editor, since a canvas
would flatten them. JPEG stays JPEG; everything else is saved as PNG.

- Keyboard: Tab stays inside the dialog and Escape cancels. On the crop area the arrow keys move
  it and Shift with the arrow keys makes it larger or smaller. The crop shape (free, original,
  1:1, 4:3, 16:9) is a select, and the rotate buttons turn by 90 degrees. The mouse drags the
  crop and its corner.
- Wording: `strings.imageEditor`. Use the dialog in your own UI with
  `<ImageEditorDialog file onApply onCancel />`.

**Emoji picker.** The callout card's emoji button opens it, and so do the emoji field in the Button and
Header cards' settings, the **Emoji** entry of the plus and slash menus, and typing `/emoji` anywhere
in the text (also inside a callout or a table cell; Escape closes it and leaves what was typed). It is searchable by name, has the nine
standard groups, and works fully offline: the emoji come from
[`unicode-emoji-json`](https://www.npmjs.com/package/unicode-emoji-json) (MIT), a dependency of
this package that is not part of `dist/index.js`. It is loaded with a dynamic `import()` the
first time a picker opens, so your bundler puts it in its own chunk and a page that never opens
the picker never loads it. The import needs a bundler that handles JSON (Vite, webpack,
esbuild).

- Keyboard: Down from the search box enters the grid; arrows, Home and End move through it; Up
  from the top row returns to the search; Enter picks; typing goes to the search; Escape closes.
  The emoji are buttons in a listbox, each named in words.
- Wording: `strings.emojiPicker`.
- In your own UI: `<EmojiPicker onSelect={({ native }) => ...} onClose={...} />`, and
  `insertEmoji(editor, native)` to put the pick into the text at the cursor (it returns `false`
  when the selection is not in text). From a toolbar action, use `replaceSelection(native)`
  instead, as in [Toolbar actions](#-toolbar-actions).

## 👀 Preview

A toggle above the editor shows the document the way a published reader sees it, and flips back to
editing with nothing lost. It is on by default; the `preview` entry in `tools` turns it off
(`tools={["imageEditor", "emojiPicker"]}`), and it never shows when `editable={false}`.

In the reader's view the editor is read-only and shows no editing chrome: no "+" button or slash
menu, no toolbars, no placeholders, no drag handles, no card selection or hover outline, and no
comment highlights unless you pass `previewComments`. Every card draws its reader form (a file is a
link, a toggle opens and closes, media show their title and captions, empty upload slots are gone).
It is the one live document, not a copy: the same editor, the same state. When you flip back, the
selection, focus and scroll position come back and no change is lost.

A small bar next to the button lets the author check the result: **width** (desktop, tablet or
phone, in a framed viewport), **theme** (light or dark) and **text size** (12 to 20).

| Option on `KoenigComposer` | Type                            | Default                  | What it does                                                                                                                              |
| -------------------------- | ------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `preview`                  | `boolean`                       | uncontrolled             | Controls the reader's view. When given, the editor only changes with this prop and reports a request to change through `onPreviewChange`. |
| `defaultPreview`           | `boolean`                       | `false`                  | Starts with the reader's view on, when `preview` is not given.                                                                            |
| `onPreviewChange`          | `(preview: boolean) => void`    | none                     | Called when the person (or the API) turns it on or off.                                                                                   |
| `previewOptions`           | `Partial<KoenigPreviewOptions>` | `desktop`, `light`, `16` | The reader simulation the view starts with: `width`, `theme` and `textSize`.                                                              |
| `onPreviewOptionsChange`   | `(options) => void`             | none                     | Called when the simulation options change.                                                                                                |
| `previewComments`          | `boolean`                       | `false`                  | Show inline comment highlights in the reader's view.                                                                                      |
| `showPreviewToggle`        | `boolean`                       | `true`                   | Put the default button above the editor. Pass `false` to place your own.                                                                  |

From the editor API: `api.isPreview()` and `api.setPreview(true | false)`. To place the controls
yourself, render `<KoenigPreviewToggle />` (and `<KoenigPreviewOptionsPanel />`) inside the
composer, or read the state with `useKoenigPreview()`. The wording is `strings.preview`.

```tsx
<KoenigComposer showPreviewToggle={false} onPreviewChange={(on) => track("preview", on)}>
  <KoenigPreviewToggle className="my-button" />
  <KoenigEditor />
</KoenigComposer>
```

The demo (`npm run playground`) shows the toggle by default, and its Tools settings turn it off.

## ⌨️ Room around cards

A card at the very start or end of the document has no line beside it, so the cursor cannot go
above or below it. The editor adds an empty paragraph there, including to a stored document that
is only a card, and only when there is none. Between two cards it adds nothing: a gap there is
yours to keep or delete with Backspace or Delete, and one you removed is not put back. Enter on a
selected card adds a paragraph after it and puts the cursor in it. A read-only editor and the
editors inside cards are left alone, and changes that arrive from a collaborator are not patched
by this editor, so two editors do not both add one.

The "+" button for an empty line sits inside the editor's box: just before the line when the
padding leaves room, at the box's left edge otherwise, and never outside it.

## 🔠 Headings

Headings run from H1 to H5 and no deeper. The toolbar has a button for each level (hide any with
`toolbar`), and a Heading 6 that arrives from a stored document, a paste, a markdown shortcut or
a collaborator is set to Heading 5.

## 🔤 Inline formats and the keyboard

The selection toolbar has buttons for **underline**, **strikethrough**, **subscript**,
**superscript** and **inline code** after bold and italic, each marked when the selection has the
format. Shortcuts: Ctrl or Cmd with **U** (underline), with Shift and **X** (strikethrough), with
**,** (subscript) and with **.** (superscript). Subscript and superscript exclude each other, and a
format whose button the host's `toolbar` option leaves out has no shortcut either. Inline code is
drawn with a light background and a monospace face; style it with the `.koenig-lexical code` rule.

**Alt+F10** moves focus from the selected text to the first button of the selection toolbar. The
arrow keys, Home and End move between its buttons, Enter or Space applies one, and Escape goes
back to the text with the selection kept. The toolbar is a labelled `role="toolbar"`
(`strings.toolbar.group`).

## 🎨 Text styling

Four buttons in the selection toolbar style the selected text, and a fifth takes styling off:

- **Text size** (`fontSize`): smaller, small, normal, large, larger, set in `em` so the text follows
  the host's type scale.
- **Text colour** (`textColor`): six colours that read on both a light and a dark page, the
  default colour, and a colour wheel for any colour (see [Colours](#-colours)).
- **Highlight** (`highlight`): six light colours and the colour wheel, saved together with ink
  (dark on a light highlight, light on a dark one) so the text reads on any page.
- **Font** (`fontFamily`): the fonts the host gives, shown in their own face. With no `fonts` the
  button is not shown.
- **Clear formatting** (`clearFormatting`, Ctrl or Cmd+**backslash**): takes every inline format and style off
  the selected text.

```tsx
<KoenigComposer
  fonts={[
    { label: "Serif", value: "Georgia, serif" },
    { label: "Mono", value: "Menlo, monospace" },
  ]}
  toolbar={["bold", "italic", "fontSize", "textColor", "fontFamily"]}
/>
```

The styling is the text's own style, so it is saved in the document, survives a reload, and is
inline CSS in the saved HTML. The lists open under their button; the arrow keys move, Enter picks,
Escape closes and returns to the text. Each button is marked while the selection has that style.
The wording is `strings.textStyle` and `strings.toolbar`.

## 🌈 Colours

Every colour setting in the editor (text colour, highlight, the callout's background and text, the
Button card's colours and the Header card's four colours) uses one control: a row of base swatches
for that setting, the editor's own colour, and a colour wheel for any colour. The base palette is
different for each setting; the `colors` option changes it per setting (a "slot"):

```tsx
<KoenigComposer
  colors={{
    textColor: { palette: [{ label: "Brand blue", value: "#1D4ED8" }] },
    highlight: { picker: false },
    calloutBackground: { palette: brand, picker: false, none: false },
  }}
/>
```

- `palette`: the swatches that setting shows, each a `label` and a `#rgb` or `#rrggbb` `value`.
- `picker`: `false` takes the colour wheel away, so the person can only use the palette.
- `none`: `false` takes away the editor's own colour, so a colour is always set.

With `picker: false` and `none: false` the host forces the colours of that setting to its list. If that list has one swatch, the toolbar button for a text colour or highlight applies it directly and takes it off again, with no menu.
The slots are `textColor`, `highlight`, `calloutBackground`, `calloutText`, `buttonBackground`,
`buttonText`, `headerBackground`, `headerText`, `headerButton`, `headerButtonText`, `tableBand` and
`tableBrand`. Highlight writes dark or light text with the colour, whichever reads on it.

## 📃 Lists and spacing

The selection toolbar has **Bulleted list** (`bulletList`), **Numbered list** (`numberList`) and
**Checklist** (`checkList`), each marked when the selection is in that kind of list and pressed
again to go back to paragraphs, and **Decrease indent** and **Increase indent** (`outdent`,
`indent`; Tab and Shift+Tab already do this inside a list). A checklist item has a box before its
text that a click, or Space with the cursor in the item, ticks; the item is a `role="checkbox"`
with `aria-checked`, the state is saved with it, and the box and tick follow `--kg-selection` and
the system colours in forced-colours mode.

**Line spacing** (`lineSpacing`: single, 1.15, 1.5, double) and **Paragraph spacing**
(`paragraphSpacing`: none, small, medium, large; the space after the block) apply to the selected
blocks. They are saved on the block, drawn as inline CSS, and written as inline `line-height` and
`margin-bottom` into the saved HTML. "Default" takes them off.

## 📋 Paste, spell check and the shortcuts list

**Clean paste** (the `cleanPaste` tool). HTML pasted from Word, Google Docs or a web page is cleaned
before the editor reads it: the head, styles, comments and Office tags go, every font, size, colour
and spacing setting goes, Word's lists (paragraphs with bullet characters) become real nested
bulleted and numbered lists, Docs' `b` wrapper no longer makes the paste bold, and bold, italic,
underline, strikethrough, superscript and subscript written as styles become the editor's own
formats. Headings, links (safe ones only), tables and images stay. Copying inside the editor, a
pasted link, and a picture with its file are left to the editor's own handling.

**Spell check.** The browser's own spell check works in the editing area unless the composer says
`spellCheck={false}`; `lang="de"` (any BCP 47 tag) tells the browser which language to check in and
sets the `lang` attribute of the editing area.

**Keyboard shortcuts** (the `shortcuts` tool). Ctrl or Cmd with **/** opens a list of the shortcuts
that are on in this editor, in groups, with the keys for this platform; a shortcut whose button the
host's `toolbar` option leaves out is not listed. Escape or Close returns to the text. Its wording is
`strings.shortcuts`. `tools={["preview"]}` (any list without them) turns clean paste and the list off.

## 🔎 Find and replace

Ctrl or Cmd with **F** (the `findReplace` tool) opens a bar over the editor with a find field
(filled from a one-line selection), Previous and Next (Enter and Shift+Enter in the field step
through too), **Match case**, a replace field with **Replace** and **Replace all**, a live count
("2 of 5", "No matches", "5 replaced") and Close. Escape closes it and puts focus back in the text. The query is plain text,
never a pattern; a match can run across bold, italic and other formatting inside a block, and
the matches follow the text while it is edited. Where the browser has the CSS Custom Highlight API
the matches are highlighted in the text, the current one stronger (`::highlight(kg-find)` and
`::highlight(kg-find-current)`, from `--kg-selection`; system colours in forced-colours mode).
While the editor is read-only (Preview) the replace controls are not shown. Replace all is one
step in the undo history. Its wording is `strings.find`.

## ↔️ Text alignment

The selection toolbar has Align left, Align center, Align right and Justify, for paragraphs,
headings, quotes and list items. They set the alignment of the block the selection is in, mark the
one that is active, and work from the keyboard with Ctrl or Cmd plus Shift and **L**, **E**, **R**
or **J**. The alignment is the block's own format, so it is saved in the document, shows in the
reader's view and in the saved HTML as `text-align`, and survives a reload.

**Text direction** (`textDirection`) sets the selected blocks to automatic, left to right or right
to left. Automatic is the default: a block follows its own text (`dir="auto"`), so a Hebrew or Arabic
paragraph already reads right to left, and mixed text follows its first strong character. A choice
is saved on the block (`direction`), drawn as `dir`, and kept in the saved HTML. A list or a table is
one block, so it turns around whole: bullets and numbers move to the right, table columns run right to
left, and a quote's bar moves to the right edge.

Right-to-left text is handled: a block with no stored alignment counts as start-aligned, so in a
Hebrew or Arabic paragraph the Align right button is the marked one. Nested card text (a callout,
a caption) has no alignment.

Leave the buttons out with `toolbar` (`toolbar={["bold", "italic"]}` shows none of them). That also
turns the shortcuts off, and, as before, alignment in a document is then removed from paragraphs,
headings and quotes.

In a read-only editor (and the reader's view) the selection toolbar does not show, so nothing in
it can change the document.

In a table cell the same buttons align the cell (not the paragraph in it), the toolbar adds Align
top, middle and bottom, and a small "apply to" button cycles between this cell, the row, the column
and the table. The shortcuts act on the cell too.

## 💬 Inline comments

Comment on any selected text, like comments in a word processor. Pass `comments` to the composer and
the editor registers Lexical's mark node, which carries each thread's id. The anchors therefore live in
the document: they follow edits and are saved and loaded with the editor state (`serialize()`,
`onChange`, collaboration). The thread content (messages, resolved flag) stays with the host: the editor
reports every change as an event and takes the saved threads back through `threads`.

```tsx
import { KoenigComposer, KoenigEditor, useKoenigComments } from "node-koenig-editor";
import type {
  KoenigCommentEvent,
  KoenigCommentsController,
  KoenigCommentThread,
} from "node-koenig-editor";

const Threads = () => {
  const comments = useKoenigComments();
  if (!comments) return null;
  const { activeThreadId, controller, threads } = comments;
  return (
    <ul>
      {threads.map((thread) => (
        <li key={thread.id} aria-current={thread.id === activeThreadId}>
          “{thread.quote}” — {thread.messages.length} message(s)
          <button onClick={() => controller.reply(thread.id, { body: "Agreed" })}>Reply</button>
          <button onClick={() => controller.resolveThread(thread.id)}>Resolve</button>
          <button onClick={() => controller.removeThread(thread.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

// Keep the controller to call addThread from your own "Comment" button.
let commentsApi: KoenigCommentsController | null | undefined;

export const Editor = ({
  saved,
  save,
}: {
  saved: KoenigCommentThread[];
  save: (e: KoenigCommentEvent) => void;
}) => (
  <KoenigComposer comments={{ onEvent: save, threads: saved }}>
    <KoenigEditor registerAPI={(api) => (commentsApi = api.comments)} />
    <Threads />
  </KoenigComposer>
);
```

| Piece                               | What it does                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `comments.threads`                  | The saved threads. Replaced, without events, whenever the array's identity changes (load them asynchronously, or after a refetch).                                                                |
| `comments.onEvent`                  | Called with a `KoenigCommentEvent`: `thread-added`, `thread-removed`, `thread-resolved`, `thread-reopened`, `reply-added`, `thread-focused`, `anchor-lost`, `anchor-restored`. Persist from here. |
| `api.comments`                      | The controller from `registerAPI`; `null` when `comments` is off. `useKoenigComments()` gives the same controller with live `threads` and `activeThreadId`.                                       |
| `addThread({ body, author?, id? })` | Anchors a thread on the current text selection and returns it, or returns `null` when nothing is selected. Keep the selection (it persists after blur) while the host asks for the text.          |
| `reply(id, { body, author? })`      | Appends a message and returns it, or `null` for an unknown thread.                                                                                                                                |
| `resolveThread(id, resolved?)`      | Resolves a thread, or reopens it with `false`. Resolved highlights are muted.                                                                                                                     |
| `removeThread(id)`                  | Removes the thread and its highlight, and leaves the text.                                                                                                                                        |
| `focusThread(id \| null)`           | Marks a thread active and scrolls its highlight into view. Clicking a highlight does the same and emits `thread-focused`.                                                                         |
| `isAnchored(id)`                    | Whether the highlight is still in the document. Deleting the anchored text emits `anchor-lost`; undo or a collaborator restoring it emits `anchor-restored`.                                      |

Highlights are `<mark data-kg-comment-ids>` elements, with `data-kg-comment-resolved` and
`data-kg-comment-active` set as the state changes. Style them with `--kg-comment-highlight`,
`--kg-comment-highlight-resolved` and `--kg-comment-highlight-active`.

Read-only editors (`editable={false}` on the composer and `readOnly` on the editor) still show the
highlights and focus threads on click. The controller keeps working there too, `addThread` included, so
it is the host that decides who may comment on a locked document. Messages carry an opaque `author`
string and ISO timestamps; nothing in the package interprets them. Overlapping threads share the marked
text, and a click focuses the first unresolved one.

## 🤝 Collaboration

Pass `collaboration` to edit together. The editor asks your `providerFactory` for a Yjs provider
per document: `"main"` for the document itself and one per nested editor (image captions,
callout and toggle text). The factory puts the `Y.Doc` it uses into the map it is handed and
returns an `@lexical/yjs` `Provider`. This package never opens a socket itself.

```ts
import type { Provider } from "@lexical/yjs";
import type { KoenigCollaboration } from "node-koenig-editor";
import { WebsocketProvider } from "y-websocket";
import { Doc } from "yjs";

export const collaboration: KoenigCollaboration = {
  cursorColor: "#2563eb",
  providerFactory: (id, documents) => {
    const document = new Doc();
    documents.set(id, document);
    return new WebsocketProvider("wss://collab.example.test", `doc-42/${id}`, document, {
      connect: false,
    }) as unknown as Provider;
  },
  username: "Ada",
};
```

- `getNestedXmlText(document, id)` keeps a nested editor's content inside the main document
  (a named top-level `XmlText`) when your transport carries one document per room.
- `shouldBootstrap` (default `true`) seeds an empty room from `initialEditorState`.
- Every property of every built-in card is shared between the windows of a session, and each
  card's nested text (captions, the header title and subtitle, callout text, toggle headings and
  content, toggle group items) is a shared document of its own, found by the id Lexical hands your
  `providerFactory`. Create the `Doc` for an id you have not seen, as the example above does.

### Custom cards

A card you add through `customNodes` is shared like any other node: all its properties go into the
shared document. Collaboration for it is yours to provide, and one thing needs declaring. A property
that Yjs cannot store (an editor's saved `EditorState`, a DOM node, a function, anything circular)
stays in the window that made it. List it on the class:

```ts
class PollNode extends DecoratorNode<ReactNode> {
  // kept in this window only; every other property is shared
  static collabLocalProperties = ["__draftEditorState"];
}
```

The package's own cards use the same list. `collaboration.excludedProperties` adds to it from the
host side, for a node class you cannot edit.

If the card holds a nested editor, keep it as a property of its own on the node (`__captionEditor`),
never inside an array or an object. Lexical gives each such editor a shared document, with the same
id in every window, and calls your `providerFactory` for it. List the editor's saved `EditorState`
in `collabLocalProperties` too. An editor that sits inside an array or an object cannot be found by
the other windows, and its editors reach the shared document as an object that cannot be encoded,
which stops sync for the whole document.

## 🎨 Styles and theme tokens

Import `node-koenig-editor/styles.css` once. The styles are scoped under `.koenig-lexical`, with
no global reset, so they sit next to your own CSS (Tailwind 4 included) without clashing.

Restyle by setting these custom properties on any ancestor of the editor. Each falls back to
upstream's value, so set only what you change. Colours take any CSS colour, including your own
variables (`--kg-accent-color: var(--color-primary)`), and opacity variants follow them.

| Token                  | Default                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `--kg-accent-color`    | `#ff0095`                                                  |
| `--kg-color-white`     | `#FFF`                                                     |
| `--kg-color-black`     | `#15171A`                                                  |
| `--kg-color-grey-50`   | `#FAFAFB`                                                  |
| `--kg-color-grey-100`  | `#F4F5F6`                                                  |
| `--kg-color-grey-150`  | `#F1F3F4`                                                  |
| `--kg-color-grey-200`  | `#EBEEF0`                                                  |
| `--kg-color-grey-250`  | `#E5E9ED`                                                  |
| `--kg-color-grey-300`  | `#DDE1E5`                                                  |
| `--kg-color-grey-400`  | `#CED4D9`                                                  |
| `--kg-color-grey-500`  | `#AEB7C1`                                                  |
| `--kg-color-grey-600`  | `#95A1AD`                                                  |
| `--kg-color-grey-700`  | `#7C8B9A`                                                  |
| `--kg-color-grey-800`  | `#626D79`                                                  |
| `--kg-color-grey-900`  | `#394047`                                                  |
| `--kg-color-grey-925`  | `#2E3338`                                                  |
| `--kg-color-grey-950`  | `#23292F`                                                  |
| `--kg-color-grey`      | `#ABB4BE`                                                  |
| `--kg-color-green-600` | `#2AB23A`                                                  |
| `--kg-color-green`     | `#30CF43`                                                  |
| `--kg-color-blue`      | `#14B8FF`                                                  |
| `--kg-color-purple`    | `#8E42FF`                                                  |
| `--kg-color-pink`      | `#FB2D8D`                                                  |
| `--kg-color-red`       | `#F50B23`                                                  |
| `--kg-color-yellow`    | `#FFB41F`                                                  |
| `--kg-color-lime-500`  | `#B5FF18`                                                  |
| `--kg-color-lime-800`  | `#466600`                                                  |
| `--kg-font-sans`       | `Inter, -apple-system, BlinkMacSystemFont, ... sans-serif` |
| `--kg-font-serif`      | `Georgia, Times, serif`                                    |
| `--kg-font-mono`       | `Consolas, Liberation Mono, Menlo, Courier, monospace`     |

`--kg-accent-color` colours links and accent cards; `--kg-selection-color` colours selection and focus. The `grey` scale
carries text, borders and backgrounds, light and dark. Dark styles apply when `darkMode` is set
on the composer.

### Sizing, type and selection tokens

The stylesheet is written for a 10px root (upstream sets `html { font-size: 62.5% }`). Every
length is a multiple of `--kg-rem` so the editor follows your page instead: on the browser's 16px
root one unit is `0.625rem`, i.e. 10px, and it grows with the person's text-size setting. Host
pages that already use the 62.5% root set `--kg-rem: 1rem`. Set these on any ancestor of the
editor.

| Token                  | Default                        | What it sets                                                                                                                                                                                                      |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--kg-rem`             | `0.625rem`                     | The length unit for everything the editor draws; the single scale knob.                                                                                                                                           |
| `--kg-font-size`       | `2rem` (in `--kg-rem` units)   | Body text size (paragraphs, quotes, lists).                                                                                                                                                                       |
| `--kg-line-height`     | `1.6em`                        | Body line height.                                                                                                                                                                                                 |
| `--kg-font-body`       | `Georgia, Times, serif`        | Body font family (the menus and toolbars use `--kg-font-sans`).                                                                                                                                                   |
| `--kg-font-size-h1`    | `4.4rem` (in `--kg-rem` units) | Heading sizes, H1 to H5: `--kg-font-size-h1` through `--kg-font-size-h5`.                                                                                                                                         |
| `--kg-selection-color` | black (white in dark mode)     | The colour of selected and focused cards, active toolbar buttons, drop lines and focus outlines. There is no built-in green.                                                                                      |
| `--kg-menu-width`      | `28rem` (in `--kg-rem` units)  | Width of the "+" and slash menus.                                                                                                                                                                                 |
| `--kg-menu-max-height` | `32rem` (in `--kg-rem` units)  | Tallest the menus grow before they scroll; they also shrink to fit the room.                                                                                                                                      |
| `--kg-breakout-room`   | `1.8rem` (in `--kg-rem` units) | How far a wide or full card (the gallery, a wide image) may extend past the text column on each side. Set it large (`100vw`) when the editor spans the whole page, to get the viewport-wide cards upstream draws. |
| `--kg-plus-size`       | `2.2rem` (in `--kg-rem` units) | Diameter of the "+" button beside an empty line.                                                                                                                                                                  |

The `--kg-font-size-h2`, `--kg-font-size-h3`, `--kg-font-size-h4` and `--kg-font-size-h5`
defaults are `3.2rem`, `2.5rem`, `2.2rem` and `2rem`. The editor itself sets `--kg-menu-fit`
(the room left for an open menu) on the menu; leave it alone. The "+" and slash menus are drawn in a portal inside the editor's root, positioned
against the viewport: they are never clipped by the editor's overflow (an empty document
included), open above the line when there is no room below, and scroll when taller than the room.

## 🔗 Upstream

- Source: [`TryGhost/Koenig`](https://github.com/TryGhost/Koenig), commit
  `4da831801b9ca065e4b30abe96c8b33227133e6c` (2026-07-13).
- `src/koenig-lexical/` is that commit's `packages/koenig-lexical/src` (koenig-lexical 1.8.3).
- `src/kg-default-nodes/` is `packages/kg-default-nodes/src` (2.1.3) and
  `src/kg-default-transforms/` is `packages/kg-default-transforms/src`: the node classes and
  transforms the editor builds on, brought in so they use the same Lexical.
- `LICENSE-koenig` is upstream's MIT licence, unchanged, and ships in the package. Upstream files
  keep upstream's code style and carry no per-file headers.

To carry a later upstream fix over, diff the same paths between the commit above and the newer
one, apply the change by hand, and update the commit here. Upstream history is not imported.

## 🔀 What changed from upstream

- Lexical, `@lexical/*`, Yjs and React are peer dependencies instead of being bundled. Lexical
  0.13 to 0.52 changes are fixed in place (for example `$canShowPlaceholder` lost its second
  argument, `CollaborationPlugin` now needs a `LexicalCollaboration` provider, and every
  registered node class declares its own `getType`, `clone` and `importJSON`).
- Host options (`src/additions/options/`): `cards`, `customNodes`, `menuItems`, `strings` and
  `toolbar` on the composer. Every user-facing string goes through `strings`; the editor's default
  placeholder reads "Begin writing..." instead of upstream's post wording.
- Theme tokens: the Tailwind palette and fonts read `--kg-color-*` and `--kg-font-*` custom
  properties with upstream's values as fallbacks (upstream's `purple-600` lacked its `#`; it is
  fixed).
- Stock node type names are kept: `text`, `heading`, `quote` and the rest save under their stock
  names (upstream swaps in `extended-*` replacements). Code blocks are stock `code` nodes.
- Gallery and header: `src/kg-default-nodes` and `src/koenig-lexical` carry upstream's gallery
  node, parser and renderer and the header node, parser and renderers from the same commit. The
  gallery card uploads one image at a time, has per-image alt text, title and caption (all in one
  dialog), and reorders by drag or with Alt and the arrow keys. The header card is a smaller editor than upstream's (no image editor,
  no version 1 controls), and both take a host layout through `cardRenderers`.
- File, video and audio: the file card is upstream's, without the email table. Video and audio are
  written for this package (upstream's depend on Ghost's thumbnails and player script): the
  browser's own player, a captions track and a transcript, no loop, autoplay or outside embeds.
- Tables: `@lexical/table`'s `table`, `tablerow` and `tablecell` are registered, with Lexical's
  table plugin and a Table entry in the "+" and slash menus (`src/additions/table/`).
- Collaboration: the composer takes a `collaboration` prop instead of opening its own websocket.
- Markdown paste converts with `@lexical/markdown` rather than upstream's Markdown renderer.
- The card menu's links to upstream's help pages are gone.
- Kept: the content styles, the "+" and slash card menus, the floating format and link toolbars,
  card selection, drag to reorder, remote carets, and the image, callout, toggle, divider and
  aside cards.
- Removed: cards that need a Ghost site or service (membership, signup, product, paywall, email
  and email CTA, call to action, bookmark, embed,
  HTML, Transistor, Ghost's code block card), the GIF and Unsplash pickers, the Pintura
  image editor (replaced by a small canvas editor), the upstream emoji picker (replaced by an
  offline one), the TK and at-link nodes, replacement strings, the
  demo, stories and upstream's tests.
- Images: an image an older document kept inside a paragraph loads as an image card placed after
  that paragraph, because cards sit at the top level. Its `src`, `alt`, `width` and `height` are
  kept.

## 🧪 Playground

A demo app in `playground/` runs the editor in your browser, with a checkbox for every card and
tool, comments, word count and read-only mode, and the matching code next to them. The page splits 50/50 under a sticky top bar (the editor on the left, the options, code,
sample images, comments and saved state stacked on the right, each side scrolling on its own; under
1000px the right side drops below the editor). The bar holds the Editor and Guide tabs, the switches (dark, read only), a
text-size control, a selection colour picker, a card preset list, and the Load sample images, Load
the kitchen sink, Copy link, Clear and Reset buttons. Clear empties the document and keeps the
settings; Reset empties it and restores the default settings; both ask first and leave an Undo.
The Guide tab is the cards guide as a page: contents, an anchor per card, Print, and a Try it link
that opens the editor with that card inserted. The setup lives in the page address, so copying the link shares it.

The demo starts with a header and a gallery made of ten sample pictures (small PNGs it draws itself, no
network: `npm --prefix playground run samples` rebuilds them). A "Load sample images" button adds a
gallery, each thumbnail adds an image card, and by default an image upload is answered with the next
sample so nobody needs a picture of their own. A "Load the kitchen sink" button replaces the document with one that shows every card the package has (cards that are switched off are left out), plus plain writing, a short sound and a text file kept in `playground/public/media/`. A gallery card holds nine, so the tenth is the header's
background.

```bash
npm run playground            # or: task playground, against the source in this repo
npm run playground:published  # against the latest published node-koenig-editor
```

It opens on http://127.0.0.1:5178. The demo has its own `package.json`, lint and tests
(`npm run playground:check`), and it is not part of the published package.

### Build your own playground

The demo is generic on purpose: it shows what the package does and nothing that belongs to one
product. An app that wants a playground of its own (with its own toolbar actions, its own cards, its
own tokens and its own sample content) builds one. Start from `playground/`: copy the folder into
your app, point its `node-koenig-editor` import at your install, and swap in your options. The
settings panel, the page-address sync and the code view are plain React and have no dependency on
the rest of this repo.

## 🛠 Develop

```bash
npm install --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run build
npm run check:pack
npm run check:install
```

- `npm run build` bundles `src/` into `dist/index.js` with Vite (dependencies stay imports) and
  copies `index.d.ts` and the stylesheet next to it.
- `npm run build:css` rebuilds `src/generated/koenig.css` with the Tailwind 3 setup the sources are
  written for. Run it after changing a class name or `tailwind.config.cjs`, and commit the result.
- Tests run in jsdom against the sources and type-check against `index.d.ts`, the way a consumer
  does. They cover the declared surface, typing and collaboration, every host option and the theme
  tokens.
- Lint and the strict type check skip upstream's folders; `src/additions/` is checked as usual.

## ⚖️ License

MIT (c) 2026 Shane. Koenig is MIT (c) 2013-2026 Ghost Foundation; its licence is in
`LICENSE-koenig`.
