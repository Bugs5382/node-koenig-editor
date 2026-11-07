# Upstream and what changed

Where this package comes from and how it differs from upstream Koenig.

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
