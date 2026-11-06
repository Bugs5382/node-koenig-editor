import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import {$createAsideNode} from '../../nodes/AsideNode';
import {
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode
} from '@lexical/rich-text';
import {
    $createParagraphNode,
    $getSelection,
    $isRangeSelection,
    FORMAT_TEXT_COMMAND
} from 'lexical';
import {$getNearestNodeOfType} from '@lexical/utils';
import {$isListNode, ListNode} from '@lexical/list';
import {$setBlocksType} from '@lexical/selection';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuSeparator
} from './ToolbarMenu';
import {altOrOption, ctrlOrCmdSymbol, ctrlOrSymbol} from '../../utils/shortcutSymbols';
import {getSelectedNode} from '../../utils/getSelectedNode';
import {isToolbarItemHidden, useKoenigStrings} from '../../../additions/options';

const blockTypeToBlockName = {
    bullet: 'Bulleted List',
    check: 'Check List',
    code: 'Code Block',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    h4: 'Heading 4',
    h5: 'Heading 5',
    number: 'Numbered List',
    paragraph: 'Normal',
    quote: 'Quote',
    'extended-quote': 'Quote',
    aside: 'Aside'
};

// H1 to H5 and no deeper: the editor clamps anything lower (see HeadingLimitPlugin).
const HEADING_LEVELS = [
    {tag: 'h1', item: 'heading1', icon: 'headingOne', key: '1'},
    {tag: 'h2', item: 'heading2', icon: 'headingTwo', key: '2'},
    {tag: 'h3', item: 'heading3', icon: 'headingThree', key: '3'},
    {tag: 'h4', item: 'heading4', icon: 'headingFour', key: '4'},
    {tag: 'h5', item: 'heading5', icon: 'headingFive', key: '5'}
];

function quoteIcon(blockType = '') {
    if (blockType.endsWith?.('quote')) {
        return 'quoteOne';
    } else if (blockType.endsWith?.('aside')) {
        return 'quoteTwo';
    } else {
        return 'quote';
    }
}

export default function FormatToolbar({
    editor,
    isSnippetsEnabled,
    isLinkSelected,
    onLinkClick,
    onSnippetClick,
    onActionClick,
    hiddenFormats = []
}) {
    const strings = useKoenigStrings();
    const [isBold, setIsBold] = React.useState(false);
    const [isItalic, setIsItalic] = React.useState(false);
    const [blockType, setBlockType] = React.useState('paragraph');
    const {cardConfig: {createSnippet}, toolbar, toolbarActions} = React.useContext(KoenigComposerContext);
    // the host's `toolbar` option names the buttons to show; leaving it out shows them all
    const isHidden = item => isToolbarItemHidden(toolbar, item);

    let hideHeading = false;
    if (!editor.hasNodes([HeadingNode])){
        hideHeading = true;
    }

    let hideQuotes = false;
    if (!editor.hasNodes([QuoteNode])){
        hideQuotes = true;
    }
    
    let hideSnippets = !isSnippetsEnabled || !createSnippet || isHidden('snippet'); // don't show snippet toolbar if we can't create them
    if (editor._parentEditor) {
        hideSnippets = true;
    }

    let hideBold = isHidden('bold');
    if (hiddenFormats.includes('bold')) {
        hideBold = true;
    }

    const updateState = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // Should not to pop up the floating toolbar when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }
            // update text format
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));

            const anchorNode = getSelectedNode(selection);
            const element = anchorNode.getKey() === 'root'
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);

            if (elementDOM !== null) {
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList
                        ? parentList.getListType()
                        : element.getListType();
                    setBlockType(type);
                } else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();

                    if (type in blockTypeToBlockName) {
                        setBlockType(type);
                    }
                }
            }
        });
    }, [editor]);

    React.useEffect(() => {
        updateState();

        return editor.registerUpdateListener(() => {
            updateState();
        });
    }, [editor, updateState]);

    const formatParagraph = () => {
        if (blockType !== 'paragraph') {
            editor.update(() => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            });
        }
    };

    const formatHeading = (headingSize) => {
        if (blockType !== headingSize) {
            editor.update(() => {
                const selection = $getSelection();

                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(headingSize));
                }
            });
        }
    };

    const formatQuote = () => {
        editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
                if (blockType?.endsWith('quote')) {
                    $setBlocksType(selection, () => $createAsideNode());
                } else if (blockType?.endsWith?.('aside')) {
                    $setBlocksType(selection, () => $createParagraphNode());
                } else {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            }
        });
    };

    return (
        <ToolbarMenu>
            <ToolbarMenuItem
                data-kg-toolbar-button="bold"
                hide={hideBold}
                icon="bold"
                isActive={isBold}
                label={strings.toolbar.bold}
                shortcutKeys={[ctrlOrCmdSymbol(), 'B']}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="italic"
                hide={isHidden('italic')}
                icon="italic"
                isActive={isItalic}
                label={strings.toolbar.italic}
                shortcutKeys={[ctrlOrCmdSymbol(), 'I']}
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
            />
            {HEADING_LEVELS.map(({tag, item, icon, key}) => (
                <ToolbarMenuItem
                    key={tag}
                    data-kg-toolbar-button={tag}
                    hide={hideHeading || isHidden(item)}
                    icon={icon}
                    isActive={blockType === tag}
                    label={strings.toolbar[item]}
                    shortcutKeys={[ctrlOrSymbol(), altOrOption(), key]}
                    onClick={() => (blockType === tag ? formatParagraph() : formatHeading(tag))}
                />
            ))}
            <ToolbarMenuSeparator hide={hideQuotes || isHidden('quote')} />
            <ToolbarMenuItem
                data-kg-toolbar-button="quote"
                hide={hideQuotes || isHidden('quote')}
                icon={quoteIcon(blockType)}
                isActive={blockType.endsWith?.('quote') || blockType.endsWith?.('aside')}
                label={strings.toolbar.quote}
                shortcutKeys={[ctrlOrSymbol(), 'Q']}
                onClick={formatQuote}
            />

            <ToolbarMenuItem
                data-kg-toolbar-button="link"
                hide={isHidden('link')}
                icon="link"
                isActive={!!isLinkSelected}
                label={strings.toolbar.link}
                shortcutKeys={[ctrlOrCmdSymbol(), 'K']}
                onClick={onLinkClick}
            />

            {(toolbarActions || []).filter(action => !action.hidden).map(action => (
                <ToolbarMenuItem
                    key={action.id}
                    CustomIcon={action.Icon}
                    data-kg-toolbar-button={action.id}
                    icon={action.id}
                    isActive={false}
                    label={action.label}
                    onClick={() => onActionClick?.(action)}
                />
            ))}

            <ToolbarMenuSeparator hide={hideSnippets} />
            <ToolbarMenuItem
                data-kg-toolbar-button="snippet"
                hide={hideSnippets}
                icon="snippet"
                isActive={false}
                label={strings.toolbar.snippet}
                onClick={onSnippetClick}
            />
        </ToolbarMenu>
    );
}
