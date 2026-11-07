import React from 'react';
import {$createToggleGroupNode, INSERT_TOGGLE_GROUP_COMMAND, ToggleGroupNode} from '../nodes/ToggleGroupNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const ToggleGroupPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([ToggleGroupNode])) {
            console.error('ToggleGroupPlugin: ToggleGroupNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_TOGGLE_GROUP_COMMAND,
                (dataset) => {
                    const cardNode = $createToggleGroupNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});
                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default ToggleGroupPlugin;
