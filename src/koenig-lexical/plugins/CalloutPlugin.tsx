import React from 'react';
import {$createCalloutNode, CalloutNode, INSERT_CALLOUT_COMMAND} from '../nodes/CalloutNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from './KoenigBehaviourPlugin';
import {DEFAULT_PALETTES, isColorValue} from '../../additions/colors/colors';
import {mergeRegister} from '@lexical/utils';
import {useColorSetting} from '../../additions/colors/ColorControl';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CalloutPlugin = () => {
    const [editor] = useLexicalComposerContext();
    // a host palette decides where a new callout starts: its first swatch, with that swatch's ink
    const setting = useColorSetting('calloutBackground');
    const first = setting.palette !== DEFAULT_PALETTES.calloutBackground ? setting.palette[0] : undefined;

    React.useEffect(() => {
        if (!editor.hasNodes([CalloutNode])){
            console.error('CalloutPlugin: CalloutNode not registered');
            return;
        }
        return mergeRegister(
            editor.registerCommand(
                INSERT_CALLOUT_COMMAND,
                async (dataset) => {
                    const start = first && !dataset?.backgroundColor
                        ? {backgroundColor: first.value, ...(isColorValue(first.ink) ? {textColor: first.ink} : {})}
                        : {};
                    const cardNode = $createCalloutNode({...start, ...dataset});
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode, openInEditMode: true});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    });

    return null;
};

export default CalloutPlugin;
