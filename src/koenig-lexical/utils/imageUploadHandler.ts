import {$getNodeByKey} from 'lexical';
import {getImageDimensions} from './getImageDimensions';

// Thrown when a chosen file cannot be shown as a picture (a text file renamed .png, a broken file).
// The image card catches it and shows a plain error; nothing is uploaded.
export class ImageDecodeError extends Error {
    constructor(file) {
        super('The file is not a picture');
        this.name = 'ImageDecodeError';
        this.file = file;
    }
}

export const imageUploadHandler = async (files, nodeKey, editor, upload) => {
    if (!files) {
        return;
    }

    // show preview via an object URL whilst upload is in progress
    let previewUrl = URL.createObjectURL(files[0]);
    if (previewUrl) {
        await editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.previewSrc = previewUrl;
        });
    }

    // use the local object URL to grab metadata
    let dimensions;
    try {
        dimensions = await getImageDimensions(previewUrl);
    } catch {
        // not a picture: take the preview away and let the card say so, rather than dropping the file
        await editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.previewSrc = null;
        });
        URL.revokeObjectURL?.(previewUrl);
        throw new ImageDecodeError(files[0]);
    }
    const {width, height} = dimensions;

    // perform the actual upload
    const result = await upload(files);
    const imageSrc = result?.[0].url;

    // replace preview URL with real URL and set image metadata
    await editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        node.width = width;
        node.height = height;
        node.src = imageSrc;
        node.previewSrc = null;
    });

    return;
};

export const backgroundImageUploadHandler = async (files, upload) => {
    if (!files) {
        return;
    }
    const result = await upload(files);
    const imageSrc = result?.[0].url;

    const {width, height} = await getImageDimensions(imageSrc);

    return {
        imageSrc,
        width,
        height
    };
};
