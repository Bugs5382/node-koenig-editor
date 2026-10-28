import ImageUploadForm from '../ImageUploadForm';
import React from 'react';
import WandIcon from '../../../assets/icons/kg-wand.svg?react';
import {CardCaptionEditor} from '../CardCaptionEditor';
import {CardText, MediaPlaceholder} from '../MediaPlaceholder';
import {IconButton} from '../IconButton';
import {ProgressBar} from '../ProgressBar';
import {isGif} from '../../../utils/isGif';
import {openFileSelection} from '../../../utils/openFileSelection';
import {useKoenigStrings} from '../../../../additions/options';

function PopulatedImageCard({src, alt, previewSrc, imageUploader, imageCardDragHandler, imageFileDragHandler, isPinturaEnabled, openImageEditor, onFileChange}) {
    const strings = useKoenigStrings();
    const progressStyle = {
        width: `${imageUploader.progress?.toFixed(0)}%`
    };

    const progressAlt = imageUploader.progress.toFixed(0) < 100 ? `upload in progress, ${imageUploader.progress}` : '';

    function setRef(element) {
        imageFileDragHandler?.setRef(element);
        imageCardDragHandler?.setRef(element);
    }

    return (
        <div ref={setRef} className="not-kg-prose group/image relative">
            <img
                alt={alt ? alt : progressAlt}
                className={`mx-auto block ${previewSrc ? 'opacity-40' : ''}`}
                data-testid={imageUploader.isLoading ? 'image-card-loading' : 'image-card-populated'}
                src={previewSrc ? previewSrc : src}
            />
            {imageUploader.isLoading ?
                <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50" data-testid="upload-progress">
                    <ProgressBar style={progressStyle} />
                </div>
                : <></>
            }
            {imageCardDragHandler?.isDraggedOver ? (
                <div className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`}>
                    <CardText text={strings.image.dropToGallery} />
                </div>
            ) : null}
            {imageFileDragHandler?.isDraggedOver ? (
                <div className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`} data-testid="drag-overlay">
                    <CardText text={strings.image.dropToReplace} />
                </div>
            ) : null}
            {(isPinturaEnabled && !isGif(src)) &&
                <div className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 opacity-0 transition-all group-hover/image:visible group-hover/image:opacity-100`}>
                    <div className="flex flex-row-reverse">
                        <IconButton Icon={WandIcon} label={strings.card.edit} onClick={() => openImageEditor({
                            image: src,
                            handleSave: (editedImage) => {
                                onFileChange({
                                    target: {
                                        files: [editedImage]
                                    }
                                });
                            }
                        })} />
                    </div>
                </div>
            }
        </div>
    );
}

function EmptyImageCard({onFileChange, setFileInputRef, imageFileDragHandler, errors}) {
    const strings = useKoenigStrings();
    const fileInputRef = React.useRef(null);

    const onFileInputRef = (element) => {
        fileInputRef.current = element;
        setFileInputRef(fileInputRef);
    };

    return (
        <>
            <MediaPlaceholder
                desc={strings.image.select}
                errors={errors}
                filePicker={() => openFileSelection({fileInputRef})}
                icon='image'
                isDraggedOver={imageFileDragHandler?.isDraggedOver}
                placeholderRef={imageFileDragHandler?.setRef}
            />
            <ImageUploadForm
                fileInputRef={onFileInputRef}
                filePicker={() => openFileSelection({fileInputRef})}
                onFileChange={onFileChange}
            />
        </>
    );
}

const ImageHolder = ({
    src,
    altText,
    previewSrc,
    imageUploader,
    onFileChange,
    setFileInputRef,
    imageCardDragHandler,
    imageFileDragHandler,
    isPinturaEnabled,
    openImageEditor
}) => {
    if (previewSrc || src) {
        return (
            <PopulatedImageCard
                alt={altText}
                imageCardDragHandler={imageCardDragHandler}
                imageFileDragHandler={imageFileDragHandler}
                imageUploader={imageUploader}
                isPinturaEnabled={isPinturaEnabled}
                openImageEditor={openImageEditor}
                previewSrc={previewSrc}
                src={src}
                onFileChange={onFileChange}
            />
        );
    } else {
        return (
            <EmptyImageCard
                errors={imageUploader.errors}
                imageFileDragHandler={imageFileDragHandler}
                setFileInputRef={setFileInputRef}
                onFileChange={onFileChange}
            />
        );
    }
};

export function ImageCard({
    isSelected,
    src,
    onFileChange,
    captionEditor,
    captionEditorInitialState,
    altText,
    setAltText,
    setFigureRef,
    fileInputRef,
    cardWidth,
    previewSrc,
    imageUploader,
    imageCardDragHandler,
    imageFileDragHandler,
    isPinturaEnabled,
    openImageEditor
}) {
    const strings = useKoenigStrings();
    const figureRef = React.useRef(null);

    React.useEffect(() => {
        if (setFigureRef) {
            setFigureRef(figureRef);
        }
    }, [figureRef, setFigureRef]);

    const setFileInputRef = (ref) => {
        if (fileInputRef) {
            fileInputRef.current = ref.current;
        }
    };
    return (
        <>
            <figure ref={figureRef} data-kg-card-width={cardWidth}>
                <ImageHolder
                    altText={altText}
                    imageCardDragHandler={imageCardDragHandler}
                    imageFileDragHandler={imageFileDragHandler}
                    imageUploader={imageUploader}
                    isPinturaEnabled={isPinturaEnabled}
                    openImageEditor={openImageEditor}
                    previewSrc={previewSrc}
                    setFileInputRef={setFileInputRef}
                    src={src}
                    onFileChange={onFileChange}
                />
                <CardCaptionEditor
                    altText={altText || ''}
                    altTextPlaceholder={strings.image.altPlaceholder}
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    captionPlaceholder={strings.image.captionPlaceholder}
                    dataTestId="image-caption-editor"
                    isSelected={isSelected}
                    readOnly={!isSelected}
                    setAltText={setAltText}
                />
            </figure>
        </>
    );
}
