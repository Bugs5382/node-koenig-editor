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

- [The default cards on one page](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/cards.md): what each card and tool is for, how to add it, its limits, keyboard use, accessibility notes and how a host switches it off or replaces it. The playground shows the same page under its Guide tab, with a Try it link under each card.
- [Wording and exports](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/options.md): Every text the editor shows, and everything the package exports.
- [A complete host component](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/host-component.md): One component that turns on every option, to copy from.
- [Toolbar actions](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/toolbar.md): Which format buttons show, the rows they sit in, and how to add your own.
- [Tables](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/tables.md): The table editor: structure, shading, alignment, paste, caption and the figure label.
- [Gallery and header cards](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/gallery-and-header.md): The gallery and header cards, their options, and how to replace their layout.
- [Other cards, the image editor and the emoji picker](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/other-cards.md): Button, markdown, code, file, video and audio cards, the image editor and the emoji picker.
- [Word count, reading time and Preview](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/word-count-and-preview.md): The word count hook and the Preview toggle that shows the reader's view.
- [Writing and text styling](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/writing-and-text.md): Headings, inline formats, text styling, colours, lists, paste, find and replace, alignment and the keyboard.
- [Inline comments](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/comments.md): Threads anchored on selected text, kept in the document, with events for your own storage.
- [Collaboration](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/collaboration.md): Connecting a Yjs provider, what is shared between windows, and custom cards.
- [Styles and theme tokens](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/styles.md): The stylesheet and every CSS custom property you can set.
- [Upstream and what changed](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/upstream.md): Where this package comes from and how it differs from upstream Koenig.
- [Playground and developing the package](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/playground-and-develop.md): Run the demo, build your own, and work on the package.

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
| `cardRenderers`      | `KoenigCardRenderers`                                  | none                  | Your own layout for the `gallery` and `header` cards; see [Gallery and header cards](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/gallery-and-header.md#-gallery-and-header-cards).                                                                                                                                                                                                                                         |
| `gallery`            | `{ maxImages?: number }`                               | `{ maxImages: 50 }`   | Options for the gallery card. `maxImages` is the most photos a gallery takes, and the ceiling for each gallery's own setting. It limits adding photos, never cuts off photos a document already has.                                                                                                                                                                                                                                           |
| `customNodes`        | `EditorNodes`                                          | none                  | Your own node classes, registered after the shipped ones. A node with a static `kgMenu` (a `CardMenuItem` or a list) is listed in the menus.                                                                                                                                                                                                                                                                                                   |
| `comments`           | `KoenigCommentsOptions`                                | off                   | Turns on inline comment threads; see [Inline comments](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/comments.md#-inline-comments).                                                                                                                                                                                                                                                                                          |
| `menuItems`          | `CardMenuItem[]`                                       | none                  | Extra "+" and slash menu entries. Each dispatches its `insertCommand` with `insertParams`; your plugin handles it.                                                                                                                                                                                                                                                                                                                             |
| `strings`            | `KoenigStringsInput`                                   | English               | Your wording, laid over `DEFAULT_STRINGS`. Pass only what you change.                                                                                                                                                                                                                                                                                                                                                                          |
| `toolbar`            | `KoenigToolbarItem[]`                                  | all                   | The format buttons to show: `bold`, `italic`, `underline`, `strikethrough`, `subscript`, `superscript`, `code`, `fontSize`, `textColor`, `highlight`, `fontFamily`, `clearFormatting`, `bulletList`, `numberList`, `checkList`, `indent`, `outdent`, `lineSpacing`, `paragraphSpacing`, `textDirection`, `heading1` to `heading5` (headings stop at H5), `quote`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `link`, `snippet`. |
| `colors`             | `Partial<Record<KoenigColorSlot, KoenigColorSetting>>` | the editor's palettes | Per colour slot: a `palette` of swatches, `picker: false` to switch the colour wheel off, `none: false` to take away the editor's own colour. See [Colours](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/writing-and-text.md#-colours).                                                                                                                                                                                     |
| `fileIcons`          | `false \| { overrides? }`                              | on                    | The file card's type icons; `false` switches them off, `overrides` maps an extension to your own icon component; see [File, video and audio cards](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/other-cards.md#-file-video-and-audio-cards).                                                                                                                                                                                |
| `menuHidden`         | `string[]`                                             | none                  | Card names (for example `"code"`) to leave off the "+" and slash menus; see [Cards](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/cards.md#for-developers-switching-things-off-or-replacing-them).                                                                                                                                                                                                                           |
| `buttonCard`         | `{ colors?, emoji?, required? }`                       | everything shown      | Hide the button's colour and emoji controls, or require its label and link; see [Button and Markdown cards](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/other-cards.md#-button-and-markdown-cards).                                                                                                                                                                                                                        |
| `pasteMarkdown`      | `boolean`                                              | `false`               | Turn pasted plain text written in Markdown into headings, lists and formats; see [Paste](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/writing-and-text.md#-paste-spell-check-and-the-shortcuts-list).                                                                                                                                                                                                                       |
| `codeLanguages`      | `KoenigCodeLanguage[]`                                 | highlighter's         | The languages the code block's list offers, each a `label` and a Prism language `value`; see [Code blocks](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/other-cards.md#-code-blocks).                                                                                                                                                                                                                                       |
| `fonts`              | `KoenigFont[]`                                         | none                  | The fonts the font button offers, each a `label` and a CSS `font-family` `value`; with none the button is not shown.                                                                                                                                                                                                                                                                                                                           |
| `toolbarRows`        | `1 \| 2`                                               | `2`                   | The rows the selection toolbar uses; see [Toolbar actions](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/toolbar.md#-toolbar-actions).                                                                                                                                                                                                                                                                                       |
| `toolbarActions`     | `KoenigToolbarAction[]`                                | none                  | Your own buttons and cards on the selection toolbar; see [Toolbar actions](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/toolbar.md#-toolbar-actions).                                                                                                                                                                                                                                                                       |
| `tools`              | `KoenigTool[]`                                         | all                   | The features that are not cards: `imageEditor`, `emojiPicker`, `preview`, `shortcuts`, `findReplace` and `cleanPaste`. Pass a list to keep only those; see [Image editor and emoji picker](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/other-cards.md#-image-editor-and-emoji-picker) and [Preview](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/word-count-and-preview.md#-preview).                   |
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

The `strings` option (every label and placeholder) and the full list of exports are in [Wording and exports](https://github.com/Bugs5382/node-koenig-editor/blob/main/guides/options.md).

## ⚖️ License

MIT (c) 2026 Shane. Koenig is MIT (c) 2013-2026 Ghost Foundation; its licence is in
`LICENSE-koenig`.
