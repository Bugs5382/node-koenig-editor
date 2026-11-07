# Koenig editor: the default cards

A card is a block you add to your writing: a picture, a gallery, a table, a button. This page lists
every card the editor comes with, what each one is for, how to add it, and how a developer switches
it off or replaces it. It describes the full default set, so it matches the version that has all 12
cards.

## Quick reference

| Card | Use it for | Add it with | Good to know |
| --- | --- | --- | --- |
| Image | One picture | `/image` | Alt text and caption; regular, wide or full width |
| Gallery | Several pictures in rows | `/gallery` | Up to 50 pictures by default; full-screen viewer |
| Header | A big title at the top of a section | `/header` | Colour or picture background, optional button |
| Callout | A box that stands out | `/callout` | Nine colours, optional emoji |
| Toggle | Text that opens and closes | `/toggle` | A header and hidden content |
| Toggle group | A stack of toggles with no gap | `/toggle-group` | Any number of items; add and remove them |
| Code | Code with line numbers | `/code` or three backticks | Language list, Copy button, highlighting |
| Divider | A line between sections | `/hr` or type `---` | No settings |
| Table | Rows and columns | `/table` | Merge cells, shading, alignment, caption; dashed grid while editing |
| File | A download | `/file` | Title, description, name and size |
| Video | A video you upload | `/video` | Needs captions or a transcript |
| Audio | A sound file you upload | `/audio` | Needs captions or a transcript |
| Button | A call-to-action link | `/button` | Only `http`, `https` and `mailto` links |
| Markdown | Text written in Markdown | `/md` | Raw HTML is shown as text, never run |

Not cards, but part of the editor: the **image editor** (crop and rotate before upload), the
**emoji picker** (in the callout card) and the **word count** (a number and a reading time).

## Adding a card, for any card

- **The plus button.** On an empty line a "+" button appears. Press it and pick a card from the list.
- **The slash menu.** On an empty line type `/`, then a few letters of the card's name
  (`/gallery`, `/callout`). Up and Down choose, Enter adds, Escape closes the menu.
- **Dragging a file in.** Drop a file on the editor and it makes the matching card for the file's
  type (image, video, audio or file) and uploads it through the developer's uploader.
- **A card with an upload** (image, gallery, file, video, audio) opens the file picker when you
  add it from a menu.

Moving around cards, for any card:

- Select a card by clicking it, or by moving onto it with the arrow keys.
- Press **Enter** on a selected card to add a paragraph after it and start typing there.
- Press **Ctrl+Enter** (**Cmd+Enter** on a Mac) to open or close a selected card's settings.
- The editor keeps an empty line above the first card and below the last one, so there is always
  somewhere to put the cursor.

## Image

**For:** one picture in your writing.
**Add it:** the plus button, `/image`, dragging a picture in, or `/image` followed by a web address
to embed a picture that is already online.
**What it can do:**
- Alt text (the description for people who cannot see the picture) and a caption.
- A link on the picture.
- Width: regular, wide or full. (Animated GIFs stay as they are and have no width choice.)
- Before upload, the **image editor** opens to crop and rotate a single picture you add.
- A **figure label**: select the card and choose "Figure label" to add a label such as "Figure", an
  automatic number, a title and a position above or below the picture ("Figure 2: Sunrise"). Numbers
  follow the reading order. In the saved HTML it is the figure's `figcaption`.

**Keyboard:** select the card; its alt text and caption fields are on the card, and Ctrl+Enter (Cmd+Enter on a Mac) opens or closes its settings.
**Accessibility:** write alt text for every picture that carries meaning. Leave it empty only for
pictures that are pure decoration.
**Developer:** `cards` leaves it out; the file types and sizes allowed come from the uploader's
`fileTypes.image`.

## Gallery

**For:** several pictures shown together in tidy rows.
**Add it:** the plus button, `/gallery`, or dragging pictures in.
**What it can do:**
- Up to **50 pictures** by default. The developer sets the ceiling (`gallery.maxImages`). Each
  gallery can have a lower limit of its own in its settings ("Maximum number of images"), never
  below the number of pictures it already holds. The card shows "9 of 50".
