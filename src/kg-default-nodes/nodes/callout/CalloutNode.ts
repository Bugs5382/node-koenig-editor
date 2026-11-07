import {generateDecoratorNode, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {renderCalloutNode} from './callout-renderer.js';
import {parseCalloutNode} from './callout-parser.js';

export interface CalloutData {
    calloutText?: string;
    calloutEmoji?: string;
    backgroundColor?: string;
    textColor?: string;
}

export interface CalloutNode {
    calloutText: string;
    calloutEmoji: string;
    backgroundColor: string;
    textColor: string;
}

const calloutProperties = [
    {name: 'calloutText', default: '', wordCount: true},
    {name: 'calloutEmoji', default: '\u{1F4A1}'},
    {name: 'backgroundColor', default: 'blue'},
    {name: 'textColor', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export class CalloutNode extends generateDecoratorNode({
    nodeType: 'callout',
    properties: calloutProperties,
    defaultRenderFn: renderCalloutNode
}) {
    /* override */
    constructor({calloutText, calloutEmoji, backgroundColor, textColor}: CalloutData = {}, key?: string) {
        super({}, key);
        this.__calloutText = calloutText || '';
        this.__calloutEmoji = calloutEmoji ?? '\u{1F4A1}';
        this.__backgroundColor = backgroundColor || 'blue';
        this.__textColor = textColor || '';
    }

    static importDOM() {
        return parseCalloutNode(this);
    }
}

export function $isCalloutNode(node: unknown): node is CalloutNode {
    return node instanceof CalloutNode;
}

export const $createCalloutNode = (dataset: CalloutData = {}) => {
    return new CalloutNode(dataset);
};
