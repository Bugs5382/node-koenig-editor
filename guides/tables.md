# Tables

The table editor: structure, shading, alignment, paste, caption and the figure label.

## 📋 Tables

The `table` card (on by default, `cards` to leave it out) inserts a 3 by 3 table with a header
row from the "+" and slash menus. While the cursor is in a table, a toolbar above it (and a
right-click menu with the same actions) edits it:

- **Row** and **Column**: insert above, below, left or right; move; delete; switch the header row or
  header column; select the whole row or column.
- **Cell**: merge a selected range, split a merged cell, select the whole table.
- **Colour**: shade the cell, or every cell of a selected range, row, column or table, from a fixed
  palette of eight (or no shading). The text in a shaded cell is always dark, so it reads in light
  and dark. Colours are saved on the cell as real colours, not the editor's own variables, so they
  show on a reader's page.
- **Align**: left, center, right or justify, and top, middle or bottom, for the cell or the selected
  range. The selection toolbar offers the same for text selected in a cell, applied to this cell, the
  row, the column or the table.
- **Width**: automatic, narrow, medium or wide for the cell's column.
- **Size**: the width of the cursor's column and the height of its row in pixels (never narrower than
  40 or shorter than 24), how wide the table is (fill the column, fit its content, or the total of its
  columns), and a button that makes the columns equal again. You can also drag the right border of a
  column or the bottom border of a row (a tip shows the size), double-click a column border to fit the
  column to its text, or select a row or column and press **Alt** with the arrow keys (10 pixels, 40
  with Shift). Column widths are saved as shares of the whole table and row heights as minimum
  heights, so the table looks the same in Preview, in print and in the saved HTML; a table wider than
  its column scrolls sideways inside its own box.
- **Borders**: none, solid, dashed or dotted lines, thin, medium or thick, in a colour from the
  palette, on the outer lines, the inner lines or all lines of a cell, selected range, row, column or
  the whole table. A line two cells share is written on both. They are saved on the cell and written
  into the saved HTML, and "Remove borders" goes back to the table's default lines.
- **Style**: header row and header column switches (the header row is marked up as column headers
  and the header column as row headers), banded rows and banded columns (every second row or column
  in a band colour), and a brand colour on the header row and/or the first column. Each table has
  its own settings. The band and brand colours use the editor's shared colour control: a palette per
  slot, an optional colour wheel, and the host's choices through the composer's `colors` option
  (`colors.tableBand` and `colors.tableBrand`: `palette`, `picker: false` to limit the choice to the
  palette). The ink on each colour is chosen to read on it. The colours are written onto the cells in
  the saved HTML, and a cell you shaded yourself keeps its own colour. The Colour menu's cell colours
  and the Borders popover's line colour follow two more slots, `colors.tableCell` and
  `colors.tableBorder`: a host `palette` replaces the editor's own list, and `none: false` takes away
  the "No colour" and default entries. Both are saved as inline styles, so only real colours (not
  `var(--name)`) are offered.
- **Caption**: the figure entry (see below) for the table: a label such as "Table", an automatic
  number, a title, above or below. The text is the table's accessible name in the editor and a real
  `caption` element in the saved HTML.
- **Drag a row or column**: a grip at the left of the cursor's row and above its column moves it; a
  line shows where it will land. Move up, down, left and right in the menu do the same from the
  keyboard.
- Drag across cells, or use Shift with the arrow keys, to select a range; pasting text from a
  spreadsheet (tabs and line breaks) fills the cells from the cursor and adds the rows and columns it
  needs. A table in the pasted HTML is ignored, so one is never nested in a cell.
- The toolbar and menus show only while the editor is editable, so the reader's view (Preview) has
  none of them. A live region says the row and column of the cell the cursor moves to, and what a
  merged cell spans.

- Keyboard: Tab and Shift+Tab move between cells, the arrow keys move within and between them,
  and Alt+F10 moves focus to the table toolbar (Escape closes a menu, then returns to the cell). In
  a menu the arrow keys, Home and End move, Enter or Space picks and Escape closes.
- Markup: a real `table` with `th scope="col"` (or `scope="row"` for a header column) header cells
  and `td` body cells; the controls are buttons in a labelled `role="toolbar"` that open
  `role="menu"` lists. The wording is `strings.table`.
- Document: a table is stock `@lexical/table` nodes (merged cells, shading, vertical alignment and
  column widths are fields they already save; the cell's alignment is its format; the caption is
  node state on the table), so it saves and loads with the rest of the document, and a table saved
  by an earlier version loads unchanged. The saved HTML carries the merged cells, the shading (with
  dark ink), the alignment, the vertical alignment and the caption.

**How it looks.** A new table shows its grid: 1px cell borders that stay at least 3:1 against the
editor in light and dark (`--grey-700`), a header row that reads as one by its bold text (no
shade of its own), a minimum cell size so an empty table
is a visible grid, an outline on the cell the cursor is in, and a soft highlight on the cells of a
selected range. While the editor is editable the borders are **dashed**, so an empty grid reads as
a place to write; in the reader's view (Preview), in print, and wherever the editor is read-only
they are solid. In forced-colours mode the grid uses the system colours, with a heavier line under
the header. Set the tokens on any ancestor of the editor:

| Token                          | Default                 | What it does                                     |
| ------------------------------ | ----------------------- | ------------------------------------------------ |
| `--kg-table-border-color`      | `--grey-700`            | Cell border colour                               |
| `--kg-table-border-style`      | `solid`                 | Cell border style in the reader's view and print |
| `--kg-table-edit-border-style` | `dashed`                | Cell border style while the editor is editable   |
| `--kg-table-header-bg`         | none (transparent)      | Header row background                            |
| `--kg-table-selected-bg`       | selection colour at 14% | Background of the selected cells                 |

The table, its rows and cells carry the classes `kg-table`, `kg-table-row`, `kg-table-cell`,
`kg-table-cell-header` and `kg-table-cell-selected` for your own rules, and the cell the cursor is
in has `data-kg-active-cell`. The saved HTML is a plain `table`: to show it with the same look on
your own page, wrap it in an element with the class `koenig-lexical` (the stylesheet is scoped to
it), or copy the border and header rules from the tokens above.

### Figure label (tables, images and galleries)

One optional entry gives a table, an image card or a gallery card a **label**, an **automatic number**,
a **title** and a position, **above** or **below**: "Table 1: Quarterly totals". Numbers count the
figures with the same label in reading order and can be switched off per entry. On a table it is the
caption; on an image or gallery card it shows as a line next to the picture (select the card and use
"Figure label"). It is saved with the node, and in the saved HTML it becomes the table's `caption` or
the figure's `figcaption` (a card that already has an author caption keeps it, with the entry as its
own line before it). Its wording is `strings.figure`.
