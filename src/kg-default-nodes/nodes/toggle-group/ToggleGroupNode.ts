import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseToggleGroupNode} from './toggle-group-parser.js';
import {renderToggleGroupNode} from './toggle-group-renderer.js';

export {renderToggleGroupNode};

// A stack of toggles with no gap between them and no limit on how many. Each item is a heading
// and its content, both as HTML.
export interface ToggleGroupItem {
    heading: string;
    content: string;
}

const toggleGroupProperties = [
    {name: 'items', default: [] as ToggleGroupItem[]}
] as const satisfies readonly DecoratorNodeProperty[];

export type ToggleGroupData = DecoratorNodeData<typeof toggleGroupProperties>;

export interface ToggleGroupNode extends DecoratorNodeValueMap<typeof toggleGroupProperties> {}

export class ToggleGroupNode extends generateDecoratorNode({
    nodeType: 'toggle-group',
    properties: toggleGroupProperties,
    defaultRenderFn: renderToggleGroupNode
}) {
    /* override */
    static get urlTransformMap() {
        return {
            items: {
                heading: 'html',
                content: 'html'
            }
        };
    }

    static importDOM() {
        return parseToggleGroupNode(this);
    }
}

export const $createToggleGroupNode = (dataset: ToggleGroupData = {}) => {
    return new ToggleGroupNode(dataset);
};

export function $isToggleGroupNode(node: unknown): node is ToggleGroupNode {
    return node instanceof ToggleGroupNode;
}
