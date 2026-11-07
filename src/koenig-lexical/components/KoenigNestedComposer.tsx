import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {$getRoot, $parseSerializedNode} from 'lexical';
import {XmlText} from 'yjs';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';

// A card builds its nested editor from its own content before the collaboration binding exists,
// and Lexical only bootstraps the shared document from an empty editor, so that content never
// reached the other windows. Once the provider has synced, a shared document that is still empty
// takes the editor's content; one that has content is left alone, and the editor takes it.
const seedWhenEmpty = (editor, id, docMap, getXmlText) => {
    const doc = docMap.get(id);
    if (!doc) {
        return;
    }
    const shared = getXmlText ? getXmlText(doc) : doc.get('root', XmlText);
    if (shared.length > 0) {
        return;
    }
    // Lexical sends a node to the shared document when it is new, not when it is dirty, so the
    // content goes back in as new nodes, in the one update, so nobody sees it blank.
    const children = editor.getEditorState().toJSON().root.children;
    if (children.length === 0) {
        return;
    }
    editor.update(() => {
        const root = $getRoot();
        root.clear();
        root.append(...children.map(child => $parseSerializedNode(child)));
    }, {tag: 'history-merge'});
};

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialTheme, skipCollabChecks, children} = {}) => {
    const {collaboration} = React.useContext(KoenigComposerContext);
    const id = initialEditor.getKey();
    // `isCollabActive` is flipped by an effect of the main plugin, after the cards have first
    // rendered, and nothing re-renders them: a caption would never bind. The option is enough.
    const joining = Boolean(collaboration);
    const getXmlText = React.useMemo(() => {
        if (!collaboration?.getNestedXmlText) {
            return undefined;
        }
        return doc => collaboration.getNestedXmlText(doc, id);
    }, [collaboration, id]);
    const providerFactory = React.useMemo(() => {
        if (!collaboration) {
            return undefined;
        }
        return (docId, docMap) => {
            const provider = collaboration.providerFactory(docId, docMap);
            provider.on('sync', (synced) => {
                if (synced) {
                    queueMicrotask(() => seedWhenEmpty(initialEditor, docId, docMap, getXmlText));
                }
            });
            return provider;
        };
    }, [collaboration, getXmlText, initialEditor]);

    return (
        <LexicalNestedComposer
            initialEditor={initialEditor}
            initialTheme={initialTheme}
            skipCollabChecks={skipCollabChecks}
        >
            {joining ? (
                <CollaborationPlugin
                    getXmlText={getXmlText}
                    id={id}
                    initialEditorState={initialEditorState}
                    providerFactory={providerFactory}
                    shouldBootstrap={true}
                />
            ) : null }
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
