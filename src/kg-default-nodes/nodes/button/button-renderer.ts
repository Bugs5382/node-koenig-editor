import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {toSafeUrl} from '../../utils/safe-url.js';

interface ButtonNodeData {
    buttonUrl: string;
    buttonText: string;
    alignment: string;
}

interface RenderOptions extends ExportDOMOptions {}

// The email templates of upstream need Ghost's email styles and are left out: the card
// renders the same link for every target.
export function renderButtonNode(node: ButtonNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const href = toSafeUrl(node.buttonUrl);
    if (!href) {
        return renderEmptyContainer(document);
    }

    const cardDiv = document.createElement('div');
    cardDiv.setAttribute('class', getCardClasses(node));

    const button = document.createElement('a');
    button.setAttribute('href', href);
    button.setAttribute('class', 'kg-btn kg-btn-accent');
    button.textContent = node.buttonText || 'Button Title';

    cardDiv.appendChild(button);
    return {element: cardDiv, type: 'outer' as const};
}

function getCardClasses(node: ButtonNodeData) {
    const cardClasses = ['kg-card kg-button-card'];

    if (node.alignment === 'left' || node.alignment === 'center') {
        cardClasses.push(`kg-align-${node.alignment}`);
    }

    return cardClasses.join(' ');
}
