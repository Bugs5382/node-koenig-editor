import GalleryCardIcon from '../assets/icons/kg-card-type-gallery.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import {GALLERY_NODE_IMAGE_CEILING} from '../../additions/gallery/limits';
import pick from 'lodash/pick';
import {$generateHtmlFromNodes} from '@lexical/html';
import {GalleryNode as BaseGalleryNode} from '#kg-default-nodes';
import {GalleryNodeComponent} from './GalleryNodeComponent';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_GALLERY_COMMAND = createCommand();

// A stored gallery is never cut to the host's limit, only to this ceiling (see additions/gallery/limits).
export const MAX_IMAGES = GALLERY_NODE_IMAGE_CEILING;
export const MAX_PER_ROW = 3;

// ensure we don't save client-side only properties such as preview blob urls
export const ALLOWED_IMAGE_PROPS = ['row', 'src', 'width', 'height', 'alt', 'title', 'caption', 'fileName'];

export function recalculateImageRows(images) {
    images.forEach((image, idx) => {
        image.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1;
    });
}

export class GalleryNode extends BaseGalleryNode {
    // Lexical expects every registered class to declare these itself; the base class's
    // versions already build `this`, so they only need passing through.
    static getType() {
        return super.getType();
    }

    static clone(node) {
        return super.clone(node);
    }

    static importJSON(serializedNode) {
        return super.importJSON(serializedNode);
    }

    __captionEditor;
    __captionEditorInitialState;

    static kgMenu = [{
        label: 'Gallery',
        desc: 'Create an image gallery',
        Icon: GalleryCardIcon,
        insertCommand: INSERT_GALLERY_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['gallery'],
        priority: 5,
        shortcut: '/gallery'
    }];

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {caption} = dataset;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});
        // populate nested editors on initial construction
        if (!dataset.captionEditor && caption) {
            populateNestedEditor(this, '__captionEditor', `${caption}`);
        }
    }

    getIcon() {
        return GalleryCardIcon;
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instances back into HTML because their content may not
        // be automatically updated when the nested editor changes
        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={'wide'}>
                <GalleryNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }

    setImages(images) {
        const datasetImages = images
            .slice(0, MAX_IMAGES)
            .map(image => pick(image, ALLOWED_IMAGE_PROPS));

        recalculateImageRows(datasetImages);
        this.images = datasetImages;
    }
}

export const $createGalleryNode = (dataset) => {
    return new GalleryNode(dataset);
};

export function $isGalleryNode(node) {
    return node instanceof GalleryNode;
}
