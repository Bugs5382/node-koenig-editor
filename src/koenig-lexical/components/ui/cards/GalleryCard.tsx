import DeleteIcon from '../../../assets/icons/kg-trash.svg?react';
import React from 'react';
import {IconButton} from '../IconButton';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {GalleryViewer} from '../../../../additions/gallery/GalleryViewer';
import {ImageTextDialog} from '../../../../additions/gallery/ImageTextDialog';
import {ProgressBar} from '../ProgressBar';
import {Tooltip} from '../Tooltip';
import {photoKey, useGalleryText} from '../../../../additions/gallery/galleryText';

function TextIcon({className}) {
    return (
        <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path d="M2 3.5h12M2 7.5h12M2 11.5h7" strokeLinecap="round" />
        </svg>
    );
}

function ExpandIcon({className}) {
    return (
        <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function ChevronIcon({className, up}) {
    return (
        <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path d={up ? 'M3.5 10.5 8 6l4.5 4.5' : 'M3.5 5.5 8 10l4.5-4.5'} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function GalleryRow({index, images, deleteImage, isDragging, isSelected, listIndexOf, total, moveImage, text, announce, openViewer, readOnly, updateImageText, strings, unescapeHtml}) {
    const GalleryImages = images.map((image, idx) => {
        const position =
            images.length === 1 ? 'single' :
                idx === 0 ? 'first' :
                    idx === images.length - 1 ? 'last' :
                        'middle';

        return <GalleryImage key={image.fileName + (image.src || image.previewSrc)} deleteImage={deleteImage} image={image} isDragging={isDragging} isSelected={isSelected} listIndex={listIndexOf(image)} moveImage={moveImage} announce={announce} openViewer={openViewer} position={position} readOnly={readOnly} strings={strings} text={text} total={total} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />;
    });


    return (
        <div className={index !== 0 ? 'mt-4' : ''}>
            <div className="flex flex-row justify-center" data-row={index}>
                {GalleryImages}
            </div>
        </div>
    );
}

// Fills {n}, {total} and {other} in one of the gallery's wordings.
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (match, name) => (values[name] === undefined ? match : String(values[name])));

function GalleryImage({image, deleteImage, position, isDragging, isSelected, listIndex, total, moveImage, text, announce, openViewer, readOnly, updateImageText, strings, unescapeHtml}) {
    const itemRef = React.useRef(null);
    const keyRef = photoKey(image);

    // Alt with the left or right arrow moves the focused photo, for people who cannot drag. This
    // listens on the photo itself, below the editor's own key handling, so the arrow keys do not
    // also move the editor's cursor.
    const latest = React.useRef({});
    latest.current = {listIndex, total, moveImage, announce, strings};
    React.useEffect(() => {
        const element = itemRef.current;
        if (!element) {
            return undefined;
        }
        const onKeyDown = (event) => {
            if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const {listIndex: from, total: count, moveImage: move, announce: say, strings: words} = latest.current;
            const to = event.key === 'ArrowLeft' ? from - 1 : from + 1;
            const values = {n: from + 1, total: count};
            if (to < 0) {
                say(fill(words.imageAtStart, values));
                return;
            }
            if (to >= count) {
                say(fill(words.imageAtEnd, values));
                return;
            }
            move(from, to);
            say(fill(to < from ? words.imageMovedBefore : words.imageMovedAfter, {...values, other: to + 1}));
            // The moved photo may be a new element (it can change row); put focus back on it.
            window.requestAnimationFrame(() => {
                element.closest('[data-gallery]')?.querySelector(`[data-photo-key="${keyRef}"]`)?.focus();
            });
        };
        element.addEventListener('keydown', onKeyDown);
        return () => element.removeEventListener('keydown', onKeyDown);
    }, [keyRef]);
    const editButtonRef = React.useRef(null);
    const [editingText, setEditingText] = React.useState(false);
    const panelId = React.useId();
    const hasText = Boolean(image.title || image.caption);
    const collapsed = hasText && text.isCollapsed(image);
    const aspectRatio = (image.width || 1) / (image.height || 1);
    const style = {
        flex: `${aspectRatio} 1 0%`
    };

    let classes = [];
    let overlayClasses = [];

    switch (position) {
    case 'first':
        classes = ['pr-2'];
        overlayClasses = ['mr-2'];
        break;
    case 'middle':
        classes = ['pl-2', 'pr-2'];
        overlayClasses = ['ml-2', 'mr-2'];
        break;
    case 'last':
        classes = ['pl-2'];
        overlayClasses = ['ml-2'];
        break;
    default:
    }

    return (
        <div
            ref={itemRef}
            aria-label={isSelected ? fill(strings.imageLabel, {n: listIndex + 1, total}) : undefined}
            className={`group/image relative ${classes.join(' ')}`}
            data-gallery-image
            data-image
            data-photo-key={keyRef}
            data-testid="gallery-image"
            role={isSelected ? 'group' : undefined}
            style={style}
            tabIndex={isSelected ? 0 : undefined}
        >
            <img
                alt={image.alt}
                className="pointer-events-none block size-full"
                decoding="async"
                height={image.height}
                loading="lazy"
                src={image.previewSrc || image.src}
                width={image.width}
            />

            {isDragging ? null : (
                <div className={`${isSelected ? 'opacity-100' : 'opacity-0'} pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 transition-all focus-within:opacity-100 group-hover/image:opacity-100 ${overlayClasses.join(' ')}`}>
                    <div className="pointer-events-auto flex flex-row-reverse gap-1">
                        {readOnly ? null : <IconButton Icon={DeleteIcon} label="Delete" onClick={() => deleteImage(image)} />}
                        {readOnly ? null : (
                            <button
                                ref={editButtonRef}
                                aria-label={strings.editImageText}
                                className="group pointer-events-auto relative flex h-8 w-9 cursor-pointer items-center justify-center rounded-md bg-white/90 text-grey-900 transition-all hover:bg-white hover:text-black"
                                data-gallery-image-text-edit
                                type="button"
                                onClick={() => setEditingText(true)}
                            >
                                <TextIcon className="size-4 stroke-2" />
                                <Tooltip label={strings.editImageText} />
                            </button>
                        )}
                        <button
                            aria-label={strings.openImageFullScreen}
                            className="group pointer-events-auto relative flex h-8 w-9 cursor-pointer items-center justify-center rounded-md bg-white/90 text-grey-900 transition-all hover:bg-white hover:text-black"
                            data-gallery-image-fullscreen
                            type="button"
                            onClick={event => openViewer(listIndex, event.currentTarget)}
                        >
                            <ExpandIcon className="size-4 stroke-2" />
                            <Tooltip label={strings.openImageFullScreen} />
                        </button>
                    </div>
                </div>
            )}

            {hasText ? (
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 ${overlayClasses.join(' ')}`} data-gallery-image-text-wrap>
                    <div
                        className={collapsed ? 'sr-only' : 'pointer-events-auto bg-black/80 py-2 pl-3 pr-11 font-sans text-sm leading-snug text-white'}
                        data-collapsed={collapsed ? 'true' : 'false'}
                        data-gallery-image-text
                        id={panelId}
                    >
                        {image.title ? <strong className="block font-semibold">{unescapeHtml(image.title)}</strong> : null}
                        {image.caption ? <span className="block">{unescapeHtml(image.caption)}</span> : null}
                    </div>
                    <button
                        aria-controls={panelId}
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? strings.showImageText : strings.hideImageText}
                        className="pointer-events-auto absolute bottom-1 right-1 flex size-8 cursor-pointer items-center justify-center rounded-md bg-black/80 text-white hover:bg-black"
                        data-gallery-image-text-toggle
                        type="button"
                        onClick={() => text.toggleImage(image)}
                    >
                        <ChevronIcon className="size-4 stroke-2" up={collapsed} />
                    </button>
                </div>
            ) : null}

            {editingText ? (
                <ImageTextDialog
                    alt={image.alt || ''}
                    caption={unescapeHtml(image.caption || '')}
                    opener={editButtonRef.current}
                    strings={strings}
                    title={unescapeHtml(image.title || '')}
                    onClose={() => setEditingText(false)}
                    onSave={({title, caption, alt}) => updateImageText(listIndex, {title, caption, alt})}
                />
            ) : null}

        </div>
    );
}

function PopulatedGalleryCard({images, deleteImage, reorderHandler, isDragging, isSelected, moveImage, readOnly, updateImageText, strings, unescapeHtml}) {
    const rows = [];
    const withText = images.filter(image => image.title || image.caption);
    const text = useGalleryText(images, withText);
    const [announcement, announce] = React.useState('');
    const [viewing, setViewing] = React.useState(null);
    const openViewer = (index, opener) => setViewing({index, opener});
    const noOfImages = images.length;

    // 3 images per row unless last row would have a single image in which
    // case the last 2 rows will have 2 images
    const maxImagesInRow = function (idx) {
        return noOfImages > 1 && (noOfImages % 3 === 1) && (idx === (noOfImages - 2));
    };

    images.forEach((image, idx) => {
        let row = image.row || 0;

        // start a new display row if necessary
        if (maxImagesInRow(idx)) {
            row = row + 1;
        }

        if (!rows[row]) {
            rows[row] = [];
        }

        rows[row].push(image);
    });

    const GalleryRows = rows.map((rowImages, idx) => {
        // eslint-disable-next-line react/no-array-index-key
        return <GalleryRow key={idx} deleteImage={deleteImage} images={rowImages} index={idx} isDragging={isDragging} isSelected={isSelected} listIndexOf={image => images.indexOf(image)} announce={announce} moveImage={moveImage} openViewer={openViewer} readOnly={readOnly} strings={strings} text={text} total={noOfImages} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />;
    });

    return (
        <div ref={reorderHandler.setContainerRef} className="not-kg-prose relative flex flex-col" data-gallery>
            {GalleryRows}
            <div aria-live="polite" className="sr-only" data-gallery-announce role="status">{announcement}</div>
            <div className="absolute left-3 top-3 z-10 flex gap-1" data-kg-allow-clickthrough="false">
                <button
                    aria-label={strings.openGalleryFullScreen}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-black/80 text-white hover:bg-black"
                    data-gallery-fullscreen
                    type="button"
                    onClick={event => openViewer(0, event.currentTarget)}
                >
                    <ExpandIcon className="size-4 stroke-2" />
                </button>
                {withText.length ? (
                    <button
                        aria-label={text.allCollapsed ? strings.showAllImageText : strings.hideAllImageText}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-black/80 text-white hover:bg-black"
                        data-gallery-text-toggle-all
                        type="button"
                        onClick={text.toggleAll}
                    >
                        <TextIcon className="size-4 stroke-2" />
                    </button>
                ) : null}
            </div>
            {viewing ? (
                <GalleryViewer
                    index={viewing.index}
                    isCollapsed={text.isCollapsed}
                    opener={viewing.opener}
                    photos={images}
                    strings={strings}
                    toggleText={text.toggleImage}
                    unescape={unescapeHtml}
                    onClose={() => setViewing(null)}
                    onIndexChange={index => setViewing(current => ({...current, index}))}
                />
            ) : null}
        </div>
    );
}

// The editor's setting for how many photos this gallery takes. The host's limit is the most it can
// be; the number already in the gallery is the least, so lowering it never drops a photo.
function GallerySettings({count, hostMaxImages, maxImages, setMaxImages, strings}) {
    const [draft, setDraft] = React.useState(String(maxImages));
    React.useEffect(() => setDraft(String(maxImages)), [maxImages]);
    const commit = () => {
        setMaxImages(draft);
        setDraft(String(maxImages));
    };

    return (
        <div className="not-kg-prose mt-2 flex flex-col gap-1 font-sans text-sm" data-kg-allow-clickthrough data-kg-settings-panel data-koenig-dnd-disabled>
            <label className="flex items-center gap-2">
                <span className="whitespace-nowrap">{strings.maxImagesLabel}</span>
                <input
                    className="w-20 rounded border border-grey-300 bg-transparent px-2 py-1"
                    data-gallery-max-input
                    inputMode="numeric"
                    max={hostMaxImages}
                    min={Math.max(count, 1)}
                    type="number"
                    value={draft}
                    onBlur={commit}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commit();
                        }
                    }}
                />
            </label>
            <span className="text-grey-600">{fill(strings.maxImagesHint, {host: hostMaxImages, n: count})}</span>
        </div>
    );
}

function EmptyGalleryCard({openFilePicker, isDraggedOver, maxImages, reorderHandler, strings}) {
    return (
        <MediaPlaceholder
            desc={fill(strings.select, {max: maxImages})}
            filePicker={openFilePicker}
            icon='gallery'
            isDraggedOver={isDraggedOver}
            multiple={true}
            placeholderRef={reorderHandler.setContainerRef}
            size='large'
        />
    );
}

function UploadOverlay({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    return (
        <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="gallery-progress">
            <ProgressBar bgStyle="transparent" style={progressStyle} />
        </div>
    );
}

function FileDragOverlay({maxImages, strings}) {
    return (
        <div className="bg-black-60 pointer-events-none absolute inset-0 flex items-center bg-black/60" data-kg-card-drag-text>
            <span className="sans-serif fw7 f7 block w-full text-center font-bold text-white">
                {fill(strings.dropToAdd, {max: maxImages})}
            </span>
        </div>
    );
}

export function GalleryCard({
    caption,
    clearErrorMessage,
    deleteImage,
    filesDropper,
    errorMessage,
    fileInputRef,
    imageMimeTypes = [],
    hostMaxImages,
    maxImages,
    readOnly = false,
    setMaxImages,
    images = [],
    isSelected,
    moveImage,
    onFileChange,
    strings,
    unescapeHtml,
    updateImageText,
    uploader = {},
    reorderHandler = {}
}) {
    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const {isLoading, progress} = uploader;
    const {isDraggedOver: filesDraggedOver} = filesDropper;
    const {isDraggedOver: reorderDraggedOver} = reorderHandler;
    const isDragging = filesDraggedOver || reorderDraggedOver;

    return (
        <figure>
            <div ref={filesDropper.setRef} className="not-kg-prose relative" data-testid="gallery-container">
                {images.length
                    ? <PopulatedGalleryCard deleteImage={deleteImage} images={images} isDragging={isDragging} isSelected={isSelected} moveImage={moveImage} readOnly={readOnly} reorderHandler={reorderHandler} strings={strings} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />
                    : readOnly ? null : <EmptyGalleryCard isDraggedOver={isDragging} maxImages={maxImages} openFilePicker={openFilePicker} reorderHandler={reorderHandler} strings={strings} />
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {images.length && filesDraggedOver ? <FileDragOverlay maxImages={maxImages} strings={strings} /> : null}

                {errorMessage && !isDragging ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60" data-testid="gallery-error">
                        <span className="center sans-serif f7 block bg-red px-2 font-bold text-white">
                            {errorMessage}
                            <button className="ml-2 cursor-pointer underline" data-testid="clear-gallery-error" type="button" onClick={clearErrorMessage}>
                                {strings.dismiss}
                            </button>
                        </span>
                    </div>
                ) : null}

                {readOnly ? null : (
                    <form onChange={onFileChange}>
                        <input
                            ref={fileInputRef}
                            accept={imageMimeTypes.join(',')}
                            hidden={true}
                            multiple={true}
                            name="image-input"
                            type='file'
                        />
                    </form>
                )}
            </div>

            {!readOnly && images.length ? (
                <div className="not-kg-prose mt-1 text-right font-sans text-xs text-grey-600" data-gallery-count>
                    {fill(strings.countOf, {n: images.length, max: maxImages})}
                </div>
            ) : null}

            {caption}

            {!readOnly && isSelected && images.length ? (
                <GallerySettings count={images.length} hostMaxImages={hostMaxImages} maxImages={maxImages} setMaxImages={setMaxImages} strings={strings} />
            ) : null}
        </figure>
    );
}
