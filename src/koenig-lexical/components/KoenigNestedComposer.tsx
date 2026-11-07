import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {$getRoot} from 'lexical';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';

// A card builds its nested editor from its own content before the collaboration binding exists,
// and Lexical only writes the seed into the shared document when the editor is empty, so the
// content never reached the other windows. The first time an editor joins a session its content
// is lifted out and handed back as the seed: the shared document takes it if it is empty, and
// the editor takes the shared content if it is not.
const emptied = new WeakSet();

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    const {collaboration} = React.useContext(KoenigComposerContext);
    const id = initialEditor.getKey();
    // `isCollabActive` is flipped by an effect of the main plugin, after the cards have first
    // rendered, and nothing re-renders them: a caption would never bind. The option is enough.
    const joining = Boolean(collaboration);
    const seed = React.useRef(initialEditor.getEditorState());

    React.useLayoutEffect(() => {
        if (!joining || emptied.has(initialEditor)) {
            return;
        }
        emptied.add(initialEditor);
        initialEditor.update(() => {
            $getRoot().clear();
        }, {discrete: true, tag: 'history-merge'});
    }, [initialEditor, joining]);
    const getXmlText = React.useMemo(() => {
        if (!collaboration?.getNestedXmlText) {
            return undefined;
        }
        return doc => collaboration.getNestedXmlText(doc, id);
    }, [collaboration, id]);

    return (
        <LexicalNestedComposer
            initialEditor={initialEditor}
            initialNodes={initialNodes}
            initialTheme={initialTheme}
            skipCollabChecks={skipCollabChecks}
        >
            {joining ? (
                <CollaborationPlugin
                    getXmlText={getXmlText}
                    id={id}
                    initialEditorState={seed.current}
                    providerFactory={collaboration.providerFactory}
                    shouldBootstrap={true}
                />
            ) : null }
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
