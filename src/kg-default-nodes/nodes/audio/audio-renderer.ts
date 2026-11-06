import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {buildTrack, buildTranscript} from '../../../additions/media/renderMedia';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

interface AudioNodeData {
    src: string;
    title: string;
    trackSrc?: string;
    trackLang?: string;
    trackLabel?: string;
    transcript?: string;
}

interface RenderOptions extends ExportDOMOptions {}

// The player is the browser's own, with its keyboard controls, playing the host's own file.
export function renderAudioNode(node: AudioNodeData, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const src = safeMediaUrl(node.src);
    if (!src) {
        return renderEmptyContainer(document);
    }

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-audio-card');

    if (node.title) {
        const title = document.createElement('div');
        title.setAttribute('class', 'kg-audio-title');
        title.textContent = node.title;
        figure.appendChild(title);
    }

    const audio = document.createElement('audio');
    audio.setAttribute('src', src);
    audio.setAttribute('controls', '');
    audio.setAttribute('preload', 'metadata');
    const track = buildTrack(document, node);
    if (track) {
        audio.appendChild(track);
    }
    figure.appendChild(audio);

    const transcript = buildTranscript(document, node);
    if (transcript) {
        figure.appendChild(transcript);
    }

    return {element: figure, type: 'outer' as const};
}
