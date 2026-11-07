import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseGalleryNode} from './gallery-parser.js';
import {renderGalleryNode} from './gallery-renderer.js';

const galleryProperties = [
    {name: 'images', default: [] as unknown[]},
    {name: 'caption', default: '', wordCount: true},
    // This gallery's own limit on photos; 0 means the host's limit applies.
    {name: 'maxImages', default: 0},
    // Slideshow settings of the full-screen viewer: seconds between photos (0 is off), shuffled
    // order, and a screen mode with the thumbnail strip hidden and the controls auto-hiding.
    {name: 'autoplaySeconds', default: 0},
    {name: 'shuffle', default: false},
    {name: 'screenMode', default: false}
] as const satisfies readonly DecoratorNodeProperty[];

export type GalleryData = DecoratorNodeData<typeof galleryProperties>;

export interface GalleryNode extends DecoratorNodeValueMap<typeof galleryProperties> {}

export class GalleryNode extends generateDecoratorNode({
    nodeType: 'gallery',
    properties: galleryProperties,
    defaultRenderFn: renderGalleryNode
}) {
    /* override */
    static get urlTransformMap() {
        return {
            caption: 'html',
            images: {
                src: 'url',
                caption: 'html'
            }
        };
    }

    static importDOM() {
        return parseGalleryNode(this);
    }

    hasEditMode() {
        return false;
    }
}

export const $createGalleryNode = (dataset?: GalleryData) => {
    return new GalleryNode(dataset);
};

export function $isGalleryNode(node: unknown): node is GalleryNode {
    return node instanceof GalleryNode;
}
