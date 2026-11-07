# Word count, reading time and Preview

The word count hook and the Preview toggle that shows the reader's view.

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
