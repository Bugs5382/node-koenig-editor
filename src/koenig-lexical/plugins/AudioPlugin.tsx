import React from 'react';
import {$createAudioNode, AudioNode, INSERT_AUDIO_COMMAND} from '../nodes/AudioNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const AudioPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([AudioNode])){
            console.error('AudioPlugin: AudioNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_AUDIO_COMMAND,
                async (dataset) => {
                    const cardNode = $createAudioNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    return null;
};

export default AudioPlugin;
