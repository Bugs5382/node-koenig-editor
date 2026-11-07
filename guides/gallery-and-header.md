# Gallery and header cards

The gallery and header cards, their options, and how to replace their layout.

## 🖼️ Gallery and header cards

Both are in the default card set, so they are in the "+" and slash menus (`/gallery`, `/header`).
`cards` leaves either out, like any other card.

**Gallery.** Up to 50 images by default (`gallery.maxImages` on the composer changes the ceiling; each gallery can set a lower limit of its own, see below). Reorder by dragging. Without a mouse, select the card, focus a
photo (Tab) and press Alt with the left or right arrow key; a short announcement follows ("Image
2 of 5, moved before image 1"). The host's `fileUploader` is called once per image, so a progress
bar or a failure belongs to one picture. Files outside `fileUploader.fileTypes.image.mimeTypes`,
and images past the ninth, are refused with a message (`strings.gallery`) before the uploader is
called. A gallery has its own caption too.

_Full screen._ A button on the gallery, and one on each photo, opens a viewer that fills the
screen, for editors and for people reading the document. It is a modal dialog: focus stays in it,
Escape closes it and returns focus to the button, Left and Right (and swipe on a touch screen)
move between photos, Home and End jump to the first and last, a thumbnail strip jumps to any
photo, and the photo's title and caption show over the bottom with the same collapse control. It
fades only when the person has not asked for reduced motion. The photo's alt text is on the
image, not printed over it.

_Slideshow._ A selected gallery's settings panel also has **Auto-advance** with a seconds box (the
viewer goes to the next photo after that many seconds and starts over after the last; a Pause and
Play button and the Space key stop and start it, and a move by hand starts the wait again),
**Random order** (the strip and the counter keep the set order, the counter showing the photo's own
number; Next, Previous and the automatic advance follow one random pass in which every photo shows
once before any repeats, and a clicked thumbnail counts as shown; the button is disabled, with its
reason, while auto-advance is off) and **Screen mode** (no thumbnail strip; the controls hide after three seconds without
input, and a key, a tap or a mouse move brings them back; Escape shows them first and a second
Escape exits). The exit control of the normal viewer never hides. The settings are saved in the
card and written to the saved HTML as `data-kg-autoplay` (seconds), `data-kg-shuffle` and
`data-kg-screen-mode`, for a page that plays the gallery itself. A host switches any of them off
with `gallery={{ autoAdvance: false, shuffle: false, screenMode: false }}`; a switched-off setting
is not shown and a stored one does not play. A custom `cardRenderers.gallery` gets `slideshow`,
`setSlideshow` and `slideshowOptions`. The wording is `strings.gallery`.

_How many photos._ `gallery.maxImages` (default 50) is the host's ceiling. Select a gallery and its
settings panel has a "Maximum number of images" box for that gallery: at most the host's ceiling,
at least the number of photos already in it, and saved in the card, so the reader's view and the
HTML output (`data-kg-max-images`, never more photos than that) keep to it. The card shows "n of
max". Adding past the limit is refused with a message. A document that already has more photos
than the host's limit keeps them all: the limit is for adding. Many photos load lazily, and the
host's `fileUploader.upload` is called once per photo, up to three at a time, so a host's upload
hook must cope with overlapping calls.

_Title, caption and alt text._ Selecting a photo shows its icons: remove, and an icon that opens a
dialog for that photo's title, caption and alt text (its help text says how to move the photo; focus stays in the dialog, Escape closes it without saving,
Enter in the title saves). The text shows as an overlay along the bottom of the photo, on a solid
dark band so it reads on any picture. Each photo's overlay has a control that collapses it, and
the gallery has one control that collapses or expands them all. Collapsing hides the text from
the eye only: it stays in the page for screen readers (`aria-expanded` on the controls). The
choice is remembered in the viewer's own browser (`localStorage`, under `koenig-gallery-text`);
a photo's own choice wins over the gallery-wide one, and the gallery-wide control sets every
photo again. Where the browser's storage is blocked the choice lasts until the page closes. In
the HTML output the text is written under the photo, inside the photo's `.kg-gallery-image`
block (`.kg-gallery-image-text` with `.kg-gallery-image-title` and `.kg-gallery-image-caption`),
as plain text, and a print rule puts the on-screen overlay under the photo too, collapsed or not.
The wording is `strings.gallery`.

