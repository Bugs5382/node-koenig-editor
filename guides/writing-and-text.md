# Writing and text styling

Headings, inline formats, text styling, colours, lists, paste, find and replace, alignment and the keyboard.

## ⌨️ Room around cards

A card at the very start or end of the document has no line beside it, so the cursor cannot go
above or below it. The editor adds an empty paragraph there, including to a stored document that
is only a card, and only when there is none. Between two cards it adds nothing: a gap there is
yours to keep or delete with Backspace or Delete, and one you removed is not put back. Enter on a
selected card adds a paragraph after it and puts the cursor in it. A read-only editor and the
editors inside cards are left alone, and changes that arrive from a collaborator are not patched
by this editor, so two editors do not both add one.

The "+" button for an empty line sits inside the editor's box: just before the line when the
padding leaves room, at the box's left edge otherwise, and never outside it.

## 🔠 Headings

Headings run from H1 to H5 and no deeper. The toolbar has a button for each level (hide any with
`toolbar`), and a Heading 6 that arrives from a stored document, a paste, a markdown shortcut or
a collaborator is set to Heading 5.

## 🔤 Inline formats and the keyboard

The selection toolbar has buttons for **underline**, **strikethrough**, **subscript**,
**superscript** and **inline code** after bold and italic, each marked when the selection has the
format. Shortcuts: Ctrl or Cmd with **U** (underline), with Shift and **X** (strikethrough), with
**,** (subscript) and with **.** (superscript). Subscript and superscript exclude each other, and a
format whose button the host's `toolbar` option leaves out has no shortcut either. Inline code is
drawn with a light background and a monospace face; style it with the `.koenig-lexical code` rule.

**Alt+F10** moves focus from the selected text to the first button of the selection toolbar. The
arrow keys, Home and End move between its buttons, Enter or Space applies one, and Escape goes
back to the text with the selection kept. The toolbar is a labelled `role="toolbar"`
(`strings.toolbar.group`).

## 🎨 Text styling

Four buttons in the selection toolbar style the selected text, and a fifth takes styling off:

- **Text size** (`fontSize`): smaller, small, normal, large, larger, set in `em` so the text follows
  the host's type scale.
