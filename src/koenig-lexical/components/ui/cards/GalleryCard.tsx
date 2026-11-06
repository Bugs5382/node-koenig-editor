import DeleteIcon from '../../../assets/icons/kg-trash.svg?react';
import React from 'react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {IconButton} from '../IconButton';
import {MediaPlaceholder} from '../MediaPlaceholder';
import {ImageTextDialog} from '../../../../additions/gallery/ImageTextDialog';
import {ProgressBar} from '../ProgressBar';
import {Tooltip} from '../Tooltip';
import {useGalleryText} from '../../../../additions/gallery/galleryText';

function TextIcon({className}) {
    return (
        <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" viewBox="0 0 16 16">
            <path d="M2 3.5h12M2 7.5h12M2 11.5h7" strokeLinecap="round" />
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

function GalleryRow({index, images, deleteImage, isDragging, isSelected, listIndexOf, total, moveImage, text, updateImageText, strings, unescapeHtml}) {
    const GalleryImages = images.map((image, idx) => {
        const position =
            images.length === 1 ? 'single' :
                idx === 0 ? 'first' :
                    idx === images.length - 1 ? 'last' :
                        'middle';

        return <GalleryImage key={image.fileName + (image.src || image.previewSrc)} deleteImage={deleteImage} image={image} isDragging={isDragging} isSelected={isSelected} listIndex={listIndexOf(image)} moveImage={moveImage} position={position} strings={strings} text={text} total={total} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />;
    });

    const GalleryControls = isSelected && !isDragging ? (
        <div className="flex flex-row justify-center" data-row-controls={index}>
            {images.map((image, idx) => {
                const position =
                    images.length === 1 ? 'single' :
                        idx === 0 ? 'first' :
                            idx === images.length - 1 ? 'last' :
                                'middle';
                return <GalleryImageControls key={image.fileName + (image.src || image.previewSrc)} image={image} listIndex={listIndexOf(image)} moveImage={moveImage} position={position} strings={strings} total={total} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />;
            })}
        </div>
    ) : null;

    return (
        <div className={index !== 0 ? 'mt-4' : ''}>
            <div className="flex flex-row justify-center" data-row={index}>
                {GalleryImages}
            </div>
            {GalleryControls}
        </div>
    );
}

// The alt, caption and reorder controls for one image. They sit in a strip under the row, not inside
// the image's own box: that box is only as tall as the picture, so controls inside it spilled over
// the next row. Each one takes the same width share and side padding as the image above it.
function GalleryImageControls({image, position, listIndex, total, moveImage, updateImageText, strings, unescapeHtml}) {
    const aspectRatio = (image.width || 1) / (image.height || 1);
    const sides = {
        first: 'pr-2',
        middle: 'pl-2 pr-2',
        last: 'pl-2'
    }[position] || '';

    return (
        <div className={`min-w-0 ${sides}`} data-gallery-image-controls style={{flex: `${aspectRatio} 1 0%`}}>
            <div className="not-kg-prose flex min-w-0 flex-col gap-1" data-koenig-dnd-disabled>
                <div className="flex gap-1">
                    <button
                        aria-label={strings.moveEarlier}
                        className="cursor-pointer rounded border border-grey-300 px-2 font-sans text-sm disabled:opacity-40"
                        data-gallery-image-earlier
                        disabled={listIndex <= 0}
                        type="button"
                        onClick={() => moveImage(listIndex, listIndex - 1)}
                    >
                        &larr;
                    </button>
                    <button
                        aria-label={strings.moveLater}
                        className="cursor-pointer rounded border border-grey-300 px-2 font-sans text-sm disabled:opacity-40"
                        data-gallery-image-later
                        disabled={listIndex >= total - 1}
                        type="button"
                        onClick={() => moveImage(listIndex, listIndex + 1)}
                    >
                        &rarr;
                    </button>
                </div>
                <input
                    className="w-full rounded border border-grey-300 bg-transparent px-2 font-sans text-sm"
                    data-gallery-image-alt
                    placeholder={strings.altPlaceholder}
                    type="text"
                    value={image.alt || ''}
                    onChange={e => updateImageText(listIndex, {alt: e.target.value})}
                />
            </div>
        </div>
    );
}

function GalleryImage({image, deleteImage, position, isDragging, isSelected, listIndex, total, moveImage, text, updateImageText, strings, unescapeHtml}) {
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
            className={`group/image relative ${classes.join(' ')}`}
            data-testid="gallery-image"
            style={style}
            data-image
        >
            <img
                alt={image.alt}
                className="pointer-events-none block size-full"
                height={image.height}
                src={image.previewSrc || image.src}
                width={image.width}
            />

            {isDragging ? null : (
                <div className={`${isSelected ? 'visible opacity-100' : 'invisible opacity-0'} pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 transition-all focus-within:visible focus-within:opacity-100 group-hover/image:visible group-hover/image:opacity-100 ${overlayClasses.join(' ')}`}>
                    <div className="pointer-events-auto flex flex-row-reverse gap-1">
                        <IconButton Icon={DeleteIcon} label="Delete" onClick={() => deleteImage(image)} />
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
                    caption={unescapeHtml(image.caption || '')}
                    opener={editButtonRef.current}
                    strings={strings}
                    title={unescapeHtml(image.title || '')}
                    onClose={() => setEditingText(false)}
                    onSave={({title, caption}) => updateImageText(listIndex, {title, caption})}
                />
            ) : null}

        </div>
    );
}

function PopulatedGalleryCard({images, deleteImage, reorderHandler, isDragging, isSelected, moveImage, updateImageText, strings, unescapeHtml}) {
    const rows = [];
    const withText = images.filter(image => image.title || image.caption);
    const text = useGalleryText(images, withText);
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
        return <GalleryRow key={idx} deleteImage={deleteImage} images={rowImages} index={idx} isDragging={isDragging} isSelected={isSelected} listIndexOf={image => images.indexOf(image)} moveImage={moveImage} strings={strings} text={text} total={noOfImages} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />;
    });

    return (
        <div ref={reorderHandler.setContainerRef} className="not-kg-prose relative flex flex-col" data-gallery>
            {GalleryRows}
            {withText.length ? (
                <button
                    aria-label={text.allCollapsed ? strings.showAllImageText : strings.hideAllImageText}
                    className="absolute left-3 top-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-md bg-black/80 text-white hover:bg-black"
                    data-gallery-text-toggle-all
                    type="button"
                    onClick={text.toggleAll}
                >
                    <TextIcon className="size-4 stroke-2" />
                </button>
            ) : null}
        </div>
    );
}