- Each picture has a title, a caption and alt text (open them from the picture's icon).
- A caption for the whole gallery.
- The same optional **figure label** as an image ("Figure 3: Harbour at dusk").
- Drag pictures to reorder them.
- A **full-screen viewer** (button on the gallery and on each picture): Left and Right (or swipe)
  move between pictures, Home and End jump to the first and last, Escape closes.
- **Slideshow** settings under a selected gallery: **Auto-advance** (set the seconds), **Random
  order** and **Screen mode** (no thumbnails, controls hide until a key, tap or mouse move; Escape
  shows them first, then exits). The exit control of the normal viewer is always visible.
**Keyboard:** Tab onto a picture, then **Alt+Left** or **Alt+Right** moves it one place. A
spoken message says where it went. A picture text can be collapsed; screen readers still read it.
**Accessibility:** alt text for every picture; the viewer is a dialog that keeps focus inside and
gives focus back when it closes.
**Developer:** `cards` leaves it out; `gallery.maxImages` sets the limit; `gallery.autoAdvance`, `gallery.shuffle` and `gallery.screenMode` (each `false` to switch off) control the slideshow settings; `cardRenderers.gallery`
replaces how it looks while the editor keeps the pictures, uploads and limits.

## Header

**For:** a big title and subtitle that open a section.
**Add it:** the plus button or `/header`.
**What it can do:**
- A title and a subtitle.
- A background colour or a background picture, and the text colour, from the shared colour control.
- Left, centred or right writing.
- An optional button with a label (text, an emoji or both), a link, and its own colours.

**Accessibility:** the title is a styled block, not a heading, so it does not appear in a page
outline. Use a heading for the real structure of the page.
**Developer:** `cards` leaves it out; `cardRenderers.header` replaces how it looks.

## Callout

**For:** a note, a tip or a warning that should not be missed.
**Add it:** the plus button or `/callout`.
**What it can do:**
- Text inside a coloured box. The background and the text colour each come from the shared colour
  control: a row of base colours and, unless the host switched it off, a colour wheel for any
  colour. Saved as a named class when a base colour of the old set is kept, and as inline CSS when a
  colour is picked.
- An optional emoji at the start, picked from the **emoji picker** (searchable, works offline).

**Keyboard (emoji picker):** Down from the search box enters the grid; arrows, Home and End move;
Enter picks; Escape closes.
**Accessibility:** do not rely on the colour alone to say what the note means; say it in words.
**Developer:** `cards` leaves it out; `tools` without `emojiPicker` removes the emoji button; the
`colors` option sets the palettes (`calloutBackground`, `calloutText`) or limits them.

## Toggle

**For:** content most people can skip, such as an answer under a question.
**Add it:** the plus button or `/toggle`.
**What it can do:** a short header that is always visible and a body that opens and closes when
you press the header's arrow.
**Accessibility:** keep the header a clear question or label, because it is what people see before they open it.
**Developer:** `cards` leaves it out.

## Toggle group

**For:** a list of questions and answers, or any set of sections that open and close one by one.
**Add it:** the plus button or `/toggle-group`.
**What it can do:** a stack of toggles that touch, in one outline, with a line between them. A new group
has two items; "Add a toggle" adds another and the cross on an item removes it. There is no limit on
how many it holds. Each item has a header and a body, and a reader opens and closes each one on its own.
**Accessibility:** each item's arrow is a button that says whether it is open; keep every header a clear
question or label.
**Developer:** `cards` leaves it out (`toggleGroup`); `strings.toggleGroup` is the wording for adding
and removing, and the item placeholders and the open/close labels are the single toggle's. Saved as
`<div class="kg-card kg-toggle-group-card">` holding one `kg-toggle-card` per item.

## Code

**For:** snippets, commands and configuration that should keep their spacing.
**Add it:** the plus button, `/code`, or three backticks and a language on an empty line.
**What it can do:** line numbers, syntax highlighting for the chosen language, a language list and a
Copy button on the block (hover it, or put the cursor in it). The copied text has no line numbers.
A reader gets the Copy button only.
**Accessibility:** the language list and the Copy button are real controls with labels; the copy
result is announced.
**Developer:** `codeLanguages` lists the languages; `strings.code` is the wording. The block is part of
the base node set and cannot be left out with `cards`.

## Divider

**For:** a line that separates two parts of the writing.
**Add it:** the plus button, `/hr`, or type `---` on an empty line.
**What it can do:** nothing to set. Select it and press Backspace or Delete to remove it.
**Developer:** `cards` leaves it out.

## Table

**For:** rows and columns of text.
**Add it:** the plus button or `/table`. It starts as 3 by 3 with a header row.
**What it can do:** while the cursor is in a table, a toolbar above it (or a right-click on a cell)
adds, moves and deletes rows and columns, turns the header row and header column on and off, merges
a selected range of cells and splits them again, shades cells, aligns text across and down, sets a
column's width and height (type a size, drag a border, double-click a border to fit the text, or use
Alt with the arrow keys on a selected row or column), draws borders, sets the table's Style (header row and column, banded rows and columns, a brand colour on the header row or first column; band and brand colours come from the shared colour control), drags rows and columns to a new
place and gives the table a caption with an optional label and automatic number ("Table 1: ..."). Drag across cells to select a range, or use Select
row, Select column or Select table, and the shading and alignment apply to all of it. Paste cells
copied from a spreadsheet and they fill the table, adding the rows and columns they need.
**How it looks:** the grid is drawn dashed while you write, so an empty table shows where to type,
and solid for a reader, in print and in the reader's view (Preview). The header row is bold, with no
shade of its own (shade it yourself if you want one); the cell you are in has an outline, and
selected cells are highlighted.
**Keyboard:** Tab and Shift+Tab move between cells; the arrow keys move within and between cells;
**Alt+F10** moves focus to the table toolbar and Escape returns to the cell.
**Accessibility:** the header row is marked up as column headers (and a header column as row
headers); the toolbar buttons and menu items have names; the row and column of the cell you move to
are announced, and so is what a merged cell spans; the caption names the table.
**Developer:** `cards` leaves it out; the wording is `strings.table`. The band and brand colours are
the `tableBand` and `tableBrand` slots of the composer's `colors` option. The borders and header colour
are tokens (`--kg-table-edit-border-style` for the dashed editing line, `--kg-table-border-color`,
`--kg-table-header-bg`); see [Styles and theme tokens](./styles.md).

