# node-koenig-editor 🧩

> 🧭 Ghost's Koenig editor on Lexical 0.52 and React 19, packaged for reuse, with optional Yjs collaboration.

Koenig is the rich text editor behind Ghost. This package is a build of it on your own Lexical,
React and Yjs, with Lexical's stock table nodes added. It is a configurable base: each host app
builds its own editor component on top of it and turns on only what it needs (the cards, the
menu entries, the toolbar buttons, the wording, the theme), and adds its own nodes. 🔌 **The host
owns the transport:** collaboration is a provider factory you pass in, and without one the
editor works alone.

## ✨ Highlights

- 🧱 **Pick your cards** — image, divider, callout, toggle and table, on by default, off one by one.
- 🧩 **Bring your own nodes** — register custom nodes and cards, and add your own "+" and slash menu entries.
- 🗣️ **Your wording** — every label, placeholder and menu text comes from a `strings` option with English defaults.
- 🎛️ **Your toolbar** — show only the format buttons you want.
- 🎨 **Theme with tokens** — CSS custom properties with documented defaults; no class overrides needed.
- 💬 **Inline comments** — threads anchored on any selected text, kept in the document, with events for your own storage.
- 🤝 **Optional collaboration** — a Yjs provider factory per document, remote carets included.
- 📄 **Plain Lexical documents** — stock node names (`text`, `heading`, `table`), readable by any Lexical consumer.
- 🪶 **Peers stay yours** — Lexical, `@lexical/*`, React and Yjs are peer dependencies, never bundled.

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

