import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

interface FileNodeData {
    src: string;
    fileTitle: string;
    fileCaption: string;
    fileName: string;
    fileSize: number;
    formattedFileSize: string;
}

interface RenderOptions extends ExportDOMOptions {}

// Ported from upstream Koenig. The email table (which loaded an icon from Ghost's CDN) is
// gone: every target gets the same card, and the link only ever points at the host's own url.
export function renderFileNode(node: FileNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const src = safeMediaUrl(node.src);
    if (!src) {
        return renderEmptyContainer(document);
    }

    const card = document.createElement('div');
    card.setAttribute('class', 'kg-card kg-file-card');

    const container = document.createElement('a');
    container.setAttribute('class', 'kg-file-card-container');
    container.setAttribute('href', src);
    container.setAttribute('download', '');

    const contents = document.createElement('div');
    contents.setAttribute('class', 'kg-file-card-contents');

    const title = document.createElement('div');
    title.setAttribute('class', 'kg-file-card-title');
    title.textContent = node.fileTitle || '';

    const caption = document.createElement('div');
    caption.setAttribute('class', 'kg-file-card-caption');
    caption.textContent = node.fileCaption || '';

    const metadata = document.createElement('div');
    metadata.setAttribute('class', 'kg-file-card-metadata');

    const filename = document.createElement('div');
    filename.setAttribute('class', 'kg-file-card-filename');
    filename.textContent = node.fileName || '';

    const filesize = document.createElement('div');
    filesize.setAttribute('class', 'kg-file-card-filesize');
    filesize.textContent = node.formattedFileSize || '';

    metadata.appendChild(filename);
    metadata.appendChild(filesize);
    contents.appendChild(title);
    contents.appendChild(caption);
    contents.appendChild(metadata);
    container.appendChild(contents);
    card.appendChild(container);

    return {element: card, type: 'outer' as const};
}
