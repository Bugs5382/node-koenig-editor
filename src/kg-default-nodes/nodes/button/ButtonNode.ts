import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseButtonNode} from './button-parser.js';
import {renderButtonNode} from './button-renderer.js';
import {toSafeUrl} from '../../utils/safe-url.js';

const buttonProperties = [
    {name: 'buttonText', default: ''},
    {name: 'alignment', default: 'center'},
    {name: 'buttonUrl', default: '', urlType: 'url'}
] as const satisfies readonly DecoratorNodeProperty[];

export type ButtonData = DecoratorNodeData<typeof buttonProperties>;

export interface ButtonNode extends DecoratorNodeValueMap<typeof buttonProperties> {}

export class ButtonNode extends generateDecoratorNode({
    nodeType: 'button',
    properties: buttonProperties,
    defaultRenderFn: renderButtonNode
}) {
    /* override */
    constructor(data: ButtonData = {}, key?: string) {
        // every way in (create, importJSON, importDOM, clone) comes through here, so the
        // link is checked once for all of them
        super({...data, buttonUrl: toSafeUrl(data.buttonUrl)}, key);
    }

    /* override */
    exportJSON() {
        return {...super.exportJSON(), buttonUrl: toSafeUrl(this.buttonUrl)};
    }

    static importDOM() {
        return parseButtonNode(this);
    }
}

export const $createButtonNode = (dataset: ButtonData = {}) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node: unknown): node is ButtonNode {
    return node instanceof ButtonNode;
}
