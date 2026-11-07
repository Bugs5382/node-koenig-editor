# Wording and exports

Every text the editor shows, and everything the package exports.

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
