# Blocks, the title and post settings

How the document's blocks are identified, the optional title block, the line after every card, and the Medium-style post settings menu.

## 🧱 One flat list of blocks

Every top-level block is a sibling in one list: the title (when it is on), paragraphs, headings,
quotes, lists, tables, code blocks and every card. Each one saves the same way, a `type` and a
stable short `id`:

```json
{ "type": "paragraph", "$": { "id": "a1f3" }, "children": [] }
{ "type": "image", "$": { "id": "9c0e" }, "src": "https://example.com/a.png" }
```

- The id is four hex characters, unique in the document. A block keeps it when it is edited or
  moved. Cutting a paragraph in two with Enter keeps the id on the first half and gives the second
  a new one. A pasted copy gets a new id; the original keeps its own.
- A document saved before ids existed opens unchanged and gets ids as it loads. A read-only editor
  does not add them.
- Each block's element carries `data-kg-block-id`, `data-kg-block-type` and `data-kg-after` (the
  type of the block above), so a stylesheet or a script can address a block without scanning.
- Blocks inside a card or a list (list items, table cells) have no id; only top-level blocks do.

Read the list without an editor:

```ts
import { getBlocks, getBlockById, findImageCards } from "node-koenig-editor";

getBlocks(document); // [{ id, type, index, after, text, node }, ...]
getBlockById(document, "9c0e"); // the block, or null
findImageCards(document); // the image cards that have an id
```

`document` is the JSON string, the object, or the editor state your `onChange` hands you.

Cards that you add yourself with `customNodes` keep their id if their `exportJSON` spreads the
node's state, the way the shipped cards do.

## 🔤 The title block

```tsx
<KoenigComposer title>            {/* or title={{ placeholder: "Add a headline" }} */}
```

Off by default. When on, the first block of the document is the title: plain text on one line (no
bold, no line breaks), always first, saved as `{ "type": "title" }` with an id like any other
block. The placeholder is `strings.titlePlaceholder` ("Title").

- Enter at the end of the title moves to the first line of the body (a new one if a card is
  next). Enter in the middle splits the title: the rest becomes the body's first line.
- Backspace at the start of the title does nothing; the title is never merged or deleted. A second
  title becomes a paragraph, and a title that is moved goes back to the top.
- The title node is always registered, so a document saved with a title opens in a host that has
  the option off, where it shows as a heading (`h1.kg-title`).
- It exports as `<h1 class="kg-title">`.

## ➕ A line after every card

```tsx
<KoenigComposer cardGaps="every">
```

The default (`"ends"`) keeps an empty line above a first card and below a last one, so the
cursor can always reach them. A gap between two cards is the person's to keep or delete.
`"every"` also keeps an empty paragraph after every card, the code block and the table, as Medium
does, so no two cards touch and the cursor can always land before and after each one. A gap that is
deleted is put back.

## 🗂️ Post fields and the featured image

Fields that belong to the post and sit beside the block list live on the document's root, so they
are saved and loaded with it:

```ts
import { getPostMeta, setPostMeta, resolveFeaturedImage } from "node-koenig-editor";

getPostMeta(document); // { displayTitle, displaySubtitle, featuredImageRef }
setPostMeta(editor, { displayTitle: "A shorter title" }); // inside the composer: api.editorInstance
resolveFeaturedImage(document); // the image card the reference points at, or null
resolveFeaturedImage(document, "9c0e");
```

- `displayTitle` and `displaySubtitle` override the body title in lists, previews and sharing; an
  empty string means fall back to the body title.
- `featuredImageRef` is the id of an image card in the document. `resolveFeaturedImage` returns
  that card (a block with `node.src`, `node.alt`) or `null` when the reference is empty, the card
  was deleted, or it is not an image card.
- Topics, the unlisted setting, sharing and revision history are the host's own settings. They are
  not stored in the document.

## ⋯ PostSettingsMenu

A three-dots button that opens a card with the post fields. It is controlled, has no knowledge of
where the post is stored, and can sit outside the composer, next to a Publish or Save button.

```tsx
import { PostSettingsMenu } from "node-koenig-editor";

<PostSettingsMenu
  document={editorState} // what onChange gave you; the image choices come from it
  value={{ displayTitle, displaySubtitle, featuredImageId, topicIds }}
  onChange={(next) => setSettings(next)}
  topics={[{ id: "design", label: "Design" }]} // omit to hide Topics
  maxTopics={5}
  items={[{ label: "Share draft link", onSelect: openShare }]}
  strings={{ button: "Settings" }} // any part; the rest stays English
  disabled={false}
  darkMode={false}
  align="end" // "start" opens the card rightwards
/>;
```

It has four parts:

- **Display title and Display subtitle**: two optional fields, with the hint that they are shown in
  lists, previews and when shared, and that empty falls back to the story's own title.
- **Featured image**: the image cards found in the document, shown as thumbnails with their alt
  text. The value is the card's block id (`featuredImageId`). Remove clears it. With no images it
  says to add an image to the story first; if the chosen image was deleted it says so and Remove
  still works. Use `resolveFeaturedImage(document, featuredImageId)` to get the card.
- **Topics**: a multi-select from the list you pass in, shown as chips, at most `maxTopics` (5).
  There is no free text. Ids you saved that are no longer in the list still show, by id.
- **Your items**: buttons for things you own (Change topics, Share draft link, Revision
  history). Choosing one closes the menu and calls `onSelect`.

Keyboard and screen readers: the button is `aria-haspopup="dialog"` with `aria-expanded`; the card
is a dialog that takes focus on its first field; Escape or a click outside closes it, and Escape
returns focus to the button. The thumbnails are a radio group and the topics are checkboxes. The
playground's side panel has a "Post settings" card that uses it.

The wording is `DEFAULT_POST_SETTINGS_STRINGS`. `{max}` and `{topic}` are filled in.

To save the post fields in the document instead of in your own store, keep `featuredImageId` in
`featuredImageRef` with `setPostMeta`, and the two display fields beside it.

## ✅ What was changed in the cards

Saving a document used to drop every card's id, and `aside` lost it on load, so a card had no
identity in the saved document. Cards now write their node state, `aside` reads it back, and the
round trip of every block type is tested.

An embed card is not part of the package: nothing is embedded or fetched from outside (see
[Upstream and what changed](upstream.md)).
