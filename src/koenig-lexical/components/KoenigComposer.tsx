import DEFAULT_NODES from '../nodes/DefaultNodes';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import defaultTheme from '../themes/default';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {DEFAULT_CONFIG} from '#kg-default-nodes';
import {KoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {LexicalCollaboration} from '@lexical/react/LexicalCollaborationContext';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {SPACING_HTML_EXPORT} from '../../additions/spacing/spacingExport';
import {TABLE_HTML_EXPORT} from '../../additions/table/tableExport';
import {CommentsPlugin, KoenigCommentsContext, useCommentsStoreFor} from '../../additions/comments';
import {KoenigStringsContext, KoenigToolsContext, resolveStrings, resolveTools, selectEditorNodes} from '../../additions/options';
import {KoenigPreviewBridge} from './KoenigPreviewBridge';
import {MarkNode} from '@lexical/mark';

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function defaultOnError(error) {
    console.error(error);
}

const defaultConfig = {
    namespace: 'KoenigEditor',
    theme: defaultTheme,
    html: DEFAULT_CONFIG.html
};

// `collaboration` replaces upstream's built-in WebsocketProvider. The host supplies the Yjs
// provider factory (for the main document and for every nested editor), so the transport,
// credentials and room naming stay outside this package:
//
//   {
//     providerFactory(id, yjsDocMap) -> Provider,   // @lexical/yjs Provider
//     getNestedXmlText?(doc, id) -> XmlText,        // where a nested editor's content lives
//     username?, cursorColor?, cursorsContainerRef?, excludedProperties?, shouldBootstrap?
//   }
//
// `cards`, `customNodes`, `menuItems`, `strings` and `toolbar` are the host's options
// (src/additions/options): which shipped cards to register, its own nodes and menu entries,
// its wording, and which format buttons to show.
const KoenigComposer = ({
    initialEditorState,
    nodes: baseNodes = DEFAULT_NODES,
    cards,
    customNodes,
    menuItems,
    cardRenderers,
    gallery,
    strings: hostStrings,
    toolbar,
    fonts,
    toolbarActions,
    tools,
    onError = defaultOnError,
    fileUploader = {},
    cardConfig = {},
    darkMode = false,
    collaboration = null,
    comments,
    editable = true,
    preview,
    defaultPreview,
    onPreviewChange,
    previewOptions,
    onPreviewOptionsChange,
    previewComments,
    showPreviewToggle,
    children
}) => {
    const hasComments = Boolean(comments);
    const nodes = React.useMemo(() => {
        const selected = selectEditorNodes(baseNodes, cards, customNodes);
        // Comment anchors are mark nodes; they are registered only when comments are on.
        return hasComments && !selected.includes(MarkNode) ? [...selected, MarkNode] : selected;
    }, [baseNodes, cards, customNodes, hasComments]);
    const commentStore = useCommentsStoreFor(comments);
    const strings = React.useMemo(() => resolveStrings(hostStrings), [hostStrings]);
    const enabledTools = React.useMemo(() => resolveTools(tools), [tools]);

    const initialConfig = React.useMemo(() => {
        let editorState = initialEditorState;

        // root needs to have at least one paragraph node for the editor to work
        if (editorState) {
            if (typeof editorState === 'string') {
                editorState = JSON.parse(editorState);
            }

            if (editorState.root?.children?.length === 0) {
                editorState.root.children.push({
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                });
            }

            editorState = JSON.stringify(editorState);
        }

        return Object.assign({}, defaultConfig, {
            nodes,
            editable,
            editorState: collaboration ? null : editorState,
            // the saved HTML of a table: its caption, and dark ink on shaded cells
            html: {export: new Map([...TABLE_HTML_EXPORT, ...SPACING_HTML_EXPORT])},
            onError
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Boolean(collaboration), initialEditorState, nodes, onError]);

    const editorContainerRef = React.useRef(null);

    if (!fileUploader.useFileUpload) {
        fileUploader.useFileUpload = function () {
            console.error('<KoenigComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook');
            return;
        };
    }

    return (
        <LexicalCollaboration>
            <LexicalComposer initialConfig={initialConfig}>
                <KoenigComposerContext.Provider value={{
                    fileUploader,
                    editorContainerRef,
                    cardConfig,
                    darkMode,
                    collaboration,
                    menuItems,
                    cardRenderers,
                    gallery,
                    toolbar,
                    fonts,
                    toolbarActions
                }}>
                    <KoenigStringsContext.Provider value={strings}>
                        <KoenigToolsContext.Provider value={enabledTools}>
                        <KoenigCommentsContext.Provider value={commentStore}>
                        <KoenigSelectedCardContext>
                        <KoenigPreviewBridge
                            defaultPreview={defaultPreview}
                            editable={editable}
                            preview={preview}
                            previewComments={previewComments}
                            previewOptions={previewOptions}
                            showPreviewToggle={showPreviewToggle}
                            onPreviewChange={onPreviewChange}
                            onPreviewOptionsChange={onPreviewOptionsChange}
                        >
                            {commentStore ? <CommentsPlugin store={commentStore} /> : null}
                            {collaboration ? (
                                <CollaborationPlugin
                                    cursorColor={collaboration.cursorColor}
                                    cursorsContainerRef={collaboration.cursorsContainerRef}
                                    excludedProperties={collaboration.excludedProperties}
                                    id="main"
                                    initialEditorState={initialEditorState}
                                    providerFactory={collaboration.providerFactory}
                                    shouldBootstrap={collaboration.shouldBootstrap ?? true}
                                    username={collaboration.username}
                                />
                            ) : null}
                            {children}
                        </KoenigPreviewBridge>
                        </KoenigSelectedCardContext>
                        </KoenigCommentsContext.Provider>
                        </KoenigToolsContext.Provider>
                    </KoenigStringsContext.Provider>
                </KoenigComposerContext.Provider>
            </LexicalComposer>
        </LexicalCollaboration>
    );
};

export default KoenigComposer;
