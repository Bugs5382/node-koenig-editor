import {TABLE_MENU_ITEM} from '../../additions/table/tableMenu';

export function getEditorCardNodes(editor) {
    // TODO: open upstream PR to add public method of getting nodes
    const allNodes = editor._nodes;
    const cardNodes = [];

    for (const [nodeType, {klass}] of allNodes) {
        if (!klass.kgMenu) {
            continue;
        }

        cardNodes.push([nodeType, klass]);
    }

    if (allNodes.has('table')) {
        cardNodes.push(['table', {kgMenu: TABLE_MENU_ITEM}]);
    }

    return cardNodes;
}
