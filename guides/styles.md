# Styles and theme tokens

The stylesheet and every CSS custom property you can set.

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

`--kg-accent-color` colours links and accent cards; `--kg-selection-color` colours selection and focus. The `grey` scale
carries text, borders and backgrounds, light and dark. Dark styles apply when `darkMode` is set
on the composer.

### Sizing, type and selection tokens

The stylesheet is written for a 10px root (upstream sets `html { font-size: 62.5% }`). Every
length is a multiple of `--kg-rem` so the editor follows your page instead: on the browser's 16px
root one unit is `0.625rem`, i.e. 10px, and it grows with the person's text-size setting. Host
pages that already use the 62.5% root set `--kg-rem: 1rem`. Set these on any ancestor of the
editor.

| Token                  | Default                        | What it sets                                                                                                                                                                                                      |
| ---------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--kg-rem`             | `0.625rem`                     | The length unit for everything the editor draws; the single scale knob.                                                                                                                                           |
| `--kg-font-size`       | `2rem` (in `--kg-rem` units)   | Body text size (paragraphs, quotes, lists).                                                                                                                                                                       |
| `--kg-line-height`     | `1.6em`                        | Body line height.                                                                                                                                                                                                 |
| `--kg-font-body`       | `Georgia, Times, serif`        | Body font family (the menus and toolbars use `--kg-font-sans`).                                                                                                                                                   |
| `--kg-font-size-h1`    | `4.4rem` (in `--kg-rem` units) | Heading sizes, H1 to H5: `--kg-font-size-h1` through `--kg-font-size-h5`.                                                                                                                                         |
| `--kg-selection-color` | black (white in dark mode)     | The colour of selected and focused cards, active toolbar buttons, drop lines and focus outlines. There is no built-in green.                                                                                      |
| `--kg-menu-width`      | `28rem` (in `--kg-rem` units)  | Width of the "+" and slash menus.                                                                                                                                                                                 |
| `--kg-menu-max-height` | `32rem` (in `--kg-rem` units)  | Tallest the menus grow before they scroll; they also shrink to fit the room.                                                                                                                                      |
| `--kg-breakout-room`   | `1.8rem` (in `--kg-rem` units) | How far a wide or full card (the gallery, a wide image) may extend past the text column on each side. Set it large (`100vw`) when the editor spans the whole page, to get the viewport-wide cards upstream draws. |
| `--kg-plus-size`       | `2.2rem` (in `--kg-rem` units) | Diameter of the "+" button beside an empty line.                                                                                                                                                                  |

The `--kg-font-size-h2`, `--kg-font-size-h3`, `--kg-font-size-h4` and `--kg-font-size-h5`
defaults are `3.2rem`, `2.5rem`, `2.2rem` and `2rem`. The editor itself sets `--kg-menu-fit`
(the room left for an open menu) on the menu; leave it alone. The "+" and slash menus are drawn in a portal inside the editor's root, positioned
against the viewport: they are never clipped by the editor's overflow (an empty document
included), open above the line when there is no room below, and scroll when taller than the room.
