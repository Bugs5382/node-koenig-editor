import React from 'react';
import {$createVideoNode, INSERT_VIDEO_COMMAND, VideoNode} from '../nodes/VideoNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const VideoPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([VideoNode])){
            console.error('VideoPlugin: VideoNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_VIDEO_COMMAND,
                async (dataset) => {
                    const cardNode = $createVideoNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    return null;
};

export default VideoPlugin;
