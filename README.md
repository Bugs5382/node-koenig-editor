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
- 🤝 **Optional collaboration** — a Yjs provider factory per document, remote carets included.
- 📄 **Plain Lexical documents** — stock node names (`text`, `heading`, `table`), readable by any Lexical consumer.
- 🪶 **Peers stay yours** — Lexical, `@lexical/*`, React and Yjs are peer dependencies, never bundled.

## 📦 Install

```bash
npm install node-koenig-editor lexical@^0.52.0 @lexical/clipboard@^0.52.0 @lexical/code@^0.52.0 @lexical/html@^0.52.0 @lexical/link@^0.52.0 @lexical/list@^0.52.0 @lexical/markdown@^0.52.0 @lexical/react@^0.52.0 @lexical/rich-text@^0.52.0 @lexical/selection@^0.52.0 @lexical/table@^0.52.0 @lexical/text@^0.52.0 @lexical/utils@^0.52.0 @lexical/yjs@^0.52.0 react@^19.3.0 react-dom@^19.3.0 yjs@^13.6.31
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
| `menuItems`          | `CardMenuItem[]`                  | none            | Extra "+" and slash menu entries. Each dispatches its `insertCommand` with `insertParams`; your plugin handles it.                                                               |
| `strings`            | `KoenigStringsInput`              | English         | Your wording, laid over `DEFAULT_STRINGS`. Pass only what you change.                                                                                                            |
| `toolbar`            | `KoenigToolbarItem[]`             | all             | The format buttons to show: `bold`, `italic`, `heading2`, `heading3`, `quote`, `link`, `snippet`.                                                                                |
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
`nestedPlaceholder`, `cards` (each card's menu `label` and `desc`), `menu`, `toolbar`, `card`
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

`--kg-accent-color` colours links, the selection outline and accent cards. The `grey` scale
carries text, borders and backgrounds, light and dark. Dark styles apply when `darkMode` is set
on the composer.

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