| Prop                 | Type                              | Default         | What it does                                                                                                                                                                     |
| -------------------- | --------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards`              | `KoenigCardName[]`                | all             | The shipped cards to register: `image`, `divider`, `callout`, `toggle`, `table`. A card left out is not registered, so it is missing from the menus and its commands do nothing. |
| `customNodes`        | `EditorNodes`                     | none            | Your own node classes, registered after the shipped ones. A node with a static `kgMenu` (a `CardMenuItem` or a list) is listed in the menus.                                     |
| `comments`           | `KoenigCommentsOptions`           | off             | Turns on inline comment threads; see [Inline comments](#-inline-comments).                                                                                                       |
| `menuItems`          | `CardMenuItem[]`                  | none            | Extra "+" and slash menu entries. Each dispatches its `insertCommand` with `insertParams`; your plugin handles it.                                                               |
| `strings`            | `KoenigStringsInput`              | English         | Your wording, laid over `DEFAULT_STRINGS`. Pass only what you change.                                                                                                            |
| `toolbar`            | `KoenigToolbarItem[]`             | all             | The format buttons to show: `bold`, `italic`, `heading1` to `heading5` (headings stop at H5), `quote`, `link`, `snippet`.                                                        |
| `toolbarActions`     | `KoenigToolbarAction[]`           | none            | Your own buttons and cards on the selection toolbar; see [Toolbar actions](#-toolbar-actions).                                                                                   |
| `collaboration`      | `KoenigCollaboration \| null`     | `null`          | The Yjs provider factory. Without it the editor works alone and asks for no provider.                                                                                            |
| `nodes`              | `EditorNodes`                     | `DEFAULT_NODES` | The base node set the `cards` choice filters. `BASIC_NODES` and `MINIMAL_NODES` are smaller sets.                                                                                |
| `initialEditorState` | `string \| SerializedEditorState` | empty           | The document to open. In a collaborative session it seeds the room only while the room is empty.                                                                                 |
| `fileUploader`       | `Partial<FileUploader>`           | none            | The upload hook cards call as `useFileUpload("image")`, and the accepted file types.                                                                                             |
| `cardConfig`         | `Record<string, unknown>`         | `{}`            | Card settings, for example `createSnippet` and `snippets` to turn on snippets.                                                                                                   |
| `darkMode`           | `boolean`                         | `false`         | Use the dark card styles.                                                                                                                                                        |
| `editable`           | `boolean`                         | `true`          | Start editable or read-only.                                                                                                                                                     |
| `onError`            | `(error: Error) => void`          | `console.error` | Called with errors Lexical catches during updates.                                                                                                                               |

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
(card toolbar buttons), `link`, `image`, `callout`, `toggle` and `snippet`. Plug your i18n in by
building the `strings` object from your translations. Your own cards read the wording in effect
with `useKoenigStrings()`.

### Exports

`KoenigComposer`, `KoenigEditor`, `KoenigComposableEditor`, `AllDefaultPlugins`, `TablePlugin`,
`TABLE_MENU_ITEM`, `DEFAULT_NODES`, `BASIC_NODES`, `MINIMAL_NODES`, `KOENIG_CARD_NAMES`,
`KOENIG_TOOLBAR_ITEMS`, `DEFAULT_STRINGS`, `KoenigStringsContext` and `useKoenigStrings`, plus the
types in `index.d.ts`.

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
under the toolbar. This is how a host adds, for example, an AI card that rewrites the selection.

```tsx
const actions: KoenigToolbarAction[] = [
  {
    id: "rewrite",
    label: "Rewrite",
    Icon: WandIcon, // optional; the first letters of the label show otherwise
    Card: ({ text, replaceSelection, close }) => (
      <RewriteCard
        text={text}
        onAccept={(rewritten) => replaceSelection(rewritten)}
        onCancel={close}
      />
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

## 📋 Tables

The `table` card (on by default, `cards` to leave it out) inserts a 3 by 3 table with a header
row from the "+" and slash menus. While the cursor is in a table, a toolbar above it adds and
removes rows and columns, switches the header row on and off, and deletes the table. Tables are
simple: no merged cells and no cell colours.

- Keyboard: Tab and Shift+Tab move between cells, the arrow keys move within and between them,
  and Alt+F10 moves focus to the table toolbar (Escape returns to the cell).
- Markup: a real `table` with `th scope="col"` header cells and `td` body cells; the controls are
  buttons in a labelled `role="toolbar"`. The wording is `strings.table`.
- Document: a table is stock `@lexical/table` nodes, so it saves and loads with the rest of the
  document, header row included.

## 🔠 Headings

Headings run from H1 to H5 and no deeper. The toolbar has a button for each level (hide any with
`toolbar`), and a Heading 6 that arrives from a stored document, a paste, a markdown shortcut or
a collaborator is set to Heading 5.

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
- `cursorsContainerRef`, `cursorColor`, `username` and `excludedProperties` go straight to
  Lexical's `CollaborationPlugin`.

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

| Token                  | Default                        | What it sets                                                                                                                 |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `--kg-rem`             | `0.625rem`                     | The length unit for everything the editor draws; the single scale knob.                                                      |
| `--kg-font-size`       | `2rem` (in `--kg-rem` units)   | Body text size (paragraphs, quotes, lists).                                                                                  |
| `--kg-line-height`     | `1.6em`                        | Body line height.                                                                                                            |
| `--kg-font-body`       | `Georgia, Times, serif`        | Body font family (the menus and toolbars use `--kg-font-sans`).                                                              |
| `--kg-font-size-h1`    | `4.4rem` (in `--kg-rem` units) | Heading sizes, H1 to H5: `--kg-font-size-h1` through `--kg-font-size-h5`.                                                    |
| `--kg-selection-color` | black (white in dark mode)     | The colour of selected and focused cards, active toolbar buttons, drop lines and focus outlines. There is no built-in green. |
| `--kg-menu-width`      | `28rem` (in `--kg-rem` units)  | Width of the "+" and slash menus.                                                                                            |
| `--kg-menu-max-height` | `32rem` (in `--kg-rem` units)  | Tallest the menus grow before they scroll; they also shrink to fit the room.                                                 |
| `--kg-plus-size`       | `2.2rem` (in `--kg-rem` units) | Diameter of the "+" button beside an empty line.                                                                             |

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
- Tables: `@lexical/table`'s `table`, `tablerow` and `tablecell` are registered, with Lexical's
  table plugin and a Table entry in the "+" and slash menus (`src/additions/table/`).
- Collaboration: the composer takes a `collaboration` prop instead of opening its own websocket.
- Markdown paste converts with `@lexical/markdown` rather than upstream's Markdown renderer.
- The card menu's links to upstream's help pages are gone.
- Kept: the content styles, the "+" and slash card menus, the floating format and link toolbars,
  card selection, drag to reorder, remote carets, and the image, callout, toggle, divider and
  aside cards.
- Removed: cards that need a Ghost site or service (membership, signup, product, paywall, email
  and email CTA, call to action, button, header, bookmark, embed, audio, video, file, gallery,
  HTML, Markdown, Transistor, Ghost's code block card), the GIF and Unsplash pickers, the Pintura
  image editor, the emoji picker, the TK and at-link nodes, word counts, replacement strings, the
  demo, stories and upstream's tests.
- Images: an image an older document kept inside a paragraph loads as an image card placed after
  that paragraph, because cards sit at the top level. Its `src`, `alt`, `width` and `height` are
  kept.

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
