import ToggleCardIcon from '../assets/icons/kg-card-type-toggle.svg?react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {BASIC_NODES, KoenigCardWrapper, MINIMAL_NODES} from '../index.js';
import {ToggleGroupNode as BaseToggleGroupNode, renderToggleGroupNode} from '#kg-default-nodes';
import {ToggleGroupNodeComponent} from './ToggleGroupNodeComponent';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {itemsMatch} from '../utils/toggleGroupItems';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_TOGGLE_GROUP_COMMAND = createCommand();

// A new group starts with two items; a person adds more (there is no limit).
const NEW_GROUP_ITEMS = 2;

// An item's id is what the other windows of a shared session find its editors by: each editor's
// key is the id of its shared document, so it has to be the same in every window.
const newItemId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

const buildItem = ({heading = '', content = '', id = newItemId()} = {}) => {
    const item = {id};
    setupNestedEditor(item, 'headingEditor', {nodes: MINIMAL_NODES});
    setupNestedEditor(item, 'contentEditor', {nodes: BASIC_NODES});
    populateNestedEditor(item, 'headingEditor', heading);
    populateNestedEditor(item, 'contentEditor', content);
    item.headingEditor._key = `${id}:heading`;
    item.contentEditor._key = `${id}:content`;
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
    // properties a shared session keeps in this window (see KoenigCollaboration)
    static collabLocalProperties = ['__itemEditors'];

    static getType() {
        return super.getType();
    }

    static clone(node) {
        return super.clone(node);
    }

    static importJSON(serializedNode) {
        return super.importJSON(serializedNode);
    }

    // one entry per item: {id, headingEditor, headingEditorInitialState, contentEditor, contentEditorInitialState}.
    // The editors stay in this window; `__itemIds` is what a shared session carries, and the
    // transform below builds the editors for any id this window does not have yet.
    __itemEditors;
    __itemIds;

    // Brings the editors in line with `__itemIds`. A shared session writes the ids from another
    // window, and Lexical applies those updates without running node transforms, so the card
    // calls this from an effect when it sees the two disagree.
    syncItems() {
        const wanted = this.getLatest().__itemIds;
        const have = this.getLatest().__itemEditors;
        if (!Array.isArray(wanted) || wanted.length === 0 || itemsMatch(wanted, have)) {
            return;
        }
        const byId = new Map(have.map(item => [item.id, item]));
        this.getWritable().__itemEditors = wanted.map(id => byId.get(id) ?? buildItem({id}));
    }

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
        this.__itemIds = dataset.itemIds ?? this.__itemEditors.map(item => item.id);
    }

    getDataset() {
        const dataset = super.getDataset();
        dataset.itemEditors = this.getLatest().__itemEditors;
        dataset.itemIds = this.getLatest().__itemIds;
        return dataset;
    }

    getItemEditors() {
        return this.getLatest().__itemEditors;
    }

    addItem() {
        const writable = this.getWritable();
        writable.__itemEditors = [...writable.__itemEditors, buildItem()];
        writable.__itemIds = writable.__itemEditors.map(item => item.id);
    }

    removeItem(index) {
        const writable = this.getWritable();
        if (writable.__itemEditors.length <= 1) {
            return;
        }
        writable.__itemEditors = writable.__itemEditors.filter((_, position) => position !== index);
        writable.__itemIds = writable.__itemEditors.map(item => item.id);
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
                    itemIds={this.__itemIds}
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
