import type {LexicalNode} from 'lexical';

export function parseHorizontalRuleNode(HorizontalRuleNode: new (data?: Record<string, unknown>) => LexicalNode) {
    return {
        hr: () => ({
            conversion(element: HTMLElement) {
                const variant = element.classList?.contains('kg-section-break') ? 'dots' : 'line';
                const node = new HorizontalRuleNode({variant});
                return {node};
            },
            priority: 0 as const
        })
    };
}
