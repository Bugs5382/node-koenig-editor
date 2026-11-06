import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ButtonCard} from '../components/ui/cards/ButtonCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {isSafeUrl} from '#kg-default-nodes';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ButtonNodeComponent({alignment, buttonText, buttonUrl, nodeKey}) {
    const strings = useKoenigStrings();
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const handleButtonTextChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonText = event.target.value;
        });
    };

    const handleButtonUrlChange = (val) => {
        // the card only offers http, https and mailto links; this is the last check before the node
        if (val !== '' && !isSafeUrl(val)) {
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonUrl = val;
        });
    };

    const handleAlignmentChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.alignment = value;
        });
    };

    return (
        <>
            <ButtonCard
                alignment={alignment}
                buttonPlaceholder={strings.button.textPlaceholder}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                handleAlignmentChange={handleAlignmentChange}
                handleButtonTextChange={handleButtonTextChange}
                handleButtonUrlChange={handleButtonUrlChange}
                isEditing={isEditing}
            />
            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-button-card" icon="edit" isActive={false} label={strings.card.edit} onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
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
