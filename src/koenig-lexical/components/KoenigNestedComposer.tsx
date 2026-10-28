import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';

const KoenigNestedComposer = ({initialEditor, initialEditorState, initialNodes, initialTheme, skipCollabChecks, children} = {}) => {
    const {isCollabActive} = useCollaborationContext();
    const {collaboration} = React.useContext(KoenigComposerContext);
    const id = initialEditor.getKey();
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
            {isCollabActive && collaboration ? (
                <CollaborationPlugin
                    getXmlText={getXmlText}
                    id={id}
                    initialEditorState={initialEditorState}
                    providerFactory={collaboration.providerFactory}
                    shouldBootstrap={true}
                />
            ) : null }
            {children}
        </LexicalNestedComposer>
    );
};

export default KoenigNestedComposer;
