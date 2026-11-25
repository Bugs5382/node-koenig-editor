import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {generateDecoratorNode} from '../../generate-decorator-node.js';

// The linked-video card. It saves the address the author typed and an optional title; it never
// saves a player address and never fetches anything. Showing a player is the card's job, after the
// reader presses play, from the host app's allow-list (`embedHosts`).
const embedProperties = [
    {name: 'url', default: '', urlType: 'url'},
    {name: 'title', default: '', wordCount: true}
] as const;

interface EmbedData {
    url: string;
    title: string;
}

// The exported page holds a plain link and nothing else: nothing third-party loads until the reader
// follows it. Only an https address is written.
const safeHttps = (value: unknown): string => {
    if (typeof value !== 'string') {
        return '';
    }
    const text = value.trim();
    try {
        const url = new URL(text);
        // eslint-disable-next-line no-control-regex
        if (url.protocol !== 'https:' || url.username || url.password || /[\u0000-\u001f\u007f\s]/.test(text)) {
            return '';
        }
        return url.toString();
    } catch {
        return '';
    }
};

export function renderEmbedNode(node: EmbedData, options: ExportDOMOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();
    const href = safeHttps(node.url);
    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-embed-card');
    if (!href) {
        return {element: figure, type: 'outer' as const};
    }
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.setAttribute('rel', 'noopener noreferrer');
    link.textContent = node.title || href;
    figure.appendChild(link);
    return {element: figure, type: 'outer' as const};
}

export function parseEmbedNode(Embed: new (data: Record<string, unknown>) => unknown) {
    return {
        figure: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'FIGURE' && nodeElem.classList?.contains('kg-embed-card')) {
                return {
                    conversion(domNode: HTMLElement) {
                        const link = domNode.querySelector('a');
                        const url = safeHttps(link?.getAttribute('href') ?? '');
                        if (!url) {
                            return null;
                        }
                        const text = link?.textContent ?? '';
                        return {node: new Embed({url, title: text === url ? '' : text}) as never};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}

export class EmbedNode extends generateDecoratorNode({
    nodeType: 'embed',
    properties: embedProperties,
    defaultRenderFn: renderEmbedNode
}) {
    static importDOM() {
        return parseEmbedNode(this as never);
    }

    // The card has no edit mode: its link and title are fields shown while it is selected.
    hasEditMode() {
        return false;
    }
}

export const $createEmbedNode = (dataset?: Partial<EmbedData>) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node: unknown): node is EmbedNode {
    return node instanceof EmbedNode;
}