## File

**For:** a document people can download, such as a PDF.
**Add it:** the plus button, `/file`, or dragging a file in.
**What it can do:** a title, a description, and the file's name and size. It is saved as a
download link. A picture for the file's type sits beside the text (a PDF, a spreadsheet, an archive
and many more; an unknown type gets a plain page with its extension). Select the card and untick
"Show the file type icon" to hide it on that card.
**Limits:** if the developer sets `fileTypes.file`, the card checks the type and size (`maxSize`)
before uploading and names the file in its message.
**Developer:** `cards` leaves it out; `fileIcons={false}` removes the icons everywhere and
`fileIcons={{ overrides: { pdf: MyIcon } }}` draws your own for a type.

## Video

**For:** a video file you upload. Nothing is embedded from another site.
**Add it:** the plus button, `/video`, or dragging a video in.
**What it can do:** plays in the browser's own player, so play, seek, volume and mute work from
the keyboard.
**Captions are required.** Add a **transcript** (plain text) or upload a **WebVTT (`.vtt`)
captions file**. Until you do, the card shows a reminder.
**Limits:** the developer can limit types and size with `fileTypes.video`. The captions file goes
through the file uploader, which must allow `.vtt`.
**Developer:** `cards` leaves it out.

## Audio

**For:** a sound file you upload, such as a podcast episode.
**Add it:** the plus button, `/audio`, or dragging an audio file in.
**What it can do:** plays in the browser's own player. Same captions rule as video: add a
transcript or a `.vtt` file.
**Limits:** `fileTypes.audio` sets the allowed types and size.
**Developer:** `cards` leaves it out.

## Button

**For:** one clear link that you want people to follow.
**Add it:** the plus button or `/button` (typing `cta` or `link` finds it too).
**What it can do:** a label, a link, left, centre or right placement, an optional emoji before the
label (an emoji alone is fine), and the button and text colours from the shared colour control.
**Limits:** only absolute `http`, `https` and `mailto` links are kept. Others (`javascript:`,
`data:`, relative links) are refused and the field says so. A button with no valid link is left
out of the saved HTML.
**Accessibility:** make the label say where the link goes ("Read the report"), not "Click here".
**Developer:** `cards` leaves it out.

## Markdown

**For:** people who prefer to write in Markdown, or are pasting Markdown from elsewhere.
**Add it:** the plus button or `/md`.
**What it can do:** you type Markdown into a text box and the card shows the result. Headings go
no deeper than H5.
**Limits:** raw HTML you type is shown as text, never run. Links and picture sources follow the
same safe-link rule as the button.
**Developer:** `cards` leaves it out.

## Image editor

**For:** cropping and turning a picture before it is uploaded.
**It opens:** when you pick, drop or paste a single image into an image card. Cancel uploads
nothing. GIF and SVG files skip it.
**What it can do:** crop (free, original, 1:1, 4:3, 16:9) and rotate in 90-degree steps. It works
on your device; nothing is sent anywhere until you confirm.
**Keyboard:** Tab stays inside the dialog; Escape cancels. On the crop area, arrow keys move it and
Shift with the arrows resizes it.
**Developer:** `tools` leaves it out (`tools={["emojiPicker"]}` keeps only the emoji picker).

## Emoji picker

