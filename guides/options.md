# Wording and exports

Every text the editor shows, and everything the package exports.

### Wording

`DEFAULT_STRINGS` holds every piece of text the editor shows, grouped as `placeholder`,
`nestedPlaceholder`, `titlePlaceholder`, `subtitlePlaceholder`, `errorFallback` (the message a failed card shows; `{card}` is replaced with the card's name), `cards` (each card's menu `label` and `desc`), `menu`, `toolbar`, `table` (the table card's controls), `card`
(card toolbar buttons), `link`, `image`, `button`, `markdown`, `wordCount`, `file`, `video`, `audio`, `callout`, `toggle`, `snippet`, `imageEditor` and `emojiPicker`. Plug your i18n in by
building the `strings` object from your translations. Your own cards read the wording in effect
with `useKoenigStrings()`.

### Your own nodes and the node types the package uses

`customNodes` adds your own Lexical nodes after the shipped ones. The package also registers a few
types of its own that you cannot turn off (the title and subtitle nodes, and `embed`). Lexical keeps
one class per type, so a host node that uses one of those types would be replaced. For `embed`
the package steps aside: when `customNodes` (or `nodes`) holds a node of type `embed`, the package's
embed node is not registered, the embed card stays unavailable and its menu entry is hidden even if
`cards` lists `"embed"`, and a console warning says so in development. See
[Embed card](./other-cards.md#-embed-card-linked-video).

### Exports

`KoenigComposer`, `KoenigEditor`, `KoenigComposableEditor`, `AllDefaultPlugins`, `TablePlugin`,
`TABLE_MENU_ITEM`, `DEFAULT_NODES`, `BASIC_NODES`, `MINIMAL_NODES`, `KOENIG_CARD_NAMES`,
`KOENIG_TOOLBAR_ITEMS`, `DEFAULT_STRINGS`, `KoenigStringsContext`, `useKoenigStrings`,
`isSafeUrl`, `toSafeUrl`, `renderMarkdown` and the word count functions
(`useKoenigWordCount`, `getWordCount`, `countWords`, `getReadingTime`), the block and post
helpers (`getBlocks`, `getBlockById`, `findImageCards`, `getPostMeta`, `setPostMeta`,
`resolveFeaturedImage`, `EMPTY_POST_META`), `PostSettingsMenu` with `DEFAULT_POST_SETTINGS_STRINGS`, plus the types in
`index.d.ts`.