- **Text colour** (`textColor`): six colours that read on both a light and a dark page, the
  default colour, and a colour wheel for any colour (see [Colours](#-colours)).
- **Highlight** (`highlight`): six light colours and the colour wheel, saved together with ink
  (dark on a light highlight, light on a dark one) so the text reads on any page.
- **Font** (`fontFamily`): the fonts the host gives, shown in their own face. With no `fonts` the
  button is not shown.
- **Clear formatting** (`clearFormatting`, Ctrl or Cmd+**backslash**): takes every inline format and style off
  the selected text.

```tsx
<KoenigComposer
  fonts={[
    { label: "Serif", value: "Georgia, serif" },
    { label: "Mono", value: "Menlo, monospace" },
  ]}
  toolbar={["bold", "italic", "fontSize", "textColor", "fontFamily"]}
/>
```

The styling is the text's own style, so it is saved in the document, survives a reload, and is
inline CSS in the saved HTML. The lists open under their button; the arrow keys move, Enter picks,
Escape closes and returns to the text. Each button is marked while the selection has that style.
The wording is `strings.textStyle` and `strings.toolbar`.

## 🌈 Colours

Every colour setting in the editor (text colour, highlight, the callout's background and text, the
Button card's colours and the Header card's four colours) uses one control: a row of base swatches
for that setting, the editor's own colour, and a colour wheel for any colour. The base palette is
different for each setting; the `colors` option changes it per setting (a "slot"):

```tsx
<KoenigComposer
  colors={{
    textColor: { palette: [{ label: "Brand blue", value: "#1D4ED8" }] },
    highlight: { picker: false },
    calloutBackground: { palette: brand, picker: false, none: false },
  }}
/>
```

- `palette`: the swatches that setting shows, each a `label` and a `#rgb` or `#rrggbb` `value`.
- `picker`: `false` takes the colour wheel away, so the person can only use the palette.
- `none`: `false` takes away the editor's own colour, so a colour is always set.

With `picker: false` and `none: false` the host forces the colours of that setting to its list. If that list has one swatch, the toolbar button for a text colour or highlight applies it directly and takes it off again, with no menu.
The slots are `textColor`, `highlight`, `calloutBackground`, `calloutText`, `buttonBackground`,
`buttonText`, `headerBackground`, `headerText`, `headerButton`, `headerButtonText`, `tableBand`,
`tableBrand`, `tableCell` and `tableBorder`. Highlight writes dark or light text with the colour, whichever reads on it.

## 📃 Lists and spacing

The selection toolbar has **Bulleted list** (`bulletList`), **Numbered list** (`numberList`) and
**Checklist** (`checkList`), each marked when the selection is in that kind of list and pressed
again to go back to paragraphs, and **Decrease indent** and **Increase indent** (`outdent`,
`indent`; Tab and Shift+Tab already do this inside a list). A checklist item has a box before its
text that a click, or Space with the cursor in the item, ticks; the item is a `role="checkbox"`
with `aria-checked`, the state is saved with it, and the box and tick follow `--kg-selection` and
the system colours in forced-colours mode.

**Line spacing** (`lineSpacing`: single, 1.15, 1.5, double) and **Paragraph spacing**
(`paragraphSpacing`: none, small, medium, large; the space after the block) apply to the selected
blocks. They are saved on the block, drawn as inline CSS, and written as inline `line-height` and
`margin-bottom` into the saved HTML. "Default" takes them off.

## 📋 Paste, spell check and the shortcuts list

**Clean paste** (the `cleanPaste` tool). HTML pasted from Word, Google Docs or a web page is cleaned
before the editor reads it: the head, styles, comments and Office tags go, every font, size, colour
and spacing setting goes, Word's lists (paragraphs with bullet characters) become real nested
bulleted and numbered lists, Docs' `b` wrapper no longer makes the paste bold, and bold, italic,
underline, strikethrough, superscript and subscript written as styles become the editor's own
formats. Headings, links (safe ones only), tables and images stay. Copying inside the editor, a
pasted link, and a picture with its file are left to the editor's own handling.

**Spell check.** The browser's own spell check works in the editing area unless the composer says
`spellCheck={false}`; `lang="de"` (any BCP 47 tag) tells the browser which language to check in and
sets the `lang` attribute of the editing area.

**Keyboard shortcuts** (the `shortcuts` tool). Ctrl or Cmd with **/** opens a list of the shortcuts
that are on in this editor, in groups, with the keys for this platform; a shortcut whose button the
host's `toolbar` option leaves out is not listed. Escape or Close returns to the text. Its wording is
`strings.shortcuts`. `tools={["preview"]}` (any list without them) turns clean paste and the list off.

## 🔎 Find and replace

Ctrl or Cmd with **F** (the `findReplace` tool) opens a bar over the editor with a find field
(filled from a one-line selection), Previous and Next (Enter and Shift+Enter in the field step
through too), **Match case**, a replace field with **Replace** and **Replace all**, a live count
("2 of 5", "No matches", "5 replaced") and Close. Escape closes it and puts focus back in the text. The query is plain text,
never a pattern; a match can run across bold, italic and other formatting inside a block, and
the matches follow the text while it is edited. Where the browser has the CSS Custom Highlight API
the matches are highlighted in the text, the current one stronger (`::highlight(kg-find)` and
`::highlight(kg-find-current)`, from `--kg-selection`; system colours in forced-colours mode).
While the editor is read-only (Preview) the replace controls are not shown. Replace all is one
step in the undo history. Its wording is `strings.find`.

## ↔️ Text alignment

The selection toolbar has Align left, Align center, Align right and Justify, for paragraphs,
headings, quotes and list items. They set the alignment of the block the selection is in, mark the
one that is active, and work from the keyboard with Ctrl or Cmd plus Shift and **L**, **E**, **R**
or **J**. The alignment is the block's own format, so it is saved in the document, shows in the
reader's view and in the saved HTML as `text-align`, and survives a reload.

**Text direction** (`textDirection`) sets the selected blocks to automatic, left to right or right
to left. Automatic is the default: a block follows its own text (`dir="auto"`), so a Hebrew or Arabic
paragraph already reads right to left, and mixed text follows its first strong character. A choice
is saved on the block (`direction`), drawn as `dir`, and kept in the saved HTML. A list or a table is
one block, so it turns around whole: bullets and numbers move to the right, table columns run right to
left, and a quote's bar moves to the right edge.

Right-to-left text is handled: a block with no stored alignment counts as start-aligned, so in a
Hebrew or Arabic paragraph the Align right button is the marked one. Nested card text (a callout,
a caption) has no alignment.

Leave the buttons out with `toolbar` (`toolbar={["bold", "italic"]}` shows none of them). That also
turns the shortcuts off, and, as before, alignment in a document is then removed from paragraphs,
headings and quotes.

In a read-only editor (and the reader's view) the selection toolbar does not show, so nothing in
it can change the document.

In a table cell the same buttons align the cell (not the paragraph in it), the toolbar adds Align
top, middle and bottom, and a small "apply to" button cycles between this cell, the row, the column
and the table. The shortcuts act on the cell too.
