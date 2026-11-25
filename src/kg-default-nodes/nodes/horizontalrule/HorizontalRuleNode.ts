import {generateDecoratorNode} from '../../generate-decorator-node.js';
import {renderHorizontalRuleNode} from './horizontalrule-renderer.js';
import {parseHorizontalRuleNode} from './horizontalrule-parser.js';

/** How the card is drawn: three centred dots (the default) or a plain line. */
export type HorizontalRuleVariant = 'dots' | 'line';

export class HorizontalRuleNode extends generateDecoratorNode({
    nodeType: 'horizontalrule',
    properties: [{name: 'variant', default: 'dots'}],
    defaultRenderFn: renderHorizontalRuleNode
}) {
    static importDOM() {
        return parseHorizontalRuleNode(this);
    }

    static importJSON(serializedNode: Record<string, unknown>) {
        // A document saved before the section break look has no variant: it keeps its line
        const variant = serializedNode.variant === undefined ? 'line' : serializedNode.variant;
        return super.importJSON({...serializedNode, variant: variant === 'line' ? 'line' : 'dots'});
    }

    getTextContent() {
        return '---\n\n';
    }

    hasEditMode() {
        return false;
    }
}

export function $createHorizontalRuleNode(variant: HorizontalRuleVariant = 'dots') {
    return new HorizontalRuleNode({variant});
}

export function $isHorizontalRuleNode(node: unknown): node is HorizontalRuleNode {
    return node instanceof HorizontalRuleNode;
}
