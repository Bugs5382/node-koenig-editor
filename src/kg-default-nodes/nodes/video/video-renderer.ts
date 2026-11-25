import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {buildTrack, buildTranscript} from '../../../additions/media/renderMedia';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

interface VideoNodeData {
    src: string;
    width: number | null;
    height: number | null;
    caption: string;
    cardWidth: string;
    trackSrc?: string;
    trackLang?: string;
    trackLabel?: string;
    transcript?: string;
    poster?: string;
}

interface RenderOptions extends ExportDOMOptions {}

// The player is the browser's own, with its keyboard controls. There is no autoplay, loop or
// outside embed: the file plays from the host's own storage, with captions beside it. The
// optional poster is a picture shown before play.
export function renderVideoNode(node: VideoNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const src = safeMediaUrl(node.src);
    if (!src) {
        return renderEmptyContainer(document);
    }

    const figure = document.createElement('figure');
    const classes = ['kg-card', 'kg-video-card'];
    if (/^[a-z-]+$/.test(node.cardWidth || '')) {
        classes.push(`kg-width-${node.cardWidth}`);
    }
    if (node.caption) {
        classes.push('kg-card-hascaption');
    }
    figure.setAttribute('class', classes.join(' '));

    const video = document.createElement('video');
    video.setAttribute('src', src);
    video.setAttribute('controls', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    const poster = safeMediaUrl(node.poster);
    if (poster) {
        video.setAttribute('poster', poster);
    }
    if (node.width && node.height && node.width > 0 && node.height > 0) {
        video.setAttribute('width', String(Math.round(node.width)));
        video.setAttribute('height', String(Math.round(node.height)));
    }
    const track = buildTrack(document, node);
    if (track) {
        video.appendChild(track);
    }
    figure.appendChild(video);

    const transcript = buildTranscript(document, node);
    if (transcript) {
        figure.appendChild(transcript);
    }

    if (node.caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.textContent = node.caption;
        figure.appendChild(figcaption);
    }

    return {element: figure, type: 'outer' as const};
}
