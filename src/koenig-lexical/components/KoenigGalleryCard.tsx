/*
MIT License

Copyright (c) 2026 Shane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import useGalleryReorder from '../hooks/useGalleryReorder';
import {GalleryCard} from './ui/cards/GalleryCard';
import {useKoenigStrings} from '../../additions/options';

const keep = value => value;

// The default gallery, drawn from the same props a host's own `cardRenderers.gallery` component
// gets, so a host can wrap it: `<KoenigGalleryCard {...props} />`. Everything it does (adding,
// removing, reordering, the title and caption dialog, the full-screen viewer) goes through those
// props; it keeps nothing of its own but its drag and drop and the file input it opens.
export function KoenigGalleryCard(props) {
    const {
        addFiles,
        caption,
        clearError,
        errorMessage,
        hostMaxImages,
        images,
        isSelected,
        isUploading,
        maxImages,
        mimeTypes,
        moveImage,
        progress,
        readOnly,
        removeImage,
        replaceImages,
        setMaxImages,
        setSlideshow,
        slideshow,
        slideshowOptions,
        updateImage
    } = props;
    const strings = useKoenigStrings();
    const fileInputRef = React.useRef();
    const reorder = useGalleryReorder({
        images,
        updateImages: replaceImages,
        isSelected,
        maxImages,
        disabled: readOnly
    });
    const dropper = useFileDragAndDrop({handleDrop: files => !readOnly && addFiles(files)});

    return (
        <GalleryCard
            caption={caption}
            clearErrorMessage={clearError}
            deleteImage={image => removeImage(images.indexOf(image))}
            errorMessage={errorMessage}
            fileInputRef={fileInputRef}
            filesDropper={dropper}
            hostMaxImages={hostMaxImages}
            imageMimeTypes={mimeTypes}
            images={images}
            isSelected={isSelected}
            maxImages={maxImages}
            moveImage={moveImage}
            readOnly={readOnly}
            reorderHandler={reorder}
            setMaxImages={setMaxImages}
            setSlideshow={setSlideshow}
            slideshow={slideshow}
            slideshowOptions={slideshowOptions}
            strings={strings.gallery}
            unescapeHtml={keep}
            updateImageText={(index, changes) => updateImage(index, changes)}
            uploader={{isLoading: isUploading, progress}}
            onFileChange={(event) => {
                const files = event.target.files;
                if (files && files.length) {
                    return addFiles(files);
                }
            }}
        />
    );
}

export default KoenigGalleryCard;
