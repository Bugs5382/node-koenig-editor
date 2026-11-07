# Playground and developing the package

Run the demo, build your own, and work on the package.

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
