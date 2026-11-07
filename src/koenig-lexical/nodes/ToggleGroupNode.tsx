import ToggleCardIcon from '../assets/icons/kg-card-type-toggle.svg?react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ToggleGroupNode as BaseToggleGroupNode, renderToggleGroupNode} from '#kg-default-nodes';
import {ToggleGroupNodeComponent} from './ToggleGroupNodeComponent';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_TOGGLE_GROUP_COMMAND = createCommand();

// A new group starts with two items; a person adds more (there is no limit).
const NEW_GROUP_ITEMS = 2;

const buildItem = ({heading = '', content = ''} = {}) => {
    const item = {};
    setupNestedEditor(item, 'headingEditor', {nodes: MINIMAL_NODES});
    setupNestedEditor(item, 'contentEditor', {nodes: BASIC_NODES});
    populateNestedEditor(item, 'headingEditor', heading);
    populateNestedEditor(item, 'contentEditor', content);
    return item;
};

const htmlOf = (editor, options) => {
    let html = '';
    editor.getEditorState().read(() => {
        html = cleanBasicHtml($generateHtmlFromNodes(editor, null), options);
    });
    return html;
};

export class ToggleGroupNode extends BaseToggleGroupNode {
    static getType() {
        return super.getType();
    }

    static clone(node) {
        return super.clone(node);
    }

    static importJSON(serializedNode) {
        return super.importJSON(serializedNode);
    }

    // one entry per item: {headingEditor, headingEditorInitialState, contentEditor, contentEditorInitialState}
    __itemEditors;

    static kgMenu = [{
        label: 'Toggle group',
        desc: 'Add a stack of collapsible items',
        Icon: ToggleCardIcon,
        insertCommand: INSERT_TOGGLE_GROUP_COMMAND,
        matches: ['toggle group', 'accordion', 'faq', 'toggles'],
        priority: 13,
        shortcut: '/toggle-group'
    }];

    getIcon() {
        return ToggleCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        if (dataset.itemEditors) {
            this.__itemEditors = dataset.itemEditors;
        } else {
            const items = dataset.items?.length
                ? dataset.items
                : Array.from({length: NEW_GROUP_ITEMS}, () => ({}));
            this.__itemEditors = items.map(buildItem);
        }
    }

    getDataset() {
        const dataset = super.getDataset();
        dataset.itemEditors = this.getLatest().__itemEditors;
        return dataset;
    }

    getItemEditors() {
        return this.getLatest().__itemEditors;
    }

    addItem() {
        const writable = this.getWritable();
        writable.__itemEditors = [...writable.__itemEditors, buildItem()];
    }

    removeItem(index) {
        const writable = this.getWritable();
        if (writable.__itemEditors.length <= 1) {
            return;
        }
        writable.__itemEditors = writable.__itemEditors.filter((_, position) => position !== index);
    }

    // the items as HTML, read from the nested editors, which hold the text as it is now
    getItemsHtml() {
        return this.getLatest().__itemEditors.map(item => ({
            heading: htmlOf(item.headingEditor, {firstChildInnerContent: true, allowBr: true}),
            content: htmlOf(item.contentEditor, {allowBr: true})
        }));
    }

    exportJSON() {
        const json = super.exportJSON();
        json.items = this.getItemsHtml();
        return json;
    }

    // the items come from the nested editors, so the saved HTML is what is on screen
    exportDOM(editor, options = {}) {
        const render = options.nodeRenderers?.['toggle-group'] || renderToggleGroupNode;
        return render({items: this.getItemsHtml()}, options);
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <ToggleGroupNodeComponent
                    itemEditors={this.__itemEditors}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }

    isEmpty() {
        return this.getLatest().__itemEditors.every(item => !htmlOf(item.headingEditor, {}).replace(/<[^>]*>/g, '').trim()
            && !htmlOf(item.contentEditor, {}).replace(/<[^>]*>/g, '').trim());
    }
}

export const $createToggleGroupNode = (dataset) => {
    return new ToggleGroupNode(dataset);
};

export function $isToggleGroupNode(node) {
    return node instanceof ToggleGroupNode;
}
