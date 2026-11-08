# Other cards, the image editor and the emoji picker

Button, markdown, code, file, video and audio cards, the image editor and the emoji picker.

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
[Colours](./writing-and-text.md#-colours)). A picked colour is written as inline CSS on the link. A button with no valid link exports
nothing. Upstream's email-specific markup is not included: every target gets the same link.

**Button options** (the composer's `buttonCard`). `colors: false` hides the colour and text colour
controls and `emoji: false` hides the emoji field, for a host that sets the button's look itself.
`required: true` marks the label and the link as required (`required` and `aria-required` on the
inputs); the editor does not stop a save, so the host reads an incomplete button from the saved
document. Everything is shown and nothing is required by default.

**Markdown.** Write or paste Markdown into a text area; the card shows the rendered result.
`renderMarkdown(source)` does the rendering for both the preview and the exported HTML, so they
cannot differ. Raw HTML in the source is escaped, never passed through. Links and image sources
follow the URL rule above (a link that fails stays plain text), and `######` becomes an H5 to
match the [heading limit](./writing-and-text.md#-headings). Rendering uses [`markdown-it`](https://github.com/markdown-it/markdown-it)
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

**Upload refusals.** A refusal is written as an element with the `data-kg-upload-error` attribute and
`role="alert"`, so a host can style or find it without depending on the editor's own class names.

## 🖼️ Image editor and emoji picker

Neither is a card, so the composer's `cards` option does not list them. Both are on by default;
`tools` turns them off one by one: `tools={["emojiPicker"]}` keeps only the emoji picker, and
`tools={[]}` turns both off. The reader's view has its own tool, `preview`; see [Preview](./word-count-and-preview.md#-preview).

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
  instead, as in [Toolbar actions](./toolbar.md#-toolbar-actions).
