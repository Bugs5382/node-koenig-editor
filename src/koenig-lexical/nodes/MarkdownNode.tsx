import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MarkdownCardIcon from '../assets/icons/kg-card-type-markdown.svg?react';
import {MarkdownNode as BaseMarkdownNode} from '#kg-default-nodes';
import {MarkdownNodeComponent} from './MarkdownNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_MARKDOWN_COMMAND = createCommand();

export class MarkdownNode extends BaseMarkdownNode {
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

    static kgMenu = {
        label: 'Markdown',
        desc: 'Write or paste Markdown',
        Icon: MarkdownCardIcon,
        insertCommand: INSERT_MARKDOWN_COMMAND,
        matches: ['markdown', 'md'],
        priority: 19,
        shortcut: '/md'
    };

    getIcon() {
        return MarkdownCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                wrapperStyle="wide"
            >
                <MarkdownNodeComponent
                    markdown={this.__markdown}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createMarkdownNode(dataset) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node) {
    return node instanceof MarkdownNode;
}
