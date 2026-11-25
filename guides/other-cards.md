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
- **Poster (video).** Select the card for an optional **poster image**, shown in the player before
  play. Type an `http`, `https` or same-origin address, or upload a picture (it goes through
  `useFileUpload("image")`, so the host's image rules apply). It is saved as `poster` on the card and
  written as the `<video poster>` attribute; a card without one has none, and an unsafe address is
  refused with `strings.video.posterError`. Wording: `strings.video.posterLabel`, `posterUpload`,
  `posterRemove`.
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

## ▶️ Embed card (linked video)

An opt-in card for a video that stays on YouTube, Vimeo or Twitch. Turn it on by naming it:
`cards={["image", "embed"]}` (a `cards` list is the only switch: with no list the card is off, and a
document that already holds one still opens, plays nothing and loads nothing).

```tsx
<KoenigComposer
  cards={["image", "embed"]}
  embedParent="blog.example.com" // the page's domain, which Twitch needs
/>
```

- **Click to load.** The card saves the address and an optional title, nothing else, and fetches
  nothing at edit time (no oEmbed call, no thumbnail). It shows a placeholder: the title (or the
  site's name), the site's name, a play button and a privacy line. The player frame is created only
  when the play button is pressed, so no request goes to the video site, and no cookie is set,
  before that. A reader sees the same placeholder; the editor adds a link field and a title field.
- **The player.** YouTube loads from `www.youtube-nocookie.com`, Vimeo with `dnt=1`, Twitch with
  `parent` set to `embedParent` (default: the current page's hostname; a Twitch link is refused
  when there is none). The frame has `sandbox="allow-scripts allow-same-origin allow-presentation"`
  (no top navigation, forms or popups), `referrerpolicy="no-referrer"`, `loading="lazy"` and
  `allow="autoplay; fullscreen"`.
- **Allow-list.** `embedHosts` is the list of sites and how a link on each is read. Default
  `DEFAULT_EMBED_HOSTS`: YouTube (`watch`, `youtu.be`, `embed`, `shorts`, and the nocookie
  domain), Vimeo (`vimeo.com/<id>`, `player.vimeo.com/video/<id>`, a privacy hash kept) and Twitch
  (a channel, a video, a clip). A link must be `https`, with no user name or password, on a hostname
  the list names exactly; `javascript:`, `data:`, `http:`, lookalike hosts and other sites get a plain
  error that names the allowed sites. A saved link the list no longer allows plays nothing.
- **Your own sites.** Pass `embedHosts` with entries of `{ id, label, hostnames, parse }`:
  `parse(url, { parent })` returns the https address of the site's player, or `null` when the link
  is not a video. It is plain string work. `parseEmbedUrl(text, hosts, { parent })` is exported so a
  host can check a link itself; it returns `{ ok: true, source }` or `{ ok: false, reason }`.
- **Saved and exported.** `{ "type": "embed", "url": "...", "title": "..." }` with a block id like
  any block. The exported HTML is `<figure class="kg-card kg-embed-card"><a href>` with the title: a
  plain link and nothing that loads. A host that wants the player in its pages builds it with the
  same rules (and its own click to load).
- **A host node named `embed`.** The package's embed node uses the Lexical type `embed`. When your
  `customNodes` (or `nodes`) already holds a node of type `embed`, for example to keep documents from an
  older app, the package does not register its own: your node reads and writes those documents
  unchanged, the package's embed card is unavailable and its menu entry is hidden even if `cards`
  names `"embed"` (a console warning says so in development). Your node's own menu entry, if it has
  one, still shows. Documents saved with the package's embed card need the package's node, so a host
  that keeps its own `embed` node cannot open them as cards.
- **Wording.** `strings.cards.embed` (menu) and `strings.embed` (the field labels, the privacy line
  and the refusals).

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
