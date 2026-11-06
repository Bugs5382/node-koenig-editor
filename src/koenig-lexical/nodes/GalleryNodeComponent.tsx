import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import useGalleryReorder from '../hooks/useGalleryReorder';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {CardCaptionEditor} from '../components/ui/CardCaptionEditor';
import {GalleryCard} from '../components/ui/cards/GalleryCard';
import {MAX_IMAGES, recalculateImageRows} from './GalleryNode';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// A person types plain text for an image caption; the node stores it as HTML.
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeHtml = value => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const dimensionsOf = async (url) => {
    try {
        return await getImageDimensions(url);
    } catch (e) {
        // an image the browser cannot decode still goes into the gallery, just without a ratio
        return {width: null, height: null};
    }
};

export function GalleryNodeComponent({nodeKey, captionEditor, captionEditorInitialState}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig, cardRenderers} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const strings = useKoenigStrings();
    const fileInputRef = React.useRef();
    const [errorMessage, setErrorMessage] = React.useState(null);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [images, setImagesState] = React.useState(() => {
        return editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            return node.images.map(image => ({...image}));
        });
    });
    // uploads finish after the render that started them, so they read the latest list from here
    const imagesRef = React.useRef(images);

    const imageUploader = fileUploader.useFileUpload('image');
    const mimeTypes = fileUploader.fileTypes?.image?.mimeTypes;

    const setImages = (next) => {
        imagesRef.current = next;
        setImagesState(next);
    };

    // only images that have an address are saved; a preview that is still uploading is not
    const saveToNode = (list) => {
        const saved = list.filter(image => image.src).map(image => ({...image}));
        recalculateImageRows(saved);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setImages(saved);
        });
    };

    const commit = (next) => {
        recalculateImageRows(next);
        setImages(next);
        saveToNode(next);
    };

    const removeImage = (index) => {
        commit(imagesRef.current.filter((_, i) => i !== index));
    };

    const moveImage = (from, to) => {
        const list = [...imagesRef.current];
        if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
            return;
        }
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        commit(list);
    };

    const updateImage = (index, changes) => {
        const list = imagesRef.current.map((image, i) => (i === index ? {...image, ...changes} : image));
        commit(list);
    };

    const addFiles = async (files) => {
        const incoming = Array.prototype.slice.call(files);
        const allowedType = file => !mimeTypes?.length || mimeTypes.includes(file.type);
        const accepted = incoming.filter(allowedType);
        const room = MAX_IMAGES - imagesRef.current.length;
        const chosen = accepted.slice(0, Math.max(room, 0));

        if (accepted.length < incoming.length) {
            setErrorMessage(strings.gallery.fileTypeError);
        } else if (chosen.length < accepted.length) {
            setErrorMessage(strings.gallery.limitError.replace('{max}', String(MAX_IMAGES)));
        }

        if (chosen.length === 0) {
            return;
        }

        // previews first, so the person sees the images straight away
        const pending = [];
        for (const file of chosen) {
            const previewSrc = URL.createObjectURL(file);
            const {width, height} = await dimensionsOf(previewSrc);
            pending.push({file, image: {fileName: file.name, previewSrc, width, height, alt: '', caption: ''}});
        }
        setImages([...imagesRef.current, ...pending.map(p => p.image)]);

        // the host's uploader is called once for each image
        setIsUploading(true);
        for (const {file, image} of pending) {
            let result = null;
            try {
                result = await imageUploader.upload([file]);
            } catch (e) {
                console.error('Gallery upload failed for one image', e);
            }
            const url = result?.[0]?.url;
            if (!url) {
                setErrorMessage(strings.gallery.uploadError);
                setImages(imagesRef.current.filter(i => i !== image));
                continue;
            }
            const list = imagesRef.current.map(i => (i === image ? {...i, src: url} : i));
            commit(list);
        }
        setIsUploading(false);
    };

    const galleryReorder = useGalleryReorder({
        images,
        updateImages: commit,
        isSelected,
        maxImages: MAX_IMAGES
    });
    const imageFilesDropper = useFileDragAndDrop({handleDrop: files => addFiles(files)});

    const onFileChange = async (e) => {
        const files = e.target.files;

        if (!files || !files.length) {
            return;
        }

        return await addFiles(files);
    };

    function handleToolbarAdd(event) {
        event.preventDefault();
        fileInputRef.current.click();
    }

    const hideToolbar =
        !isSelected ||
        imageFilesDropper.isDraggedOver ||
        galleryReorder.isDraggedOver ||
        images.length <= 0;

    const Custom = cardRenderers?.gallery;

    return (
        <>
            {Custom ? (
                <figure data-kg-gallery-custom>
                    <Custom
                        addFiles={addFiles}
                        caption={(
                            <CardCaptionEditor
                                captionEditor={captionEditor}
                                captionEditorInitialState={captionEditorInitialState}
                                captionPlaceholder={strings.gallery.captionPlaceholder}
                                dataTestId="gallery-card-caption"
                                isSelected={isSelected}
                            />
                        )}
                        clearError={() => setErrorMessage(null)}
                        errorMessage={errorMessage}
                        images={images}
                        isSelected={Boolean(isSelected)}
                        isUploading={isUploading}
                        maxImages={MAX_IMAGES}
                        mimeTypes={mimeTypes ?? []}
                        moveImage={moveImage}
                        progress={imageUploader.progress ?? 0}
                        removeImage={removeImage}
                        updateImage={updateImage}
                    />
                </figure>
            ) : (
                <GalleryCard
                    captionEditor={captionEditor}
                    captionEditorInitialState={captionEditorInitialState}
                    clearErrorMessage={() => setErrorMessage(null)}
                    deleteImage={image => removeImage(imagesRef.current.indexOf(image))}
                    errorMessage={errorMessage}
                    fileInputRef={fileInputRef}
                    filesDropper={imageFilesDropper}
                    imageMimeTypes={mimeTypes}
                    images={images}
                    isSelected={isSelected}
                    moveImage={moveImage}
                    reorderHandler={galleryReorder}
                    strings={strings.gallery}
                    unescapeHtml={unescapeHtml}
                    updateImageText={(index, changes) => updateImage(index, {
                        ...(changes.alt !== undefined ? {alt: changes.alt} : {}),
                        ...(changes.title !== undefined ? {title: escapeHtml(changes.title)} : {}),
                        ...(changes.caption !== undefined ? {caption: escapeHtml(changes.caption)} : {})
                    })}
                    uploader={imageUploader}
                    onFileChange={onFileChange}
                />
            )}

            {Custom ? (
                <form hidden>
                    <input ref={fileInputRef} name="image-input" type="file" hidden multiple onChange={onFileChange} />
                </form>
            ) : null}

            <ActionToolbar
                data-kg-card-toolbar="gallery"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="gallery"
                isVisible={!hideToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="add-gallery-image" icon="add" isActive={false} label={strings.gallery.addImages} onClick={handleToolbarAdd} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label={strings.card.saveAsSnippet}
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
