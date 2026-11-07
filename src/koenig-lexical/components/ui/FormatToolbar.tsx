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
    FORMAT_TEXT_COMMAND,
    INDENT_CONTENT_COMMAND,
    OUTDENT_CONTENT_COMMAND
} from 'lexical';
import {$getNearestNodeOfType} from '@lexical/utils';
import {$alignInScope, $readTableState, TABLE_SCOPES} from '../../../additions/table/tableActions';
import {$alignmentOfSelection, ALIGN_OF_ITEM, isAlignActive} from '../../../additions/alignment/alignment';
import {$isListNode, INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode, REMOVE_LIST_COMMAND} from '@lexical/list';
import {$setBlocksType} from '@lexical/selection';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
    ToolbarMenu,
    ToolbarMenuItem,
    ToolbarMenuRow,
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
import {$getSelectionSpacing, $setSpacing, LINE_SPACINGS, PARAGRAPH_SPACINGS} from '../../../additions/spacing/spacing';
import {$getSelectionDirection, $setDirection} from '../../../additions/direction/direction';
import {useColorSetting} from '../../../additions/colors/ColorControl';
import {ColorMenu} from '../../../additions/colors/ColorMenu';
import {StyleMenu} from '../../../additions/textStyle/StyleMenu';
import {$clearFormatting, $getTextStyle, $setHighlight, $setTextStyle, FONT_SIZES} from '../../../additions/textStyle/textStyle';
import {ALIGNMENT_ITEMS, KOENIG_TOOLBAR_ITEMS, isToolbarItemHidden, useKoenigStrings} from '../../../additions/options';

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

