import type {LexicalNode} from 'lexical';

export function parseToggleGroupNode(ToggleGroupNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'DIV' && nodeElem.classList?.contains('kg-toggle-group-card')) {
                return {
                    conversion(domNode: HTMLElement) {
                        const items = Array.from(domNode.querySelectorAll('.kg-toggle-card')).map((item) => ({
                            heading: item.querySelector('.kg-toggle-heading-text')?.innerHTML ?? '',
                            content: item.querySelector('.kg-toggle-content')?.innerHTML ?? ''
                        }));
                        return {node: new ToggleGroupNode({items})};
                    },
                    // above the single toggle's parser, so the items inside are not read as toggles
                    priority: 2 as const
                };
            }
            return null;
        }
    };
}
