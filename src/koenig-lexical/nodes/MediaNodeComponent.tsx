import CardContext from '../context/CardContext';
import FileUploadForm from '../components/ui/FileUploadForm';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {MediaPlaceholder} from '../components/ui/MediaPlaceholder';
import {ProgressBar} from '../components/ui/ProgressBar';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem} from '../components/ui/ToolbarMenu';
import {checkUpload, describeUploadProblem} from '../../additions/media/uploadLimits';
import {hasCaptions} from '../../additions/media/renderMedia';
import {isVtt, safeMediaUrl} from '../../additions/media/safeMediaUrl';
import {openFileSelection} from '../utils/openFileSelection';
import {readMediaMetadata} from '../../additions/media/readMediaMetadata';
import {useKoenigEditable} from '../../additions/preview/PreviewContext';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// The video and audio cards are one component: an uploaded file, played by the browser's own
// player (so play, seek, volume and mute all work from the keyboard), with a captions track
// and a transcript beside it. `kind` is the node type and the upload type.
function MediaNodeComponent({
    kind,
    nodeKey,
    src,
    textValue,
    transcript,
    trackSrc,
    trackLang,
    trackLabel,
    width,
    height,
    triggerFileDialog,
    initialFile
}) {
    const strings = useKoenigStrings();
    const text = strings[kind];
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const trackInputRef = React.useRef();
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [problem, setProblem] = React.useState('');

    const uploader = fileUploader.useFileUpload(kind);
    // captions are small text files; hosts that only know media types use their 'file' rule
    const trackUploader = fileUploader.useFileUpload('file');
    const rule = fileUploader.fileTypes?.[kind];

    const update = React.useCallback((values) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            Object.assign(node, values);
        });
    }, [editor, nodeKey]);

    const upload = React.useCallback(async (files) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        const found = checkUpload(file, rule);
        if (found) {
            setProblem(describeUploadProblem(found, text));
            return;
        }
        setProblem('');
        const [result, metadata] = await Promise.all([uploader.upload(files), readMediaMetadata(file, kind)]);
        const url = result?.[0]?.url;
        if (!url) {
            return;
        }
        update({
            src: url,
            fileName: file.name,
            mimeType: file.type || '',
            duration: metadata.duration || 0,
            ...(kind === 'video' ? {width: metadata.width || null, height: metadata.height || null} : {})
        });
    }, [kind, rule, text, update, uploader.upload]);

    const uploadTrack = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (!isVtt(file)) {
            setProblem(text.trackError);
            return;
        }
        setProblem('');
        const result = await trackUploader.upload([file]);
        const url = result?.[0]?.url;
        if (url) {
            update({trackSrc: url});
        }
    };

    const dragHandler = useFileDragAndDrop({handleDrop: upload});

    React.useEffect(() => {
        if (initialFile && !src) {
            upload([initialFile]);
        }
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }
        const timeout = setTimeout(() => {
            openFileSelection({fileInputRef});
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.triggerFileDialog = false;
            });
        });
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const safeSrc = safeMediaUrl(src);
    const safeTrack = safeMediaUrl(trackSrc);
    const errors = [...(problem ? [{message: problem}] : []), ...(uploader.errors || []), ...(trackUploader.errors || [])];
    const Player = kind;
    // a reader sees the player and the text, not the fields, the warning or the settings
    const editable = useKoenigEditable();

    const field = 'w-full bg-transparent font-sans text-sm text-grey-900 placeholder:text-grey-500 dark:text-grey-200';

    return (
        <>
            {uploader.isLoading ? (
                <div className="relative flex items-center justify-center border border-grey/20 bg-grey-50 p-6 dark:bg-grey-900">
                    <ProgressBar style={{width: `${uploader.progress?.toFixed(0)}%`}} />
                </div>
            ) : safeSrc ? (
                <div className="not-kg-prose">
                    {kind === 'audio' && !editable && textValue ? <p className="mb-2 font-sans text-sm font-semibold text-grey-900 dark:text-grey-200" data-kg-media-text="title">{textValue}</p> : null}
                    {kind === 'audio' && editable && (isSelected || textValue) && (
                        <input
                            aria-label={text.titlePlaceholder}
                            className={`${field} mb-2 font-semibold`}
                            data-kg-media-field="title"
                            defaultValue={textValue}
                            placeholder={text.titlePlaceholder}
                            onChange={event => update({title: event.target.value})}
                        />
                    )}
                    <Player
                        className="mx-auto block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
                        controls
                        data-testid={`${kind}-card-populated`}
                        height={kind === 'video' && width && height ? height : undefined}
                        preload="metadata"
                        src={safeSrc}
                        tabIndex={0}
                        width={kind === 'video' && width && height ? width : undefined}
                    >
                        {safeTrack && (
                            <track
                                default
                                kind="captions"
                                label={trackLabel || trackLang || 'en'}
                                src={safeTrack}
                                srcLang={trackLang || 'en'}
                            />
                        )}
                    </Player>
                    {editable && !hasCaptions({trackSrc, transcript}) && (
                        <p className="mt-2 font-sans text-sm font-semibold text-red" data-kg-captions-missing role="status">
                            {text.captionsMissing}
                        </p>
                    )}
                    {kind === 'video' && !editable && textValue ? <p className="mt-2 text-center font-sans text-sm text-grey-800 dark:text-grey-500" data-kg-media-text="caption">{textValue}</p> : null}
                    {!editable && transcript?.trim() ? <div className="mt-2 whitespace-pre-wrap font-sans text-sm text-grey-800 dark:text-grey-500" data-kg-media-text="transcript">{transcript}</div> : null}
                    {kind === 'video' && editable && (isSelected || textValue) && (
                        <input
                            aria-label={text.captionPlaceholder}
                            className={`${field} mt-2 text-center`}
                            data-kg-media-field="caption"
                            defaultValue={textValue}
                            placeholder={text.captionPlaceholder}
                            onChange={event => update({caption: event.target.value})}
                        />
                    )}
                    {editable && isSelected && (
                        <div className="mt-3 flex flex-col gap-2" data-kg-media-settings>
                            <textarea
                                aria-label={text.transcriptPlaceholder}
                                className={`${field} min-h-[8rem] rounded-md border border-grey/30 p-2`}
                                data-kg-media-field="transcript"
                                defaultValue={transcript}
                                placeholder={text.transcriptPlaceholder}
                                onChange={event => update({transcript: event.target.value})}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    className="rounded-md border border-grey/30 px-3 py-1 font-sans text-sm text-grey-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-selection dark:text-grey-200"
                                    data-kg-media-track-upload
                                    type="button"
                                    onClick={() => openFileSelection({fileInputRef: trackInputRef})}
                                >
                                    {text.trackUpload}
                                </button>
                                {safeTrack && (
                                    <button
                                        className="rounded-md border border-grey/30 px-3 py-1 font-sans text-sm text-grey-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-selection dark:text-grey-200"
                                        type="button"
                                        onClick={() => update({trackSrc: ''})}
                                    >
                                        {text.trackRemove}
                                    </button>
                                )}
                                <input
                                    aria-label={text.trackLanguage}
                                    className={`${field} w-24 rounded-md border border-grey/30 px-2 py-1`}
                                    defaultValue={trackLang}
                                    maxLength={12}
                                    placeholder="en"
                                    onChange={event => update({trackLang: event.target.value})}
                                />
                                <input
                                    aria-label={text.trackLabel}
                                    className={`${field} w-40 rounded-md border border-grey/30 px-2 py-1`}
                                    defaultValue={trackLabel}
                                    maxLength={40}
                                    placeholder={text.trackLabel}
                                    onChange={event => update({trackLabel: event.target.value})}
                                />
                            </div>
                            <input
                                ref={trackInputRef}
                                accept=".vtt,text/vtt"
                                hidden={true}
                                name="track-input"
                                type="file"
                                onChange={uploadTrack}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <MediaPlaceholder
                        desc={text.select}
                        filePicker={() => openFileSelection({fileInputRef})}
                        icon={kind}
                        isDraggedOver={dragHandler.isDraggedOver}
                        placeholderRef={dragHandler.setRef}
                        size="small"
                    />
                    <FileUploadForm
                        accept={rule?.mimeTypes?.join(',') || `${kind}/*`}
                        fileInputRef={fileInputRef}
                        onFileChange={event => upload(event.target.files)}
                    />
                </>
            )}
            {errors.map(error => (
                <p key={error.message} className="mt-2 font-sans text-sm font-semibold text-red" data-kg-file-error role="alert">
                    {error.message}
                </p>
            ))}

            <ActionToolbar data-kg-card-toolbar={kind} isVisible={showSnippetToolbar}>
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>
            <ActionToolbar
                data-kg-card-toolbar={kind}
                isVisible={isSelected && Boolean(safeSrc) && !showSnippetToolbar && Boolean(cardConfig?.createSnippet)}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        icon="snippet"
                        isActive={false}
                        label={strings.card.saveAsSnippet}
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export default MediaNodeComponent;
