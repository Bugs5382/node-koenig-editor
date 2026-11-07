import type {LexicalNode} from 'lexical';
import {toSafeUrl} from '../../utils/safe-url.js';

export function parseButtonNode(ButtonNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            const isButtonCard = nodeElem.classList?.contains('kg-button-card');
            if (nodeElem.tagName === 'DIV' && isButtonCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const alignmentClass = nodeElem.className.match(/kg-align-(left|center|right)/);

                        let alignment;
                        if (alignmentClass) {
                            alignment = alignmentClass[1];
                        }

                        const buttonNode = domNode?.querySelector('.kg-btn');
                        // a link that is not http, https or mailto is dropped on the way in
                        const buttonUrl = toSafeUrl(buttonNode?.getAttribute('href'));
                        const buttonEmoji = buttonNode?.getAttribute('data-button-emoji') ?? '';
                        const rawText = buttonNode?.textContent ?? '';
                        const buttonText = buttonEmoji && rawText.startsWith(buttonEmoji) ? rawText.slice(buttonEmoji.length).trim() : rawText;
                        const hexOf = (value?: string | null) => (value || '').trim().match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i)?.[0] ?? '';
                        const styleAttr = buttonNode?.getAttribute('style') ?? '';
                        const backgroundColor = hexOf(styleAttr.match(/background-color:\s*([^;]+)/i)?.[1]);
                        const textColor = hexOf(styleAttr.match(/(?:^|;)\s*color:\s*([^;]+)/i)?.[1]);

                        const payload: Record<string, unknown> = {
                            buttonText: buttonText,
                            buttonEmoji,
                            backgroundColor,
                            textColor,
                            alignment: alignment,
                            buttonUrl: buttonUrl
                        };

                        const node = new ButtonNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
