import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {parseEmbedUrl} from '../../additions/embed/embedHosts';
import {useKoenigEditable} from '../../additions/preview/PreviewContext';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);

const FIELD = 'w-full rounded-md border border-grey/30 bg-transparent px-3 py-2 font-sans text-sm text-grey-900 placeholder:text-grey-500 dark:text-grey-200';
const BUTTON = 'shrink-0 whitespace-nowrap rounded-md border border-grey/30 px-3 py-1 font-sans text-sm text-grey-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-selection dark:text-grey-200';

const PlayIcon = () => (
    <svg aria-hidden="true" className="size-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>
);

// What a refusal says, in the host's wording. `{hosts}` is the names on the allow-list.
const refusalText = (text, reason, hosts) => {
    const names = hosts.map(host => host.label);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
    switch (reason) {
    case 'invalid': return text.invalid;
    case 'unsafe': return text.unsafe;
    case 'not-a-video': return text.notVideo;
    case 'needs-parent': return fill(text.needsParent, {host: list});
    default: return fill(text.notAllowed, {hosts: list});
    }
};

/**
 * The linked-video card. Before the reader presses play it is a placeholder (title, the site's
 * name, a play button and a privacy line) and loads nothing from a third party; the player frame
 * is created only by the press. The address is checked against the host app's allow-list every time
 * it is shown, so a saved link the list no longer allows plays nothing.
 */
export function EmbedNodeComponent({nodeKey, url, title}) {
    const text = useKoenigStrings().embed;
    const [editor] = useLexicalComposerContext();
    const {embedHosts = [], embedParent = ''} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const editable = useKoenigEditable();
    const [playing, setPlaying] = React.useState(false);
    const [draft, setDraft] = React.useState(url);
    const [problem, setProblem] = React.useState('');
    const inputRef = React.useRef(null);

    const result = React.useMemo(() => (url ? parseEmbedUrl(url, embedHosts, {parent: embedParent}) : null), [url, embedHosts, embedParent]);
    const source = result?.ok ? result.source : null;

    // a new link starts over: back to the placeholder
    React.useEffect(() => {
        setPlaying(false);
        setDraft(url);
    }, [url]);

    // a freshly added, empty card asks for its link straight away
    React.useEffect(() => {
        if (editable && isSelected && !url) {
            inputRef.current?.focus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSelected]);

    const update = React.useCallback((values) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            Object.assign(node, values);
        });
    }, [editor, nodeKey]);

    const commit = () => {
        const checked = parseEmbedUrl(draft, embedHosts, {parent: embedParent});
        if (!checked.ok) {
            setProblem(refusalText(text, checked.reason, embedHosts));
            return;
        }
        setProblem('');
        update({url: draft.trim()});
    };

    const hostNames = embedHosts.map(host => host.label);
    const hostList = hostNames.length > 1 ? `${hostNames.slice(0, -1).join(', ')} or ${hostNames.at(-1)}` : hostNames.join('');
    const typedTitle = (title || '').trim();
    const shownTitle = typedTitle || source?.label || '';
    const named = typedTitle && source ? `${typedTitle} (${source.label})` : shownTitle;

    const form = (
        <div className="flex flex-col gap-2" data-kg-embed-form>
            <div className="flex gap-2">
                <input
                    ref={inputRef}
                    aria-label={text.urlLabel}
                    className={FIELD}
                    data-kg-embed-url
                    inputMode="url"
                    placeholder={fill(text.urlPlaceholder, {hosts: hostList})}
                    type="url"
                    value={draft}
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commit();
                        }
                    }}
                />
                <button className={BUTTON} data-kg-embed-submit type="button" onClick={commit}>
                    {text.embedButton}
                </button>
            </div>
            {problem && (
                <p className="font-sans text-sm font-semibold text-red" data-kg-embed-error role="alert">
                    {problem}
                </p>
            )}
        </div>
    );

    let body;
    if (source && playing) {
        body = (
            <div className="relative w-full overflow-hidden" style={{aspectRatio: '16 / 9'}}>
                <iframe
                    allow="autoplay; fullscreen"
                    allowFullScreen={true}
                    className="absolute inset-0 size-full border-0"
                    data-kg-embed-frame
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    src={source.embedUrl}
                    title={named}
                />
            </div>
        );
    } else if (source) {
        body = (
            <div
                className="flex w-full flex-col items-center justify-center gap-3 bg-grey-100 px-6 py-10 text-center dark:bg-grey-900"
                data-kg-embed-placeholder
                style={{aspectRatio: '16 / 9'}}
            >
                <button
                    aria-label={fill(text.play, {title: named})}
                    className="flex size-16 items-center justify-center rounded-full bg-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection dark:bg-white dark:text-black"
                    data-kg-embed-play
                    type="button"
                    onClick={() => setPlaying(true)}
                >
                    <PlayIcon />
                </button>
                <p className="m-0 font-sans text-lg font-semibold text-grey-900 dark:text-grey-200" data-kg-embed-title-text>{shownTitle}</p>
                {typedTitle && <p className="m-0 font-sans text-sm text-grey-700 dark:text-grey-500" data-kg-embed-host>{source.label}</p>}
                <p className="m-0 font-sans text-xs text-grey-700 dark:text-grey-500" data-kg-embed-privacy>
                    {fill(text.privacy, {host: source.label})}
                </p>
            </div>
        );
    } else if (url && editable) {
        // a saved link the allow-list does not take: say so, plain, and play nothing
        body = (
            <p className="font-sans text-sm font-semibold text-red" data-kg-embed-error role="alert">
                {text.refusedSaved}
            </p>
        );
    } else {
        body = null;
    }

    return (
        <div className="not-kg-prose" data-kg-embed>
            {body}
            {editable && !url && embedHosts.length > 0 && form}
            {editable && source && isSelected && (
                <div className="mt-3 flex flex-col gap-2" data-kg-embed-settings>
                    <input
                        aria-label={text.titleLabel}
                        className={FIELD}
                        data-kg-embed-title
                        defaultValue={title}
                        placeholder={text.titlePlaceholder}
                        onChange={event => update({title: event.target.value})}
                    />
                    {form}
                </div>
            )}
        </div>
    );
}

export default EmbedNodeComponent;
