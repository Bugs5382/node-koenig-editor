import type {LexicalNode} from 'lexical';
const getColorTag = (nodeElem: HTMLElement) => {
    const colorClass = nodeElem.classList?.value?.match(/kg-callout-card-(\w+)/);
    return colorClass && colorClass[1];
};

export function parseCalloutNode(CalloutNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            const isKgCalloutCard = nodeElem.classList?.contains('kg-callout-card');
            if (nodeElem.tagName === 'DIV' && isKgCalloutCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const textNode = domNode?.querySelector('.kg-callout-text');
                        const emojiNode = domNode?.querySelector('.kg-callout-emoji');
                        const hexOf = (value?: string) => {
                            const match = (value || '').trim().match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
                            return match ? match[0] : null;
                        };
                        const inlineBackground = hexOf(domNode.style?.backgroundColor) || hexOf(domNode.getAttribute('style')?.match(/background-color:\s*([^;]+)/i)?.[1]);
                        const inlineText = hexOf(domNode.getAttribute('style')?.match(/(?:^|;)\s*color:\s*([^;]+)/i)?.[1]);
                        const color = inlineBackground || getColorTag(domNode);

                        const payload: Record<string, unknown> = {
                            calloutText: textNode && textNode.innerHTML.trim() || '',
                            calloutEmoji: emojiNode && emojiNode.innerHTML.trim() || '',
                            backgroundColor: color,
                            textColor: inlineText || ''
                        };

                        const node = new CalloutNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
