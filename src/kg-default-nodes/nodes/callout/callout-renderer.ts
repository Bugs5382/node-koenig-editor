import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {cleanDOM} from '../../utils/clean-dom.js';

interface CalloutNodeData {
    backgroundColor: string;
    calloutEmoji: string;
    calloutText: string;
    textColor?: string;
}

interface RenderOptions extends ExportDOMOptions {}

export function renderCalloutNode(node: CalloutNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();
    const element = document.createElement('div');

    // backgroundColor can end up with `rgba(0, 0, 0, 0)` from old mobiledoc copy/paste
    // that is invalid when used in a class name so fall back to `white` when we don't have
    // something that looks like a valid class
    // A colour picked by the person is a hex value: the card gets the `custom` class and the
    // colour as inline style, so it shows without any stylesheet.
    const isHex = (value?: string) => !!value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
    const customBackground = isHex(node.backgroundColor) ? node.backgroundColor : null;
    const backgroundName = customBackground ? 'custom' : node.backgroundColor;
    if (!customBackground && (!backgroundName || !backgroundName.match(/^[a-zA-Z\d-]+$/))) {
        node.backgroundColor = 'white';
    }

    element.classList.add('kg-card', 'kg-callout-card', `kg-callout-card-${customBackground ? 'custom' : node.backgroundColor}`);
    const styles: string[] = [];
    if (customBackground) {
        styles.push(`background-color: ${customBackground}`);
    }
    if (isHex(node.textColor)) {
        styles.push(`color: ${node.textColor}`);
    }
    if (styles.length) {
        element.setAttribute('style', styles.join('; '));
    }

    if (node.calloutEmoji) {
        const emojiElement = document.createElement('div');
        emojiElement.classList.add('kg-callout-emoji');
        emojiElement.textContent = node.calloutEmoji;
        element.appendChild(emojiElement);
    }

    const textElement = document.createElement('div');
    textElement.classList.add('kg-callout-text');

    const temporaryContainer = document.createElement('div');
    temporaryContainer.innerHTML = node.calloutText;

    const allowedTags = ['A', 'STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'MARK', 'S', 'DEL', 'U', 'SUP', 'SUB'];
    cleanDOM(temporaryContainer, allowedTags);

    textElement.innerHTML = temporaryContainer.innerHTML;
    element.appendChild(textElement);

    return {element, type: 'outer' as const};
}