function EmptyGalleryCard({openFilePicker, isDraggedOver, reorderHandler, strings}) {
    return (
        <MediaPlaceholder
            desc={strings.select}
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

function FileDragOverlay({strings}) {
    return (
        <div className="bg-black-60 pointer-events-none absolute inset-0 flex items-center bg-black/60" data-kg-card-drag-text>
            <span className="sans-serif fw7 f7 block w-full text-center font-bold text-white">
                {strings.dropToAdd}
            </span>
        </div>
    );
}

export function GalleryCard({
    captionEditor,
    captionEditorInitialState,
    clearErrorMessage,
    deleteImage,
    filesDropper,
    errorMessage,
    fileInputRef,
    imageMimeTypes = [],
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
                    ? <PopulatedGalleryCard deleteImage={deleteImage} images={images} isDragging={isDragging} isSelected={isSelected} moveImage={moveImage} reorderHandler={reorderHandler} strings={strings} unescapeHtml={unescapeHtml} updateImageText={updateImageText} />
                    : <EmptyGalleryCard isDraggedOver={isDragging} openFilePicker={openFilePicker} reorderHandler={reorderHandler} strings={strings} />
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {images.length && filesDraggedOver ? <FileDragOverlay strings={strings} /> : null}

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
            </div>

            <CardCaptionEditor
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                captionPlaceholder={strings.captionPlaceholder}
                dataTestId="gallery-card-caption"
                isSelected={isSelected}
            />
        </figure>
    );
}
