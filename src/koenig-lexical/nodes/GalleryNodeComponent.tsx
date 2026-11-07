import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {CardCaptionEditor} from '../components/ui/CardCaptionEditor';
import {KoenigGalleryCard} from '../components/KoenigGalleryCard';
import {GALLERY_UPLOAD_CONCURRENCY, resolveMaxImages} from '../../additions/gallery/limits';
import {recalculateImageRows} from './GalleryNode';
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
    const {fileUploader, cardConfig, cardRenderers, gallery} = React.useContext(KoenigComposerContext);
    const hostMaxImages = resolveMaxImages(gallery?.maxImages);
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

    // This gallery's own limit is saved in the card; the host's is the ceiling it cannot exceed.
    const [ownMax, setOwnMaxState] = React.useState(() => editor.getEditorState().read(() => $getNodeByKey(nodeKey)?.maxImages || 0));
    const maxImages = Math.min(ownMax > 0 ? ownMax : hostMaxImages, hostMaxImages);
    // The slideshow settings of the full-screen viewer, saved in the card. The host can switch any of
    // the three off; a switched-off one is neither shown nor played.
    const slideshowOptions = {
        autoAdvance: gallery?.autoAdvance !== false,
        screenMode: gallery?.screenMode !== false,
        shuffle: gallery?.shuffle !== false
    };
    const [ownSlideshow, setOwnSlideshow] = React.useState(() => editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        return {autoplaySeconds: node?.autoplaySeconds || 0, screenMode: !!node?.screenMode, shuffle: !!node?.shuffle};
    }));
    const slideshow = {
        autoplaySeconds: slideshowOptions.autoAdvance ? ownSlideshow.autoplaySeconds : 0,
        screenMode: slideshowOptions.screenMode && ownSlideshow.screenMode,
        shuffle: slideshowOptions.shuffle && ownSlideshow.shuffle
    };
    const setSlideshow = (changes) => {
        const next = {...ownSlideshow};
        if ('autoplaySeconds' in changes) {
            const seconds = Number(changes.autoplaySeconds);
            // 0 is off; anything else is a whole number of seconds from 1 to 3600
            next.autoplaySeconds = Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.max(Math.round(seconds), 1), 3600) : 0;
        }
        if ('shuffle' in changes) {
            next.shuffle = !!changes.shuffle;
        }
        if ('screenMode' in changes) {
            next.screenMode = !!changes.screenMode;
        }
        setOwnSlideshow(next);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node.autoplaySeconds = next.autoplaySeconds;
                node.shuffle = next.shuffle;
                node.screenMode = next.screenMode;
            }
        });
    };
    // The pictures, the limit and the slideshow settings are copied into this component's state
    // when it mounts. Another window of a shared session changes the card, not this state, so
    // read the card again after each update and take what differs. A picture that is still
    // uploading is only here, not in the card, and stays.
    React.useEffect(() => editor.registerUpdateListener(({editorState}) => {
        editorState.read(() => {
            const node = $getNodeByKey(nodeKey);
            if (!node) {
                return;
            }
            const saved = node.images.map(image => ({...image}));
            const mine = imagesRef.current.filter(image => image.src);
            if (JSON.stringify(saved) !== JSON.stringify(mine)) {
                setImages([...saved, ...imagesRef.current.filter(image => !image.src)]);
            }
            setOwnMaxState(node.maxImages || 0);
            const next = {autoplaySeconds: node.autoplaySeconds || 0, screenMode: !!node.screenMode, shuffle: !!node.shuffle};
            setOwnSlideshow(previous => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
        });
    }), [editor, nodeKey]);

    const [readOnly, setReadOnly] = React.useState(() => !editor.isEditable());
    React.useEffect(() => editor.registerEditableListener(editable => setReadOnly(!editable)), [editor]);

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

    // The most it can be set to is the host's limit; the least is what it already holds.
    const setMaxImages = (value) => {
        // an empty box or text that is not a number changes nothing
        const wanted = String(value ?? '').trim() === '' ? NaN : Math.round(Number(value));
        if (!Number.isFinite(wanted)) {
            return;
        }
        const next = Math.min(Math.max(wanted, imagesRef.current.length, 1), hostMaxImages);
        setOwnMaxState(next);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node.maxImages = next;
            }
        });
    };

    const addFiles = async (files) => {
        const incoming = Array.prototype.slice.call(files);
        const allowedType = file => !mimeTypes?.length || mimeTypes.includes(file.type);
        const accepted = incoming.filter(allowedType);
        const room = maxImages - imagesRef.current.length;
        const chosen = accepted.slice(0, Math.max(room, 0));

        if (accepted.length < incoming.length) {
            setErrorMessage(strings.gallery.fileTypeError);
        } else if (chosen.length < accepted.length) {
            setErrorMessage(strings.gallery.limitError.replace('{max}', String(maxImages)));
        }

        if (chosen.length === 0) {
            return;
        }

        // previews first, so the person sees the images straight away
        const pending = await Promise.all(chosen.map(async (file) => {
            const previewSrc = URL.createObjectURL(file);
            const {width, height} = await dimensionsOf(previewSrc);
            return {file, image: {fileName: file.name, previewSrc, width, height, alt: '', caption: ''}};
        }));
        setImages([...imagesRef.current, ...pending.map(p => p.image)]);

        // The host's uploader is called once for each image, a few at a time: many photos go up
        // faster, but a host's upload hook can be asked to run more than one upload at once.
        setIsUploading(true);
        const uploadOne = async ({file, image}) => {
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
            } else {
                commit(imagesRef.current.map(i => (i === image ? {...i, src: url} : i)));
            }
            // the preview is no longer needed once the real address (or a failure) is known
            URL.revokeObjectURL?.(image.previewSrc);
        };
        const queue = [...pending];
        const workers = Array.from({length: Math.min(GALLERY_UPLOAD_CONCURRENCY, queue.length)}, async () => {
            while (queue.length) {
                await uploadOne(queue.shift());
            }
        });
        await Promise.all(workers);
        setIsUploading(false);
    };

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

    const hideToolbar = !isSelected || readOnly || images.length <= 0;

    // What a host's component gets. Title and caption go out as plain text and come back as plain
    // text; the card keeps them escaped, because the HTML output writes them as they are.
    const plain = list => list.map(image => ({
        ...image,
        title: unescapeHtml(image.title || ''),
        caption: unescapeHtml(image.caption || '')
    }));
    const stored = (changes) => ({
        ...(changes.alt !== undefined ? {alt: changes.alt} : {}),
        ...(changes.title !== undefined ? {title: escapeHtml(changes.title)} : {}),
        ...(changes.caption !== undefined ? {caption: escapeHtml(changes.caption)} : {})
    });
    const replaceImages = list => commit(list.map(image => ({
        ...image,
        ...(image.title !== undefined ? {title: escapeHtml(image.title)} : {}),
        ...(image.caption !== undefined ? {caption: escapeHtml(image.caption)} : {})
    })));

    const Custom = cardRenderers?.gallery;
    const Renderer = Custom || KoenigGalleryCard;
    const rendered = (
        <Renderer
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
            hostMaxImages={hostMaxImages}
            images={plain(images)}
            isSelected={Boolean(isSelected)}
            isUploading={isUploading}
            maxImages={maxImages}
            mimeTypes={mimeTypes ?? []}
            moveImage={moveImage}
            progress={imageUploader.progress ?? 0}
            readOnly={readOnly}
            removeImage={removeImage}
            replaceImages={replaceImages}
            setMaxImages={setMaxImages}
            setSlideshow={setSlideshow}
            slideshow={slideshow}
            slideshowOptions={slideshowOptions}
            updateImage={(index, changes) => updateImage(index, stored(changes))}
        />
    );

    return (
        <>
            {Custom ? <figure data-kg-gallery-custom>{rendered}</figure> : rendered}

            {readOnly ? null : (
                <form hidden>
                    <input ref={fileInputRef} name="image-input" type="file" hidden multiple onChange={onFileChange} />
                </form>
            )}

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
