const VERTICAL_GAP = 10;
const VIEWPORT_MARGIN = 8;

export function setFloatingElemPosition(
    targetRect: {bottom: number; height: number; left: number; top: number; width: number} | undefined,
    floatingElem: HTMLElement | null | undefined,
    anchorElem: HTMLElement,
    givenOptions: {controlOpacity?: boolean; verticalGap?: number} = {}
) {
    const options = Object.assign({
        verticalGap: VERTICAL_GAP,
        controlOpacity: false
    }, givenOptions);

    const scrollerElem = anchorElem.parentElement;

    if (!targetRect || !scrollerElem || !floatingElem) {
        return;
    }

    // Never wider than the window: a toolbar of many buttons wraps onto more rows (the menu is a
    // wrapping flex row) instead of running off the edge of a narrow screen.
    const viewportWidth = document.documentElement.clientWidth;
    floatingElem.style.maxWidth = `${Math.max(viewportWidth - 2 * VIEWPORT_MARGIN, 0)}px`;

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    // Above the selection when it fits (the whole toolbar, every row), else below it, else
    // whichever side has more room, and in every case inside the window.
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const gap = options.verticalGap;
    const height = floatingElemRect.height;
    const above = targetRect.top - height - gap;
    const below = targetRect.bottom + gap;
    let top = above;
    if (above < VIEWPORT_MARGIN) {
        const roomAbove = targetRect.top - VIEWPORT_MARGIN;
        const roomBelow = viewportHeight - VIEWPORT_MARGIN - targetRect.bottom;
        top = below + height <= viewportHeight - VIEWPORT_MARGIN || roomBelow >= roomAbove ? below : above;
    }
    top = Math.min(top, viewportHeight - VIEWPORT_MARGIN - height);
    top = Math.max(top, 0);
    let left = targetRect.left + targetRect.width / 2 - floatingElemRect.width / 2;

    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left;
    }

    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width;
    }

    // and inside the window, whatever the editor's own box allows
    left = Math.min(left, viewportWidth - VIEWPORT_MARGIN - floatingElemRect.width);
    left = Math.max(left, VIEWPORT_MARGIN);

    if (options.controlOpacity) {
        floatingElem.style.opacity = '1';
    }
    floatingElem.style.top = `${top}px`;
    floatingElem.style.left = `${left}px`;
}
