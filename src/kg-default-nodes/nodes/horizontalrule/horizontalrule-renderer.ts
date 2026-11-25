import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';

interface RenderOptions extends ExportDOMOptions {}

export function renderHorizontalRuleNode(node: {variant?: string} | null, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const element = document.createElement('hr');
    // The dots look is a class on the same element: without the stylesheet it is still a plain line
    if (node?.variant === 'dots') {
        element.setAttribute('class', 'kg-section-break');
    }
    return {element, type: 'outer' as const};
}
