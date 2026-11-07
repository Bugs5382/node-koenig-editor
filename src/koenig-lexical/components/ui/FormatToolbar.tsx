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

// the inline formats after bold and italic, each with the keys that toggle it
const INLINE_FORMATS = [
    {item: 'underline', keys: () => [ctrlOrCmdSymbol(), 'U']},
    {item: 'strikethrough', keys: () => [ctrlOrCmdSymbol(), shiftOrSymbol(), 'X']},
    {item: 'subscript', keys: () => [ctrlOrCmdSymbol(), ',']},
    {item: 'superscript', keys: () => [ctrlOrCmdSymbol(), '.']},
    {item: 'code', keys: () => undefined}
];

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
import {StyleMenu} from '../../../additions/textStyle/StyleMenu';
import {$clearFormatting, $getTextStyle, $setHighlight, $setTextStyle, FONT_SIZES, HIGHLIGHTS, TEXT_COLORS} from '../../../additions/textStyle/textStyle';
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
    const [inlineOn, setInlineOn] = React.useState({});
    const [blockType, setBlockType] = React.useState('paragraph');
    const [alignment, setAlignment] = React.useState({direction: null, format: ''});
    const [cell, setCell] = React.useState(null);
    const [scope, setScope] = React.useState('cell');
    const {cardConfig: {createSnippet}, toolbar, toolbarActions, fonts} = React.useContext(KoenigComposerContext);
    // the style button whose list is open, and the button it hangs from
    const [styleMenu, setStyleMenu] = React.useState(null);
    const [styleNow, setStyleNow] = React.useState({});
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
            const nextInline = {};
            for (const {item} of INLINE_FORMATS) {
                nextInline[item] = selection.hasFormat(item);
            }
            const nextStyle = {
                'font-size': $getTextStyle(selection, 'font-size'),
                color: $getTextStyle(selection, 'color'),
                'background-color': $getTextStyle(selection, 'background-color'),
                'font-family': $getTextStyle(selection, 'font-family')
            };
            setStyleNow(current => (JSON.stringify(current) === JSON.stringify(nextStyle) ? current : nextStyle));
            setInlineOn(current => (JSON.stringify(current) === JSON.stringify(nextInline) ? current : nextInline));

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

    // Alt+F10 (see FloatingToolbarPlugin) puts focus on the first button. In the toolbar the arrow
    // keys, Home and End move between buttons, and Escape goes back to the text.
    const onToolbarKeyDown = (event) => {
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const index = buttons.indexOf(document.activeElement);
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            // restores the text selection and, since focus is on a button, the editing area itself
            editor.focus();
            editor.getRootElement()?.focus({preventScroll: true});
            return;
        }
        if (index === -1 || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
            return;
        }
        event.preventDefault();
        const to = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1);
        buttons[(to + buttons.length) % buttons.length]?.focus();
    };

    // the lists under the style buttons: what each offers, what the selection has now, and what
    // choosing one does
    const strings_ = strings.textStyle;
    const closeStyleMenu = () => {
        setStyleMenu(null);
        editor.focus();
        editor.getRootElement()?.focus({preventScroll: true});
    };
    const sizeNow = FONT_SIZES.find(size => size.value === (styleNow['font-size'] || null))?.id || 'normal';
    const STYLE_MENUS = {
        fontSize: {
            label: strings.toolbar.fontSize,
            options: FONT_SIZES.map(size => ({id: size.id, label: strings_.sizes[size.id], checked: sizeNow === size.id, sample: size.value ? {fontSize: size.value} : undefined})),
            apply: id => $setTextStyle($getSelection(), 'font-size', FONT_SIZES.find(size => size.id === id)?.value || null)
        },
        textColor: {
            label: strings.toolbar.textColor,
            options: [
                {id: 'default', label: strings_.defaultColour, checked: !styleNow.color || styleNow.color === 'inherit'},
                ...TEXT_COLORS.map(color => ({id: color.id, label: strings_.colours[color.id], swatch: color.value, checked: (styleNow.color || '').toLowerCase() === color.value.toLowerCase()}))
            ],
            apply: id => $setTextStyle($getSelection(), 'color', TEXT_COLORS.find(color => color.id === id)?.value || null)
        },
        highlight: {
            label: strings.toolbar.highlight,
            options: [
                {id: 'none', label: strings_.noHighlight, checked: !styleNow['background-color']},
                ...HIGHLIGHTS.map(color => ({id: color.id, label: strings_.highlights[color.id], swatch: color.value, checked: (styleNow['background-color'] || '').toLowerCase() === color.value.toLowerCase()}))
            ],
            apply: id => $setHighlight($getSelection(), HIGHLIGHTS.find(color => color.id === id)?.value || null)
        },
        fontFamily: {
            label: strings.toolbar.fontFamily,
            options: [
                {id: 'default', label: strings_.defaultFont, checked: !styleNow['font-family']},
                ...(fonts || []).map((font, index) => ({id: `font-${index}`, label: font.label, checked: styleNow['font-family'] === font.value, sample: {fontFamily: font.value}}))
            ],
            apply: id => $setTextStyle($getSelection(), 'font-family', id === 'default' ? null : (fonts || [])[Number(id.slice(5))]?.value || null)
        }
    };
    const styleButton = (item) => ({
        ariaExpanded: styleMenu?.item === item,
        ariaHasPopup: 'menu',
        'data-kg-toolbar-button': item,
        icon: item,
        label: strings.toolbar[item],
        onClick: (event) => {
            const anchor = event.currentTarget;
            setStyleMenu(current => (current?.item === item ? null : {item, anchor}));
        }
    });

    const openMenu = styleMenu ? STYLE_MENUS[styleMenu.item] : null;

    return (
        <>
        <ToolbarMenu aria-label={strings.toolbar.group} data-kg-selection-toolbar role="toolbar" onKeyDown={onToolbarKeyDown}>
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
            {INLINE_FORMATS.map(({item, keys}) => (
                <ToolbarMenuItem
                    key={item}
                    data-kg-toolbar-button={item}
                    hide={isHidden(item)}
                    icon={item}
                    isActive={!!inlineOn[item]}
                    label={strings.toolbar[item]}
                    shortcutKeys={keys()}
                    onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, item)}
                />
            ))}
            <ToolbarMenuItem
                {...styleButton('fontSize')}
                hide={isHidden('fontSize')}
                isActive={sizeNow !== 'normal'}
            />
            <ToolbarMenuItem
                {...styleButton('textColor')}
                hide={isHidden('textColor')}
                isActive={!!styleNow.color}
            />
            <ToolbarMenuItem
                {...styleButton('highlight')}
                hide={isHidden('highlight')}
                isActive={!!styleNow['background-color']}
            />
            <ToolbarMenuItem
                {...styleButton('fontFamily')}
                hide={isHidden('fontFamily') || !fonts?.length}
                isActive={!!styleNow['font-family']}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="clearFormatting"
                hide={isHidden('clearFormatting')}
                icon="clearFormatting"
                isActive={false}
                label={strings.toolbar.clearFormatting}
                shortcutKeys={[ctrlOrCmdSymbol(), '\\']}
                onClick={() => editor.update(() => $clearFormatting(), {discrete: true})}
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
        {openMenu ? (
            <StyleMenu
                anchor={styleMenu.anchor}
                label={openMenu.label}
                options={openMenu.options}
                onClose={closeStyleMenu}
                onPick={(id) => {
                    editor.update(() => openMenu.apply(id), {discrete: true});
                    closeStyleMenu();
                }}
            />
        ) : null}
        </>
    );
}
