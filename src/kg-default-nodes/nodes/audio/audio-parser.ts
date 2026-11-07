import type {LexicalNode} from 'lexical';
import {safeMediaUrl} from '../../../additions/media/safeMediaUrl';

export function parseAudioNode(AudioNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'FIGURE' && nodeElem.classList?.contains('kg-audio-card')) {
                return {
                    conversion(domNode: HTMLElement) {
                        const audio = domNode.querySelector('audio');
                        const src = safeMediaUrl(audio?.getAttribute('src') ?? '');
                        if (!audio || !src) {
                            return null;
                        }
                        const track = audio.querySelector('track');
                        return {
                            node: new AudioNode({
                                src,
                                title: domNode.querySelector('.kg-audio-title')?.textContent || '',
                                transcript: domNode.querySelector('.kg-media-transcript')?.textContent || '',
                                trackSrc: safeMediaUrl(track?.getAttribute('src') ?? ''),
                                trackLang: track?.getAttribute('srclang') || 'en',
                                trackLabel: track?.getAttribute('label') || ''
                            })
                        };
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
