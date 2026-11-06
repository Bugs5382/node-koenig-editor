import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getSelection, $isParagraphNode, $isRangeSelection, $setSelection} from 'lexical';
import {AnchoredMenu} from '../../additions/placement/AnchoredMenu';
import {placePlus} from '../../additions/placement/placePlus';
import {CardMenu} from '../components/ui/CardMenu';
import {PlusButton, PlusMenu} from '../components/ui/PlusMenu';
import {buildCardMenu} from '../utils/buildCardMenu';
import {getCardMenuNodes, useKoenigStrings} from '../../additions/options';
import {getEditorCardNodes} from '../utils/getEditorCardNodes';
import {getSelectedNode} from '../utils/getSelectedNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// Used before the button has been measured (its size is a theme variable).
const FALLBACK_PLUS_SIZE = 22;

function usePlusCardMenu(editor) {
    const [isShowingButton, setIsShowingButton] = React.useState(false);
    const [isShowingMenu, setIsShowingMenu] = React.useState(false);
    const [topPosition, setTopPosition] = React.useState(0);
    const [leftPosition, setLeftPosition] = React.useState(0);
    const [cachedRange, setCachedRange] = React.useState(null);
    const [cardMenu, setCardMenu] = React.useState({});
    const containerRef = React.useRef(null);
    const lineRef = React.useRef(null);
    const menuRef = React.useRef(null);
    const buttonRef = React.useRef(null);
    const {cardConfig, menuItems} = React.useContext(KoenigComposerContext);
    const strings = useKoenigStrings();

    function getTopPosition(elem) {
        const elemRect = elem.getBoundingClientRect();
        const containerRect = elem.parentNode.getBoundingClientRect();

        return elemRect.top - containerRect.top;
    }

    // The button stays inside the box the person sees: the nearest ancestor of the editor that
    // clips, has a background or has a left border (a host's padded card), else the editor itself,
    // and never outside the window. It goes before the empty line when there is room (see placePlus).
    function getVisibleBox(elem) {
        const editorBox = elem.closest('.koenig-lexical') || elem.parentNode.parentNode || elem.parentNode;
        let box = editorBox;
        for (let ancestor = editorBox.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            const style = window.getComputedStyle(ancestor);
            const transparent = ['', 'rgba(0, 0, 0, 0)', 'transparent'].includes(style.backgroundColor);
            if (style.overflowX !== 'visible' || !transparent || parseFloat(style.borderLeftWidth) > 0) {
                box = ancestor;
                break;
            }
        }
        const rect = box.getBoundingClientRect();
        const left = Math.max(rect.left, 0);
        const right = Math.min(rect.right, document.documentElement.clientWidth || rect.right);
        return {left, width: Math.max(right - left, 0)};
    }

    function getLeftPosition(elem) {
        const box = getVisibleBox(elem);
        const line = elem.getBoundingClientRect();
        const measured = buttonRef.current?.firstElementChild?.firstElementChild?.getBoundingClientRect().width;
        const origin = (containerRef.current?.offsetParent || elem.closest('.koenig-lexical'))?.getBoundingClientRect().left;
        return placePlus(line, box, measured || FALLBACK_PLUS_SIZE, undefined, origin);
    }

    function getElementRange(elem) {
        const range = new Range();
        range.setStart(elem, 0);
        range.setEnd(elem, 0);
        return range;
    }

    const moveCursorToCachedRange = React.useCallback(() => {
        if (!cachedRange) {
            return;
        }
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(cachedRange);
    }, [cachedRange]);

    const showButton = React.useCallback((elem) => {
        lineRef.current = elem;
        const range = getElementRange(elem);
        setCachedRange(range);
        setIsShowingButton(true);
    }, [setIsShowingButton, setCachedRange]);

    const hideButton = React.useCallback(() => {
        setIsShowingButton(false);
        setIsShowingMenu(false);
        setCachedRange(null);
    }, [setIsShowingButton, setIsShowingMenu, setCachedRange]);

    const openMenu = React.useCallback((event) => {
        event?.preventDefault();

        // clear any existing selection so cards leave selected/editing mode
        // uses {discrete: true} so update is synchronous and cursor movement to cached range works
        editor.update(() => {
            $setSelection(null);
        }, {discrete: true});

        moveCursorToCachedRange();
        setIsShowingMenu(true);
    }, [editor, moveCursorToCachedRange, setIsShowingMenu]);

    const closeMenu = React.useCallback(({resetCursor = false} = {}) => {
        if (resetCursor) {
            moveCursorToCachedRange();
        }
        setIsShowingMenu(false);
    }, [moveCursorToCachedRange, setIsShowingMenu]);

    const updateButton = React.useCallback(() => {
        editor.getEditorState().read(() => {
            // don't do anything when using IME input
            if (editor.isComposing()) {
                return;
            }

            const selection = $getSelection();

            if (!$isRangeSelection(selection) || !selection.type === 'text' || !selection.isCollapsed()) {
                hideButton();
                return;
            }

            const node = getSelectedNode(selection);

            if (!$isParagraphNode(node) || node.getTextContent() !== '') {
                hideButton();
                return;
            }

            const nativeSelection = window.getSelection();
            const p = nativeSelection.anchorNode;
            const rootElement = editor.getRootElement();

            if (p?.tagName !== 'P' || !rootElement.contains(p)) {
                hideButton();
                return;
            }

            setTopPosition(getTopPosition(p));
            setLeftPosition(getLeftPosition(p));
            showButton(p);
        });
    }, [editor, showButton, hideButton]);

    // The first placement uses the button's size from before it rendered (or from the previous text
    // size); measure again once it is on screen so the gap before the line is right.
    React.useLayoutEffect(() => {
        if (isShowingButton && lineRef.current?.isConnected) {
            const left = getLeftPosition(lineRef.current);
            if (Math.abs(left - leftPosition) > 0.5) {
                setLeftPosition(left);
            }
        }
    });

    const insert = React.useCallback((insertCommand, {insertParams = {}} = {}) => {
        const commandParams = {...insertParams};
        editor.dispatchCommand(insertCommand, commandParams);
        closeMenu();
    }, [editor, closeMenu]);

    React.useEffect(() => {
        return editor.registerUpdateListener(() => {
            updateButton();
        }, [editor, updateButton]);
    });

    // hide the button as soon as there's any selection made outside of the
    // editor canvas - any click outside makes a selection so no need for
    // additional mouse tracking for this
    const hideButtonOnOutsideSelection = React.useCallback(() => {
        if (isShowingButton) {
            const nativeSelection = window.getSelection();

            // clicking inside the menu changes native selection, we don't want
            // to close the menu when that occurs
            if (isShowingMenu && (containerRef.current?.contains(nativeSelection.anchorNode) || menuRef.current?.contains(nativeSelection.anchorNode))) {
                return;
            }

            const rootElement = editor.getRootElement();

            if (!rootElement.contains(nativeSelection.anchorNode)) {
                hideButton();
            }
        }
    }, [editor, isShowingButton, isShowingMenu, hideButton]);

    React.useEffect(() => {
        document.addEventListener('selectionchange', hideButtonOnOutsideSelection);
        return () => {
            document.removeEventListener('selectionchange', hideButtonOnOutsideSelection);
        };
    }, [hideButtonOnOutsideSelection]);

    // show or move the button when the mouse moves over a blank paragraph
    const updateButtonOnMousemove = React.useCallback((event) => {
        // once the menu is open moving the mouse should not have any effect on button/menu positioning
        if (isShowingMenu) {
            return;
        }

        const rootElement = editor.getRootElement();
        let {pageX, pageY} = event;

        // add a horizontal buffer to the pointer position so that the button
        // doesn't disappear when moving across the gap between button and paragraph
        let containerRect = rootElement.getBoundingClientRect();
        if (pageX < containerRect.left) {
            pageX = pageX + 40;
        }

        // use the page coordinates to find the element under the pointer

        // TODO: this basic implementation isn't quite as forgiving as the mobiledoc implementation
        //   which appears to have a threshold around the point which creates a bigger hit area for
        //   nearby elements, whereas this removes the button immediately on margin mouseover. See:
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/editor/editor.ts#L1306
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/cursor/position.ts#L115
        //   - https://github.com/bustle/mobiledoc-kit/blob/cdd126009cb809e80ff1d0c202198310aaa1ad1a/src/js/utils/selection-utils.ts#L39-L90
        const hoveredElem = document.elementFromPoint(pageX, pageY);

        if (rootElement.contains(hoveredElem) && !hoveredElem.closest('[data-kg-card]')) {
            if (hoveredElem?.tagName === 'P' && hoveredElem.textContent === '') {
                // place cursor next to the hovered paragraph
                setTopPosition(getTopPosition(hoveredElem));
                setLeftPosition(getLeftPosition(hoveredElem));
                showButton(hoveredElem);
            } else {
                // reset button based on cursor position
                updateButton();
            }
        }
    }, [editor, isShowingMenu, setTopPosition, showButton, updateButton]);

    React.useEffect(() => {
        window.addEventListener('mousemove', updateButtonOnMousemove);
        return () => {
            window.removeEventListener('mousemove', updateButtonOnMousemove);
        };
    }, [updateButtonOnMousemove]);

    // when menu is open, watch the window for mousedown events so that we can
    // close it when we detect a click outside
    const closeMenuOnClickOutside = React.useCallback((event) => {
        if (isShowingMenu) {
            if (!containerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
                return closeMenu();
            }
        }
    }, [isShowingMenu, closeMenu]);

    React.useEffect(() => {
        window.addEventListener('mousedown', closeMenuOnClickOutside);
        return () => {
            window.removeEventListener('mousedown', closeMenuOnClickOutside);
        };
    }, [closeMenuOnClickOutside]);

    // when menu is open, close it when Escape or arrow keys are pressed
    const handleKeydown = React.useCallback((event) => {
        if (isShowingMenu) {
            if (event.key === 'Escape') {
                closeMenu({resetCursor: true});
                return;
            }

            let arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                closeMenu();
            }
        }
    }, [isShowingMenu, closeMenu]);

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    // build up the card menu based on registered nodes and current search
    React.useEffect(() => {
        const cardNodes = getCardMenuNodes(getEditorCardNodes(editor), {menuItems, strings});
        setCardMenu(buildCardMenu(cardNodes, {config: cardConfig}));
    }, [cardConfig, editor, setCardMenu, menuItems, strings]);

    const style = {
        left: `${leftPosition}px`,
        top: `${topPosition}px`
    };

    if (cardMenu.menu?.size === 0) {
        return null;
    }

    if (isShowingButton) {
        return (
            <div ref={containerRef} className="absolute z-50" style={style} data-kg-plus-container>
                {isShowingButton && <div ref={buttonRef}><PlusButton onClick={openMenu} /></div>}
                {isShowingMenu && (
                    <AnchoredMenu anchor={buttonRef.current} containerRef={menuRef}>
                        <PlusMenu>
                            <CardMenu closeMenu={closeMenu} insert={insert} menu={cardMenu.menu} />
                        </PlusMenu>
                    </AnchoredMenu>
                )}
            </div>
        );
    } else {
        return null;
    }
}

export default function PlusCardMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    return usePlusCardMenu(editor);
}
