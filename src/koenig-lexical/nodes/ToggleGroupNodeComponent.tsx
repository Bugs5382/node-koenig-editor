import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {itemsMatch} from '../utils/toggleGroupItems';
import {ToggleGroupCard} from '../components/ui/cards/ToggleGroupCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useKoenigStrings} from '../../additions/options';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ToggleGroupNodeComponent({nodeKey, itemEditors, itemIds}) {
    const strings = useKoenigStrings();
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    React.useEffect(() => {
        for (const item of itemEditors) {
            item.headingEditor.setEditable(isEditing);
            item.contentEditor.setEditable(isEditing);
        }
    }, [isEditing, itemEditors]);

    // another window of a shared session changed the items: build the editors this one lacks
    const inStep = !Array.isArray(itemIds) || itemIds.length === 0 || itemsMatch(itemIds, itemEditors);
    React.useEffect(() => {
        if (!inStep) {
            editor.update(() => {
                $getNodeByKey(nodeKey)?.syncItems();
            }, {tag: 'history-merge'});
        }
    }, [editor, inStep, nodeKey]);

    const addItem = () => {
        editor.update(() => {
            $getNodeByKey(nodeKey)?.addItem();
        });
    };

    const removeItem = (index) => {
        editor.update(() => {
            $getNodeByKey(nodeKey)?.removeItem(index);
        });
    };

    if (!inStep) {
        return null;
    }

    return (
        <>
            <ToggleGroupCard
                isEditing={isEditing}
                itemEditors={itemEditors}
                onAddItem={addItem}
                onRemoveItem={removeItem}
            />

            <ActionToolbar
                data-kg-card-toolbar="toggle-group"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="toggle-group"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label={strings.card.edit} onClick={handleToolbarEdit} />
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
