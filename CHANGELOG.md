# node-koenig-editor

## v1.2.1 - 2026-11-07

### What Changed 👀

#### 🐛 Bug Fixes

- fix(nested-editor): configure nested editors at creation, with the parent's namespace @Bugs5382 (#96)
- fix(toolbar): single-swatch toggle, nested-editor focus guard, narrow toolbar @Bugs5382 (#95)

#### 📄 Documentation

- docs: move the README's per-feature detail into guides/ and shorten the README (#89) @Bugs5382 (#90)

### Extra

**Full Changelog**: https://github.com/Bugs5382/node-koenig-editor/compare/v1.2.0...v1.2.1

## v1.2.0 - 2026-11-07

### What Changed 👀

#### 🚀 Features

- feat(playground): hide the side panel so the editor has the whole width (#81) @Bugs5382 (#82)
- feat(playground): a collaboration option so two windows edit the same document live (#77) @Bugs5382 (#78)
- feat(editor): gallery slideshow options: auto-advance, random order and a screen mode @Bugs5382 (#64)
- feat(editor): shared colour control, code and toggle group cards, table banding, emoji, file icons and the rest of the owner's review @Bugs5382 (#60)
- feat(editor): text styling and the word-processor gap list @Bugs5382 (#57)
- feat(editor): table resize, borders, drag and drop, and a figure entry for tables, images and galleries @Bugs5382 (#55)
- feat(editor): a table editor: merge and split, shading, alignment, caption, row and column tools, ranges and paste @Bugs5382 (#53)
- feat(editor): alignment buttons in the selection toolbar, with shortcuts, saved in the document @Bugs5382 (#52)
- feat(editor): a Preview toggle that shows the document as a published reader sees it @Bugs5382 (#41)
- feat(playground): demo app in the package repo with a live settings panel @Bugs5382 (#36)
- feat(editor): file, video, audio, button and markdown cards, word count, image editor and emoji picker @Bugs5382 (#34)
- feat(editor): image gallery and header cards in the default set, with host-replaceable layout @Bugs5382 (#33)

#### 🐛 Bug Fixes

- fix(editor): the code bar sits centred above the block, and the preview shows its language (#87) @Bugs5382 (#88)
- fix(editor): card text and properties sync live between collaborating windows (#83) @Bugs5382 (#84)
- fix(ci): compare package growth with the PR's base commit, not the last release (#85) @Bugs5382 (#86)
- fix(editor): collaboration with cards no longer throws, and the demo shows its status in the bar (#79) @Bugs5382 (#80)
- fix(editor): let a composer run without a fileUploader @Bugs5382 (#11)
- fix(editor): the selection toolbar stays inside the window at the top and bottom, and the demo sets its rows (#75) @Bugs5382 (#76)
- fix(editor): Random order needs auto-advance, and Next and Previous follow the random pass (#71) @Bugs5382 (#72)
- fix(editor): random order only picks the auto-advance's next photo, and one exit notice (#69) @Bugs5382 (#70)
- fix(editor): the gallery viewer goes round at the ends and the slideshow options use button toggles (#67) @Bugs5382 (#68)
- fix(editor): a composer whose cards leave out the divider mounts instead of throwing @Bugs5382 (#66)
- fix(editor): the selection toolbar's lists open in the toolbar's own layer, on top of its rows @Bugs5382 (#62)
- fix(editor): the preview's scroll restore is cancelled when the editor goes away @Bugs5382 (#51)
- fix(editor): the emoji picker has room for a full row and never scrolls sideways @Bugs5382 (#43)
- fix(editor): headings take the white text token in dark mode @Bugs5382 (#47)
- fix(editor): a new table shows its grid: visible dashed cell borders, a shaded header, and cursor and range highlights @Bugs5382 (#45)
- fix(editor): the plus button opens the card list @Bugs5382 (#40)

### Extra

**Full Changelog**: https://github.com/Bugs5382/node-koenig-editor/compare/v1.1.0...v1.2.0

## v1.1.0 - 2026-11-06

### What Changed 👀

#### 🚀 Features

- feat(editor): host theming, toolbar actions, H1 to H5, table controls and named card errors @Bugs5382 (#22)
- feat(editor): inline comment threads anchored to selected text @Bugs5382 (#13)

### Extra

**Full Changelog**: https://github.com/Bugs5382/node-koenig-editor/compare/v1.0.0...v1.1.0

## v1.0.0 - 2026-11-05

### What Changed 👀

#### 🚀 Features

- feat(editor): extract the Koenig editor build as a package @Bugs5382 (#2)

#### 🐛 Bug Fixes

- fix(ci): read npm 12 pack and view output in the pack checks @Bugs5382 (#6)

### Extra

**Full Changelog**: https://github.com/Bugs5382/node-koenig-editor/compare/524f4ddce9cdb3bb89582919c50356357c884157...v1.0.0
