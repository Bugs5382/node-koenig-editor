import HeaderCardIcon from '../assets/icons/kg-card-type-header.svg?react';
import HeaderNodeComponent from './HeaderNodeComponent';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import {$canShowPlaceholderCurry} from '@lexical/text';
import {$generateHtmlFromNodes} from '@lexical/html';
import {HeaderNode as BaseHeaderNode} from '#kg-default-nodes';
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../utils/nested-editors';

export const INSERT_HEADER_COMMAND = createCommand();

// The header is a section opener. It is not a heading node, so the H1 to H5 limit and a host's
// outline numbering never see it. Version 1 documents still load and export; the card edits
// them with the version 2 controls.
export class HeaderNode extends BaseHeaderNode {
    // Lexical expects every registered class to declare these itself; the base class's
    // versions already build `this`, so they only need passing through.
    static getType() {
        return super.getType();
    }

    static clone(node) {
        return super.clone(node);
    }

    static importJSON(serializedNode) {
        return super.importJSON(serializedNode);
    }

    __headerTextEditor;
    __subheaderTextEditor;
    __headerTextEditorInitialState;
    __subheaderTextEditorInitialState;

    static kgMenu = [{
        label: 'Header',
        desc: 'Add a header',
        Icon: HeaderCardIcon,
        insertCommand: INSERT_HEADER_COMMAND,
        matches: ['header', 'heading', 'hero'],
        priority: 11,
        insertParams: () => ({
            version: 2
        }),
        shortcut: '/header'
    }];

    getIcon() {
        return HeaderCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        setupNestedEditor(this, '__headerTextEditor', {editor: dataset.headerTextEditor, nodes: MINIMAL_NODES});
        setupNestedEditor(this, '__subheaderTextEditor', {editor: dataset.subheaderTextEditor, nodes: MINIMAL_NODES});

        // populate nested editors on initial construction
        if (!dataset.headerTextEditor && dataset.header) {
            populateNestedEditor(this, '__headerTextEditor', `${dataset.header}`); // we serialize with no wrapper
        }
        if (!dataset.subheaderTextEditor && dataset.subheader) {
            populateNestedEditor(this, '__subheaderTextEditor', `${dataset.subheader}`);
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__headerTextEditor) {
            this.__headerTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__headerTextEditor, null);
                json.header = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
            });
        }

        if (this.__subheaderTextEditor) {
            this.__subheaderTextEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__subheaderTextEditor, null);
                json.subheader = cleanBasicHtml(html, {firstChildInnerContent: true, allowBr: true});
            });
        }

        return json;
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.headerTextEditor = self.__headerTextEditor;
        dataset.subheaderTextEditor = self.__subheaderTextEditor;
        return dataset;
    }

    getCardWidth() {
        const layout = this.layout;
        return layout === 'split' ? 'full' : layout;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.getCardWidth()}>
                <HeaderNodeComponent
                    alignment={this.alignment}
                    backgroundColor={this.backgroundColor}
                    backgroundImageSrc={this.backgroundImageSrc}
                    buttonColor={this.buttonColor}
                    buttonEnabled={this.buttonEnabled}
                    buttonEmoji={this.buttonEmoji}
                    buttonText={this.buttonText}
                    buttonTextColor={this.buttonTextColor}
                    buttonUrl={this.buttonUrl}
                    headerTextEditor={this.__headerTextEditor}
                    headerTextEditorInitialState={this.__headerTextEditorInitialState}
                    layout={this.layout}
                    nodeKey={this.getKey()}
                    subheaderTextEditor={this.__subheaderTextEditor}
                    subheaderTextEditorInitialState={this.__subheaderTextEditorInitialState}
                    textColor={this.textColor}
                />
            </KoenigCardWrapper>
        );
    }

    // override the default `isEmpty` check because we need to check the nested editors
    // rather than the data properties themselves
    isEmpty() {
        const isHtmlEmpty = this.__headerTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        const isSubHtmlEmpty = this.__subheaderTextEditor.getEditorState().read($canShowPlaceholderCurry(false));
        return isHtmlEmpty && isSubHtmlEmpty && (!this.buttonEnabled || (!this.buttonText && !this.buttonEmoji && !this.buttonUrl)) && !this.backgroundImageSrc;
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
