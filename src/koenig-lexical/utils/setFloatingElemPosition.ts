const VERTICAL_GAP = 10;
const VIEWPORT_MARGIN = 8;

export function setFloatingElemPosition(
    targetRect,
    floatingElem,
    anchorElem,
    options = {}
) {
    options = Object.assign({
        verticalGap: VERTICAL_GAP,
        controlOpacity: false
    }, options);

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

    let top = targetRect.top - floatingElemRect.height - options.verticalGap;
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