**For:** adding an emoji to a callout, to a Button or Header card's label, or to any text.
**It opens:** from the emoji button in the callout card, from the emoji field in a Button or Header
card's settings, from the **Emoji** entry of the plus and slash menus, or by typing `/emoji` anywhere
in the text (inside a sentence, in a callout, in a table cell). Escape closes it and leaves the text.
**What it can do:** search by name and browse the nine standard groups, fully offline.
**Developer:** `tools` leaves it out (`tools={["imageEditor"]}` keeps only the image editor,
`tools={[]}` turns both off).

## Preview

**For:** seeing the document the way a reader will see it, while you write.
**It opens:** from the Preview button above the editor. Press it again to go back to writing.
**What it shows:** the same document with no editing tools: no plus button or slash menu, no
toolbars, no placeholders, no drag handles. Every card shows its reader form: a file is a link,
a toggle opens and closes, a video or audio card shows its title and captions, empty upload slots
are gone.
**What it can do:** pick the width the reader has (desktop, tablet or phone, shown in a frame),
light or dark, and the text size (12 to 20). Nothing you change here changes the document.
**Coming back:** your cursor, selection and scroll position are where you left them, and no change
is lost. It is one document, not a copy.
**Keyboard:** the button is a toggle you reach with Tab and press with Space or Enter; the width,
theme and size choices are radio groups you move through with the arrow keys.
**Developer:** `tools` leaves it out (`tools={["imageEditor", "emojiPicker"]}`). `showPreviewToggle={false}`
hides the default button so you can place `<KoenigPreviewToggle />` yourself, and `preview`,
`defaultPreview` and `onPreviewChange` (or `api.setPreview(true)`) let your own code drive it.

## Word count

**For:** showing "120 words, 1 min read" next to the writing.
**How:** the developer places `useKoenigWordCount()` anywhere inside the composer. It updates as
you type.
**What it counts:** the document's own text (paragraphs, headings, lists, quotes, code and table
cells). Text inside cards is not counted. Reading time assumes 238 words a minute unless the
developer changes it.
**Developer:** do not use the hook and there is no word count.

## The selection toolbar

Not a card: the toolbar that appears over selected text. A developer can show only some of its
buttons with the composer's `toolbar` option, and the demo's settings panel has a checkbox for each.

**What is in it.** Bold, italic, underline, strikethrough, subscript, superscript and inline code;
text size, text colour, highlight and, when the developer gives `fonts`, a font; clear formatting;
bulleted, numbered and check lists, and increase and decrease indent; line spacing and paragraph
spacing; text direction; Heading 1 to 5 and quote; align left, center, right and justify; link; and
any buttons the developer adds.
**Keyboard:** **Alt+F10** moves focus from the selected text to the toolbar; the arrow keys, Home and
End move between its buttons, Enter or Space presses one, and Escape returns to the text with the
selection kept. Ctrl or Cmd with **/** opens the list of every shortcut.
**Shortcuts for formats:** Ctrl or Cmd with B, I, U; with Shift and X for strikethrough; with a comma
for subscript, a period for superscript, a backslash to clear formatting.
**Also in the editor:** **find and replace** (Ctrl or Cmd with F), **clean paste** from Word and
Google Docs (lists, bold and italic kept, fonts and colours dropped), and the browser's spell check
(the developer can turn it off with `spellCheck={false}` and name the language with `lang`).
**Accessibility:** the toolbar is a labelled toolbar; each button has a name and, where it opens a list,
says so; the lists work with the arrow keys; buttons are marked while the selection has that format.
**Developer:** `toolbar` picks the buttons (`toolbar={["bold", "italic", "textColor"]}`), a button left
out also turns its shortcut off; `fonts` gives the font list; `tools` switches clean paste
(`cleanPaste`), find and replace (`findReplace`) and the shortcuts list (`shortcuts`) on or off. See
[Writing and text styling](./writing-and-text.md) for each.

## For developers: switching things off or replacing them

| You want to | Use | Example |
| --- | --- | --- |
| Keep only some cards | `cards` on `KoenigComposer` | `cards={["image", "divider"]}` |
| Remove the image editor, the emoji picker or the preview | `tools` | `tools={[]}` |
| Change how the gallery or header looks | `cardRenderers` | `cardRenderers={{ gallery: MyGallery }}` |
| Change the gallery's picture limit | `gallery` | `gallery={{ maxImages: 12 }}` |
| Add your own card | `customNodes` and `menuItems` | a node with a `kgMenu` entry |
| Change any wording | `strings` | `strings={{ gallery: { ... } }}` |

A card left out of `cards` is missing from the menus and its commands do nothing. Keep the
**divider** in any list you pass: a composer built without it does not start (a known problem,
tracked in the repository's issues).

The full option list is in the README.
