import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseAudioNode} from './audio-parser.js';
import {renderAudioNode} from './audio-renderer.js';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

// Audio is an uploaded file played from the host's own storage. `trackSrc` is a WebVTT file;
// `transcript` is the same words in the page.
const audioProperties = [
    {name: 'src', default: '', urlType: 'url'},
    {name: 'title', default: '', wordCount: true},
    {name: 'transcript', default: '', wordCount: true},
    {name: 'fileName', default: ''},
    {name: 'mimeType', default: ''},
    {name: 'duration', default: 0},
    {name: 'trackSrc', default: '', urlType: 'url'},
    {name: 'trackLang', default: 'en'},
    {name: 'trackLabel', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export type AudioData = DecoratorNodeData<typeof audioProperties>;

export interface AudioNode extends DecoratorNodeValueMap<typeof audioProperties> {}

export class AudioNode extends generateDecoratorNode({
    nodeType: 'audio',
    properties: audioProperties,
    defaultRenderFn: renderAudioNode
}) {
    /* override */
    exportJSON() {
        const {title, transcript, fileName, mimeType, duration, trackLang, trackLabel} = this;
        return {
            type: 'audio' as const,
            version: 1,
            src: safeMediaUrl(this.src),
            title,
            transcript,
            fileName,
            mimeType,
            duration,
            trackSrc: safeMediaUrl(this.trackSrc),
            trackLang,
            trackLabel
        };
    }

    static importDOM() {
        return parseAudioNode(this);
    }
}

export const $createAudioNode = (dataset?: AudioData) => {
    return new AudioNode(dataset);
};

export function $isAudioNode(node: unknown): node is AudioNode {
    return node instanceof AudioNode;
}
