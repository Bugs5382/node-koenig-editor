# Toolbar actions

Which format buttons show, the rows they sit in, and how to add your own.

## 🧰 Toolbar actions

`toolbarActions` adds your own buttons to the toolbar that appears over selected text, after
Bold, Italic, the headings, Quote and Link. A button either runs a function or opens a card
under the toolbar. This is how a host adds, for example, a card that marks the selection as a note.

```tsx
const actions: KoenigToolbarAction[] = [
  {
    id: "highlight-note",
    label: "Highlight note",
    Icon: NoteIcon, // optional; the first letters of the label show otherwise
    Card: ({ text, replaceSelection, close }) => (
      <NoteCard text={text} onAccept={(note) => replaceSelection(note)} onCancel={close} />
    ),
  },
];

<KoenigComposer toolbarActions={actions} />;
```

The card gets the selected `text`, `replaceSelection(text)`, `close()` and the `editor`.
`replaceSelection` puts the text in place of what was selected when the button was pressed, even
after focus has moved into your card or the answer arrives later. It returns `false` and changes
nothing when that text has been edited or removed in the meantime. Set `hidden: true` to leave
a button out for the person using it (permissions, a feature switch). An action with no `Card`
calls `onSelect` with the same object. The button's `data-kg-toolbar-button` value is its `id`.

### In a read-only editor

A read-only editor (`editable={false}`) shows no selection toolbar. An action with `readOnly: true`
works on the selection and changes no text (a comment, a suggestion, a look-up), and the toolbar
then shows it, in one row, with no format button. Actions without it stay hidden, so a read-only
editor with none still shows nothing. In a read-only editor a card's `replaceSelection` returns
`false` and changes nothing, and typing, `beforeinput`, paste, cut, drop and the formatting
shortcuts all leave the document as it was.

```tsx
const actions: KoenigToolbarAction[] = [
  {
    id: "comment",
    label: "Comment",
    readOnly: true,
    onSelect: (selection) => open(selection.text),
  },
];
<KoenigComposer editable={false} toolbarActions={actions} />;
```

### Rows and where a button goes

The toolbar has two rows: the text formats and styles on the first (Bold to Clear formatting),
blocks, lists, spacing, alignment and Link on the second. Pass `toolbarRows={1}` for a single row
that wraps where the window is narrow. An action chooses its place with two optional fields:

- `row`: the row, counted from 1. Without it the button ends the last built-in row. A number past
  the built-in rows adds a row of your own.
- `after`: a built-in button's name (`"italic"`, `"heading2"`, `"link"`, any value of the `toolbar`
  option) or another action's `id`. The button goes right after it, in that button's row. A name
  that is not known is ignored and `row` decides.

```tsx
const actions: KoenigToolbarAction[] = [
  { id: "note", label: "Note", after: "highlight" }, // first row, next to Highlight
  { id: "cite", label: "Cite", row: 2 }, // end of the second row
  { id: "ai", label: "Rewrite", row: 3 }, // a third row
];
```
