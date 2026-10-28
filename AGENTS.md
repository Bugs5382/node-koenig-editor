# AGENTS.md - node-koenig-editor

Guide for AI agents working in this repository. Pair with `CLAUDE.md` (the working agreement and
hook-enforced rules). Keep this file current when the build, layout, or public API changes.

## What this is

Ghost's Koenig editor on Lexical 0.52 and React 19, packaged for reuse, with optional Yjs collaboration.

An npm library (ESM only) that host apps wrap in their own editor component. It is a
configurable base: it ships the cards, menus, toolbar and styles, and each host turns options on
or off, adds its own nodes, wording and theme. Two things to know before changing it:

- The code under `src/koenig-lexical`, `src/kg-default-nodes` and `src/kg-default-transforms` is
  upstream Koenig (pinned commit in the README). Keep upstream's layout and style there; put new
  code in `src/additions/` and change upstream files only where a feature needs a hook.
- Consumers type-check against the hand-written `index.d.ts`, not the sources. Every public
  value must be declared there, and the surface test fails when a declared value is missing at
  runtime.

## Using node-koenig-editor

- Entry points: `node-koenig-editor` (components, node sets, options) and
  `node-koenig-editor/styles.css`. Nothing else is public.
- Host options live on `KoenigComposer`: `cards`, `customNodes`, `menuItems`, `strings`,
  `toolbar`, `collaboration`. The README documents each, with a complete host component.
- No product code or wording goes into this package. Product nodes, translations and theme stay
  in the host app.
- Lexical, `@lexical/*`, React and Yjs are peers and must never be bundled.

## Layout

- `index.d.ts` - the public declarations, copied into `dist/` by the build
- `src/index.ts` - the runtime entry: re-exports only
- `src/additions/options/` - the host options (cards, strings, toolbar, menu entries)
- `src/additions/table/` - Lexical's table nodes as a card
- `src/koenig-lexical/`, `src/kg-default-nodes/`, `src/kg-default-transforms/` - upstream Koenig
- `src/generated/koenig.css` - the stylesheet, built by `npm run build:css` and committed
- `tailwind.config.cjs` - upstream's Tailwind 3 theme, with the palette and fonts on CSS tokens
- `__tests__/` - vitest + jsdom tests, helpers in `__tests__/__utils__/`
- `scripts/` - `build-css.mjs` and the pack checks

## Build, test, lint

- Build: `npm run build` (Vite library build to `dist/index.js`, plus `index.d.ts` and `styles.css`)
- Stylesheet: `npm run build:css` after changing a class name or `tailwind.config.cjs`
- Test: `npm test` (jsdom; no services needed)
- Lint: `npm run lint`; types: `npm run typecheck` (both skip the upstream folders)
- Package checks (npm packages), after a build: `npm run check:pack` (contents and ceiling),
  `npm run check:pack:growth` (growth against the last release), `npm run check:install`
  (install the tarball, import ESM); see CLAUDE.md "npm package contents"
- License headers: `task license` (upstream and generated files are in `.licignore`); docs:
  `npm run docs`

## Logging

Follow the logging rules in `CLAUDE.md`. In short:

- Log generously: entry and exit of significant operations, decisions and branches, retries, state
  changes, external calls (target, duration, outcome), and every error with its context.
- Levels: `trace` for step-by-step detail, `debug` for flow, `info` for lifecycle, `warn` and
  `error` for problems. The environment filters the volume, so err on the side of too much.
- Environments: local dev `trace` with `LOG_FORMAT=console` (never JSON), dev cluster `debug`,
  qa/staging `info`, production `error`. Every cluster environment logs JSON. Set levels through
  `LOG_LEVEL` and `LOG_FORMAT`, never in code; local settings live in the run target or
  `.env.example`.
- Never log secrets, tokens, or personal data, not even at `trace`. Log an opaque or keyed ID.

## Conventions and gotchas

- See `CLAUDE.md` for the branch/commit/PR rules; they are enforced by the git hooks in
  `.claude/hooks` (run `bash .claude/hooks/install.sh` once per clone).
- Open every PR as a draft. CI skips drafts, so run the full checks locally, push once they pass,
  and mark the PR ready when the work is finished; see CLAUDE.md "CI and Actions minutes".
- Install with `npm install --ignore-scripts`; the build needs no install scripts.
- The menus list a card only when its node is registered; a new shipped card needs its node in
  `DEFAULT_NODES`, a `KoenigCardName`, an entry in `CARD_NODE_TYPES` and its wording in
  `DEFAULT_STRINGS`, and its plugin guarded in `AllDefaultPlugins`.
- New user-facing text goes through `useKoenigStrings()` with an English default, never a literal.
