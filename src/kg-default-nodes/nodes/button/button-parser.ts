import type {LexicalNode} from 'lexical';
import {toSafeUrl} from '../../utils/safe-url.js';

export function parseButtonNode(ButtonNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            const isButtonCard = nodeElem.classList?.contains('kg-button-card');
            if (nodeElem.tagName === 'DIV' && isButtonCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const alignmentClass = nodeElem.className.match(/kg-align-(left|center)/);

                        let alignment;
                        if (alignmentClass) {
                            alignment = alignmentClass[1];
                        }

                        const buttonNode = domNode?.querySelector('.kg-btn');
                        // a link that is not http, https or mailto is dropped on the way in
                        const buttonUrl = toSafeUrl(buttonNode?.getAttribute('href'));
                        const buttonText = buttonNode?.textContent ?? '';

                        const payload: Record<string, unknown> = {
                            buttonText: buttonText,
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
