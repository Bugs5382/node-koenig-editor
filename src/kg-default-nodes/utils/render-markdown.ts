import MarkdownIt from 'markdown-it';
import {isSafeUrl} from './safe-url.js';

// The one place Markdown becomes HTML: the card's preview in the editor and its exported
// HTML both call this. Raw HTML in the source is escaped, never passed through; links and
// image sources go through the same http/https/mailto rule as the button card (a link that
// fails it is left as plain text); headings stop at H5, like the editor's heading limit.
const md = new MarkdownIt({html: false, linkify: false, typographer: false, breaks: false});

md.validateLink = (url: string) => isSafeUrl(url);

md.core.ruler.push('kg_heading_limit', (state) => {
    for (const token of state.tokens) {
        if ((token.type === 'heading_open' || token.type === 'heading_close') && token.tag === 'h6') {
            token.tag = 'h5';
        }
    }
    return true;
});

export function renderMarkdown(source: string | null | undefined): string {
    return md.render(typeof source === 'string' ? source : '');
}
