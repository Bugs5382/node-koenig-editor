import {renderMarkdown} from '#kg-default-nodes';
import {useKoenigStrings} from '../../../../additions/options';

// Upstream's card embeds a CodeMirror editor (kg-simplemde) with Ghost image uploads. This
// one is a plain labelled text area: Markdown is written or pasted as text, and the preview
// is the same render function the exported HTML uses, so what shows is what is saved.
export function MarkdownCard({markdown = '', updateMarkdown, isEditing}) {
    const strings = useKoenigStrings().markdown;

    if (isEditing) {
        return (
            <div className="markdown-editor grid gap-3 md:grid-cols-2">
                <textarea
                    aria-label={strings.editorLabel}
                    autoFocus
                    className="min-h-[16rem] w-full resize-y rounded-lg border border-grey-100 bg-grey-100 p-3 font-mono text-sm text-grey-900 focus:border-selection focus-visible:outline-none dark:border-transparent dark:bg-grey-900 dark:text-white"
                    data-testid="markdown-editor"
                    defaultValue={markdown}
                    placeholder={strings.placeholder}
                    onChange={event => updateMarkdown(event.target.value)}
                />
                <MarkdownPreview label={strings.previewLabel} markdown={markdown} />
            </div>
        );
    }

    return <MarkdownPreview empty={strings.empty} label={strings.previewLabel} markdown={markdown} />;
}

function MarkdownPreview({markdown, label, empty}) {
    // renderMarkdown escapes raw HTML and drops unsafe links, so its output is safe to place
    const html = renderMarkdown(markdown);
    return (
        <div className="relative">
            {markdown || !empty
                ? <div aria-label={label} className="whitespace-normal" dangerouslySetInnerHTML={{__html: html}} data-testid="markdown-preview" role="region" />
                : <p className="text-grey-500">{empty}</p>}
            {/* keeps links in the preview from being followed while the card is being laid out */}
            <div className="absolute inset-0 z-50 mt-0"></div>
        </div>
    );
}
