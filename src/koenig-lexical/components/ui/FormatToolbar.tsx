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
    FORMAT_ELEMENT_COMMAND,
    FORMAT_TEXT_COMMAND
} from 'lexical';
import {$getNearestNodeOfType} from '@lexical/utils';
import {$alignInScope, $readTableState, TABLE_SCOPES} from '../../../additions/table/tableActions';
import {$alignmentOfSelection, ALIGN_OF_ITEM, isAlignActive} from '../../../additions/alignment/alignment';
import {$isListNode, ListNode} from '@lexical/list';
import {$setBlocksType} from '@lexical/selection';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuSeparator
} from './ToolbarMenu';
import {altOrOption, ctrlOrCmdSymbol, ctrlOrSymbol, shiftOrSymbol} from '../../utils/shortcutSymbols';

const ALIGN_KEY = {left: 'L', center: 'E', right: 'R', justify: 'J'};

// Text selected in a table cell aligns the cell, down as well as across, for the cell, its row, its
// column or the whole table. The "apply to" button cycles the choice and shows it in a few letters.
const VERTICAL_ALIGNS = [
    {item: 'alignTop', value: 'top'},
    {item: 'alignMiddle', value: 'middle'},
    {item: 'alignBottom', value: 'bottom'}
];
const scopeIcon = text => function ScopeIcon({className}) {
    return <span aria-hidden="true" className={className} style={{fontSize: '1.1rem', fontWeight: 700, lineHeight: 1}}>{text}</span>;
};
const SCOPE_ICONS = {cell: scopeIcon('Cell'), row: scopeIcon('Row'), column: scopeIcon('Col'), table: scopeIcon('All')};
const SCOPE_STRING = {cell: 'scopeCell', row: 'scopeRow', column: 'scopeColumn', table: 'scopeTable'};
import {getSelectedNode} from '../../utils/getSelectedNode';
import {ALIGNMENT_ITEMS, isToolbarItemHidden, useKoenigStrings} from '../../../additions/options';

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
    const [alignment, setAlignment] = React.useState({direction: null, format: ''});
    const [cell, setCell] = React.useState(null);
    const [scope, setScope] = React.useState('cell');
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

    // alignment is for the main editor's blocks; nested card text has none
    const hideAlignment = !!editor._parentEditor;
    const hideCellControls = hideAlignment || !cell || ALIGNMENT_ITEMS.every(item => isHidden(item));

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
            const tableState = $readTableState();
            const nextCell = tableState ? {align: tableState.align, vertical: tableState.verticalAlign} : null;
            setCell(current => (JSON.stringify(current) === JSON.stringify(nextCell) ? current : nextCell));
            const blockAlignment = $alignmentOfSelection();
            if (blockAlignment) {
                setAlignment(current => (current.format === blockAlignment.format && current.direction === blockAlignment.direction ? current : blockAlignment));
            }
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

            <ToolbarMenuSeparator hide={hideAlignment} />
            {Object.entries(ALIGN_OF_ITEM).map(([item, align]) => (
                <ToolbarMenuItem
                    key={item}
                    data-kg-toolbar-button={item}
                    hide={hideAlignment || isHidden(item)}
                    icon={item}
                    isActive={cell ? cell.align === align : isAlignActive(align, alignment)}
                    label={strings.toolbar[item]}
                    shortcutKeys={[ctrlOrCmdSymbol(), shiftOrSymbol(), ALIGN_KEY[align]]}
                    onClick={() => (cell
                        ? editor.update(() => $alignInScope('across', align, scope), {discrete: true})
                        : editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align))}
                />
            ))}
            {VERTICAL_ALIGNS.map(({item, value}) => (
                <ToolbarMenuItem
                    key={item}
                    data-kg-toolbar-button={item}
                    hide={hideCellControls}
                    icon={item}
                    isActive={cell?.vertical === value}
                    label={strings.table[item]}
                    onClick={() => editor.update(() => $alignInScope('down', value, scope), {discrete: true})}
                />
            ))}
            <ToolbarMenuItem
                CustomIcon={SCOPE_ICONS[scope]}
                data-kg-toolbar-button="alignScope"
                hide={hideCellControls}
                isActive={false}
                label={`${strings.table.alignScope} ${strings.table[SCOPE_STRING[scope]]}`}
                onClick={() => setScope(current => TABLE_SCOPES[(TABLE_SCOPES.indexOf(current) + 1) % TABLE_SCOPES.length])}
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
