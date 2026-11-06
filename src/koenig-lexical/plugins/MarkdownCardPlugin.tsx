import React from 'react';
import {$createMarkdownNode, INSERT_MARKDOWN_COMMAND, MarkdownNode} from '../nodes/MarkdownNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Named for the card; MarkdownShortcutPlugin and MarkdownPastePlugin handle Markdown typed
// or pasted into ordinary text.
export const MarkdownCardPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([MarkdownNode])){
            console.error('MarkdownCardPlugin: MarkdownNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_MARKDOWN_COMMAND,
                async (dataset) => {
                    const cardNode = $createMarkdownNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default MarkdownCardPlugin;