**Header.** A section opener: title, subtitle, a background colour or image, and an optional
button. Its settings are the background and text colours (the shared [colour control](./writing-and-text.md#-colours)),
a background image, alignment (a left, centred or right choice, so there is no list to open) and the
button (a label of text, an emoji or both, with its own two colours); each label stays on one line. Its sizes are multiples of `--kg-rem` and its type uses `--kg-font-sans` and
`--kg-font-size-h1`, so it follows the [theme tokens](./styles.md#-styles-and-theme-tokens). The title is
not a heading node: the H1 to H5 limit and any outline numbering a host builds from headings do
not see it. The background image goes through the host's `fileUploader`.

### Replacing the layout

Pass `cardRenderers` to draw either card yourself, with no fork. A renderer is a React component;
the editor keeps the node, the uploads, the limits and the saving, and hands the component what
it needs. Without an entry the default layout draws. A custom renderer changes how the card looks
in the editor; the saved document and the HTML output are the same.

**The gallery contract** (`KoenigGalleryRenderProps`) has four groups of props:

| Group        | Props                                                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What to show | `images` (each with `alt`, `title` and `caption`, all plain text, plus `src`, `previewSrc`, `width`, `height`), `caption` (the gallery's own caption editor, ready to place), `errorMessage`, `isUploading`, `progress` |
| State        | `isSelected`, and `readOnly`: true when the editor is not editable, so draw a reader's view with no editing controls                                                                                                    |
| Settings     | `maxImages` (this gallery's limit), `hostMaxImages` (the ceiling it cannot exceed), `mimeTypes`                                                                                                                         |
| Callbacks    | `addFiles(files)`, `removeImage(index)`, `moveImage(from, to)`, `replaceImages(list)` (the whole list, for your own drag and drop), `updateImage(index, { alt, title, caption })`, `setMaxImages(n)`, `clearError()`    |

**The header contract** (`KoenigHeaderRenderProps`) carries the card's values (`title`,
`subtitle`, `backgroundColor`, `backgroundImageSrc`, `buttonText`, `buttonEmoji`, `buttonUrl`, `alignment` (`left`, `center` or `right`), the
colours, `layout`), `titleField` and `subtitleField` (their editors, ready to place), `isEditing`,
`isSelected`, `readOnly`, `update(changes)`, `uploadBackgroundImage(file)` and `uploadError`.

**Wrap the default.** `KoenigGalleryCard` and `KoenigHeaderCard` are the default renderers, taking
exactly those props, so you can add to the default instead of replacing it. This adds a download
link to the reader's view of every gallery and leaves editing, the dialog and the full-screen
viewer as they are:

```tsx
import { KoenigGalleryCard, type KoenigGalleryRenderProps } from "node-koenig-editor";

const WithDownloadLink = (props: KoenigGalleryRenderProps) => (
  <div>
    <KoenigGalleryCard {...props} />
    {props.readOnly ? <a href="#all">Download all {props.images.length} photos</a> : null}
  </div>
);

<KoenigComposer cardRenderers={{ gallery: WithDownloadLink }} fileUploader={uploader}>
```

The header works the same way:

```tsx
import { KoenigHeaderCard, type KoenigHeaderRenderProps } from "node-koenig-editor";

const WithBanner = (props: KoenigHeaderRenderProps) => (
  <div className="my-banner">
    <KoenigHeaderCard {...props} />
  </div>
);

<KoenigComposer cardRenderers={{ header: WithBanner }} fileUploader={uploader}>
```

**Draw it all yourself.** This is a bare strip with no full-screen viewer; it shows the contract
at its smallest:

```tsx
import type { KoenigGalleryRenderProps } from "node-koenig-editor";

const Strip = ({
  images,
  addFiles,
  removeImage,
  updateImage,
  moveImage,
  caption,
  maxImages,
  readOnly,
}: KoenigGalleryRenderProps) => (
  <div className="my-gallery">
    {images.map((image, index) => (
      <figure key={image.fileName}>
        <img alt={image.alt} src={image.previewSrc ?? image.src} />
        {readOnly ? null : (
          <>
            <input
              value={image.alt}
              onChange={(e) => updateImage(index, { alt: e.target.value })}
            />
            <button onClick={() => moveImage(index, index - 1)}>Earlier</button>
            <button onClick={() => removeImage(index)}>Remove</button>
          </>
        )}
      </figure>
    ))}
    {!readOnly && images.length < maxImages ? (
      <input multiple type="file" onChange={(e) => addFiles(e.target.files!)} />
    ) : null}
    {caption}
  </div>
);
```

Not included: the parts of upstream's header and gallery that need a Ghost site or service
(Unsplash, the Pintura image editor, the version 1 header editor).
A version 1 header in a saved document still loads and exports; the card edits it with the
current controls.
