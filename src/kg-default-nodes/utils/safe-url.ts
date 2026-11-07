// The one rule for links the cards write out: an absolute http, https or mailto URL.
// A browser ignores leading and trailing control characters and spaces, and tabs and
// line breaks anywhere in a URL, so those are removed before the scheme is read. What
// comes back is exactly what was checked, never the original text.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function toSafeUrl(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    const cleaned = value
        // eslint-disable-next-line no-control-regex
        .replace(/^[\u0000- \u007f]+|[\u0000- \u007f]+$/g, '')
        .replace(/[\t\n\r]/g, '');

    // protocol-relative and relative links have no scheme of their own, so they fail here
    if (!/^(https?|mailto):/i.test(cleaned)) {
        return '';
    }

    let url: URL;
    try {
        url = new URL(cleaned);
    } catch {
        return '';
    }

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        return '';
    }
    // "https:" alone, or "mailto:" with no address, has no target
    if (url.protocol === 'mailto:' ? !url.pathname : !url.host) {
        return '';
    }
    return cleaned;
}

export function isSafeUrl(value: unknown): boolean {
    return toSafeUrl(value) !== '';
}
