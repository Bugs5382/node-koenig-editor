import type {LexicalNode} from 'lexical';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

export function parseVideoNode(VideoNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'FIGURE' && nodeElem.classList?.contains('kg-video-card')) {
                return {
                    conversion(domNode: HTMLElement) {
                        const video = domNode.querySelector('video');
                        const src = safeMediaUrl(video?.getAttribute('src') ?? '');
                        if (!video || !src) {
                            return null;
                        }

                        const track = video.querySelector('track');
                        const payload: Record<string, unknown> = {
                            src,
                            cardWidth: domNode.classList.contains('kg-width-full')
                                ? 'full'
                                : domNode.classList.contains('kg-width-wide') ? 'wide' : 'regular',
                            caption: domNode.querySelector('figcaption')?.textContent || '',
                            transcript: domNode.querySelector('.kg-media-transcript')?.textContent || '',
                            trackSrc: safeMediaUrl(track?.getAttribute('src') ?? ''),
                            trackLang: track?.getAttribute('srclang') || 'en',
                            trackLabel: track?.getAttribute('label') || ''
                        };
                        const width = Number.parseInt(video.getAttribute('width') ?? '', 10);
                        const height = Number.parseInt(video.getAttribute('height') ?? '', 10);
                        if (width > 0 && height > 0) {
                            payload.width = width;
                            payload.height = height;
                        }
                        return {node: new VideoNode(payload)};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
