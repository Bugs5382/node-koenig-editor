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
import {fileUploadHandler} from '../utils/fileUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {safeMediaUrl} from '../../additions/media/safeMediaUrl';
import {useKoenigEditable} from '../../additions/preview/PreviewContext';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// A file as a reader sees it: the same card, with the text in place of inputs, and (for a safe
// address) the whole card a download link.
function ReaderFile({href, fileName, title, description, dataset}) {
    const body = (
        <div className="flex justify-between rounded-md border border-grey/30 p-2 font-sans">
            <div className="flex w-full flex-col justify-between px-2">
                {title ? <div className="py-1 text-lg font-bold leading-tight tracking-tight text-black dark:text-grey-200" data-kg-file-card="fileTitle">{title}</div> : null}
                {description ? <div className="pb-1 text-[1.6rem] font-normal leading-snug text-grey-700 dark:text-grey-300" data-kg-file-card="fileDescription">{description}</div> : null}
                <div className="py-1 text-sm font-medium text-grey-900 dark:text-grey-200" data-kg-file-card="dataset">{dataset}</div>
            </div>
        </div>
    );
    return href ? <a className="block no-underline" download={fileName} href={href} rel="noopener noreferrer">{body}</a> : body;
}

function FileNodeComponent({
    fileDesc,
    fileName,
    fileSize,
    fileTitle,
    fileSrc,
    nodeKey,
    triggerFileDialog,
    initialFile
}) {
    const strings = useKoenigStrings();
    const editable = useKoenigEditable();
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected, isEditing} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [problem, setProblem] = React.useState('');

    const uploader = fileUploader.useFileUpload('file');
    // the host's rule is optional: a composer without `fileTypes` accepts what its uploader accepts
    const rule = fileUploader.fileTypes?.file;

    const upload = React.useCallback(async (files) => {
        const found = files?.[0] ? checkUpload(files[0], rule) : null;
        if (found) {
            setProblem(describeUploadProblem(found, strings.file));
            return;
        }
        setProblem('');
        await fileUploadHandler(files, nodeKey, editor, uploader.upload);
    }, [editor, nodeKey, rule, strings.file, uploader.upload]);

    const fileDragHandler = useFileDragAndDrop({handleDrop: upload});

    React.useEffect(() => {
        if (initialFile && !fileSrc) {
            upload([initialFile]);
        }
        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // when card is inserted from the card menu or slash command we want to show the file picker immediately
    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            openFileSelection({fileInputRef});
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.triggerFileDialog = false;
            });
        });

        return () => clearTimeout(renderTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFileChange = async (event) => {
        const files = event.target.files;
        if (files?.length) {
            await upload(files);
        }
    };

    const setField = (field) => (event) => {
        const value = event.target.value;
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node[field] = value;
        });
    };

    const errors = [...(problem ? [{message: problem}] : []), ...(uploader.errors || [])];
    const isPopulated = Boolean(fileSrc && fileName);
    const accept = rule?.mimeTypes?.join(',') || undefined;

    return (
        <>
            {uploader.isLoading ? (
                <div className="h-full border border-transparent">
                    <div className="relative flex h-full items-center justify-center border border-grey/20 bg-grey-50 p-6 dark:bg-grey-900">
                        <ProgressBar style={{width: `${uploader.progress?.toFixed(0)}%`}} />
                    </div>
                </div>
            ) : isPopulated && !editable ? (
                // the reader's form: a download link with the text, not inputs
                <ReaderFile
                    dataset={<>{fileName}<span className="text-grey-700"> {'\u2022'} {fileSize}</span></>}
                    description={fileDesc}
                    fileName={fileName}
                    href={safeMediaUrl(fileSrc)}
                    title={fileTitle}
                />
            ) : isPopulated ? (
                <div className="flex justify-between rounded-md border border-grey/30 p-2 font-sans">
                    <div className="flex w-full flex-col justify-between px-2">
                        {(isSelected || fileTitle) && (
                            <input
                                aria-label={strings.file.titlePlaceholder}
                                className="h-[3rem] bg-transparent text-lg font-bold leading-none tracking-tight text-black dark:text-grey-200"
                                data-kg-file-card="fileTitle"
                                defaultValue={fileTitle}
                                maxLength={80}
                                placeholder={strings.file.titlePlaceholder}
                                readOnly={!isEditing && !isSelected}
                                onChange={setField('fileTitle')}
                            />
                        )}
                        {(isSelected || fileDesc) && (
                            <input
                                aria-label={strings.file.descriptionPlaceholder}
                                className="h-[2.6rem] bg-transparent pb-1 text-[1.6rem] font-normal leading-none text-grey-700 placeholder:text-grey-500 dark:text-grey-300"
                                data-kg-file-card="fileDescription"
                                defaultValue={fileDesc}
                                maxLength={100}
                                placeholder={strings.file.descriptionPlaceholder}
                                readOnly={!isEditing && !isSelected}
                                onChange={setField('fileCaption')}
                            />
                        )}
                        <div className="py-1 text-sm font-medium text-grey-900 dark:text-grey-200" data-kg-file-card="dataset">
                            {fileName}
                            <span className="text-grey-700"> {'•'} {fileSize}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <MediaPlaceholder
                        desc={strings.file.select}
                        filePicker={() => openFileSelection({fileInputRef})}
                        icon="file"
                        isDraggedOver={fileDragHandler.isDraggedOver}
                        placeholderRef={fileDragHandler.setRef}
                        size="xsmall"
                    />
                    <FileUploadForm
                        accept={accept}
                        fileInputRef={fileInputRef}
                        onFileChange={onFileChange}
                    />
                </>
            )}
            {errors.map(error => (
                <p key={error.message} className="mt-2 font-sans text-sm font-semibold text-red" data-kg-file-error role="alert">
                    {error.message}
                </p>
            ))}

            <ActionToolbar data-kg-card-toolbar="file-upload" isVisible={showSnippetToolbar}>
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="file-upload"
                isVisible={isSelected && isPopulated && !showSnippetToolbar && Boolean(cardConfig?.createSnippet)}
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

export default FileNodeComponent;