// the data-kg-toolbar-button value of a toolbar item (the headings are named by their tag)
const buttonId = item => (/^heading\d$/.test(item) ? `h${item.slice(7)}` : item);
// the first button of the second row
const ROW_TWO_START = ['h1'];

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
    const {cardConfig: {createSnippet}, toolbar, toolbarActions, toolbarRows, fonts} = React.useContext(KoenigComposerContext);
    const textColorSetting = useColorSetting('textColor');
    const highlightSetting = useColorSetting('highlight');
    // the style button whose list is open, and the button it hangs from
    const [styleMenu, setStyleMenu] = React.useState(null);
    const [styleNow, setStyleNow] = React.useState({});
    const [spacingNow, setSpacingNow] = React.useState({});
    const [directionNow, setDirectionNow] = React.useState(null);
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
            const nextSpacing = $getSelectionSpacing(selection) || {};
            setDirectionNow($getSelectionDirection(selection));
            setSpacingNow(current => (JSON.stringify(current) === JSON.stringify(nextSpacing) ? current : nextSpacing));
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

    // a list button turns the selected blocks into that list, or back into paragraphs when they
    // already are one
    const LIST_COMMANDS = {bullet: INSERT_UNORDERED_LIST_COMMAND, number: INSERT_ORDERED_LIST_COMMAND, check: INSERT_CHECK_LIST_COMMAND};
    const toggleList = (type) => {
        editor.dispatchCommand(blockType === type ? REMOVE_LIST_COMMAND : LIST_COMMANDS[type], undefined);
    };
    const hideLists = !editor.hasNodes([ListNode]) || !!editor._parentEditor;

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
            colour: {slot: 'textColor', setting: textColorSetting, value: styleNow.color && styleNow.color !== 'inherit' ? styleNow.color : null},
            apply: value => $setTextStyle($getSelection(), 'color', value)
        },
        highlight: {
            label: strings.toolbar.highlight,
            colour: {slot: 'highlight', setting: highlightSetting, value: styleNow['background-color'] || null},
            apply: value => $setHighlight($getSelection(), value)
        },
        lineSpacing: {
            label: strings.toolbar.lineSpacing,
            options: [
                {id: 'default', label: strings_.defaultSpacing, checked: spacingNow.line === undefined},
                ...LINE_SPACINGS.map(entry => ({id: entry.id, label: strings_.lineSpacings[entry.id], checked: spacingNow.line === entry.value}))
            ],
            apply: id => $setSpacing($getSelection(), {line: LINE_SPACINGS.find(entry => entry.id === id)?.value ?? null})
        },
        paragraphSpacing: {
            label: strings.toolbar.paragraphSpacing,
            options: [
                {id: 'default', label: strings_.defaultSpacing, checked: spacingNow.after === undefined},
                ...PARAGRAPH_SPACINGS.map(entry => ({id: entry.id, label: strings_.paragraphSpacings[entry.id], checked: spacingNow.after === entry.id}))
            ],
            apply: id => $setSpacing($getSelection(), {after: PARAGRAPH_SPACINGS.find(entry => entry.id === id)?.id ?? null})
        },
        textDirection: {
            label: strings.toolbar.textDirection,
            options: ['auto', 'ltr', 'rtl'].map(id => ({id, label: strings_.directions[id], checked: (directionNow || 'auto') === id})),
            apply: id => $setDirection($getSelection(), id === 'auto' ? null : id)
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

    // The toolbar is laid out in rows: the text formats and styles on the first, blocks, lists,
    // spacing, alignment and link on the second (one row with `toolbarRows: 1`). A host's action
    // names its row, and the default button it goes after.
    const rowCount = toolbarRows === 1 ? 1 : 2;
    const visibleActions = (toolbarActions || []).filter(action => !action.hidden);
    const knownIds = new Set([...visibleActions.map(action => action.id), ...KOENIG_TOOLBAR_ITEMS.map(buttonId)]);
    const lastRow = Math.max(rowCount, ...visibleActions.map(action => action.row || 1));
    const anchored = action => !!action.after && knownIds.has(buttonId(action.after)) && action.after !== action.id;
    const actionButton = action => (
        <React.Fragment key={`host-${action.id}`}>
            <ToolbarMenuItem
                CustomIcon={action.Icon}
                data-kg-toolbar-button={action.id}
                icon={action.id}
                isActive={false}
                label={action.label}
                onClick={() => onActionClick?.(action)}
            />
            {actionsAfter(action.id)}
        </React.Fragment>
    );
    const actionsAfter = id => visibleActions.filter(action => anchored(action) && buttonId(action.after) === id).map(actionButton);
    const actionsAtEndOf = row => visibleActions.filter(action => !anchored(action) && (action.row || rowCount) === row).map(actionButton);
    const defaultButtons = React.Children.toArray((
        <>
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

            <ToolbarMenuSeparator hide={hideLists} />
            {[['bulletList', 'bullet', 'U'], ['numberList', 'number', 'O'], ['checkList', 'check', 'X']].map(([item, type, key]) => (
                <ToolbarMenuItem
                    key={item}
                    data-kg-toolbar-button={item}
                    hide={hideLists || isHidden(item)}
                    icon={item}
                    isActive={blockType === type}
                    label={strings.toolbar[item]}
                    shortcutKeys={undefined}
                    onClick={() => toggleList(type)}
                />
            ))}
            <ToolbarMenuItem
                data-kg-toolbar-button="outdent"
                hide={hideLists || isHidden('outdent')}
                icon="outdent"
                isActive={false}
                label={strings.toolbar.outdent}
                onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
            />
            <ToolbarMenuItem
                data-kg-toolbar-button="indent"
                hide={hideLists || isHidden('indent')}
                icon="indent"
                isActive={false}
                label={strings.toolbar.indent}
                onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
            />

            <ToolbarMenuItem
                {...styleButton('lineSpacing')}
                hide={hideAlignment || isHidden('lineSpacing')}
                isActive={spacingNow.line !== undefined}
            />
            <ToolbarMenuItem
                {...styleButton('paragraphSpacing')}
                hide={hideAlignment || isHidden('paragraphSpacing')}
                isActive={spacingNow.after !== undefined}
            />

            <ToolbarMenuItem
                {...styleButton('textDirection')}
                hide={hideAlignment || isHidden('textDirection')}
                isActive={!!directionNow}
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


            <ToolbarMenuSeparator hide={hideSnippets} />
            <ToolbarMenuItem
                data-kg-toolbar-button="snippet"
                hide={hideSnippets}
                icon="snippet"
                isActive={false}
                label={strings.toolbar.snippet}
                onClick={onSnippetClick}
            />
        </>
    ).props.children);
    const rows = [[]];
    for (const element of defaultButtons) {
        const id = element?.props?.['data-kg-toolbar-button'];
        if (rowCount > 1 && rows.length === 1 && ROW_TWO_START.includes(id)) {
            rows[0].push(...actionsAtEndOf(1));
            rows.push([]);
        }
        const current = rows[rows.length - 1];
        current.push(element);
        if (id) {
            current.push(...actionsAfter(id));
        }
    }
    rows[rows.length - 1].push(...actionsAtEndOf(rows.length));
    for (let extra = rows.length + 1; extra <= lastRow; extra++) {
        rows.push(actionsAtEndOf(extra));
    }

    return (
        <>
        <ToolbarMenu aria-label={strings.toolbar.group} data-kg-selection-toolbar role="toolbar" rows onKeyDown={onToolbarKeyDown}>
            {rows.map((items, index) => <ToolbarMenuRow key={index} row={index + 1}>{items}</ToolbarMenuRow>)}
        </ToolbarMenu>
        {openMenu?.colour ? (
            <ColorMenu
                anchor={styleMenu.anchor}
                label={openMenu.label}
                setting={openMenu.colour.setting}
                slot={openMenu.colour.slot}
                value={openMenu.colour.value}
                onClose={closeStyleMenu}
                onPick={(value) => {
                    editor.update(() => openMenu.apply(value), {discrete: true});
                    closeStyleMenu();
                }}
            />
        ) : openMenu ? (
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
