import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseVideoNode} from './video-parser.js';
import {renderVideoNode} from './video-renderer.js';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

// Video is an uploaded file played from the host's own storage. There is no thumbnail, loop or
// outside embed. `trackSrc` is a WebVTT captions file; `transcript` is the same text in the page.
const videoProperties = [
    {name: 'src', default: '', urlType: 'url'},
    {name: 'caption', default: '', wordCount: true},
    {name: 'transcript', default: '', wordCount: true},
    {name: 'fileName', default: ''},
    {name: 'mimeType', default: ''},
    {name: 'width', default: null as number | null},
    {name: 'height', default: null as number | null},
    {name: 'duration', default: 0},
    {name: 'cardWidth', default: 'regular'},
    {name: 'trackSrc', default: '', urlType: 'url'},
    {name: 'trackLang', default: 'en'},
    {name: 'trackLabel', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export type VideoData = DecoratorNodeData<typeof videoProperties>;

export interface VideoNode extends DecoratorNodeValueMap<typeof videoProperties> {}

export class VideoNode extends generateDecoratorNode({
    nodeType: 'video',
    properties: videoProperties,
    defaultRenderFn: renderVideoNode
}) {
    /* override */
    exportJSON() {
        const {caption, transcript, fileName, mimeType, width, height, duration, cardWidth, trackLang, trackLabel} = this;
        return {
            type: 'video' as const,
            version: 1,
            src: safeMediaUrl(this.src),
            caption,
            transcript,
            fileName,
            mimeType,
            width,
            height,
            duration,
            cardWidth,
            trackSrc: safeMediaUrl(this.trackSrc),
            trackLang,
            trackLabel
        };
    }

    static importDOM() {
        return parseVideoNode(this);
    }
}

export const $createVideoNode = (dataset?: VideoData) => {
    return new VideoNode(dataset);
};

export function $isVideoNode(node: unknown): node is VideoNode {
    return node instanceof VideoNode;
}
