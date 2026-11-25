import EmbedCardIcon from '../assets/icons/kg-card-type-embed.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {EmbedNode as BaseEmbedNode} from '#kg-default-nodes';
import {EmbedNodeComponent} from './EmbedNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_EMBED_COMMAND = createCommand();

export class EmbedNode extends BaseEmbedNode {
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

    static kgMenu = [{
        label: 'Embed',
        desc: 'Link a video that loads when played',
        Icon: EmbedCardIcon,
        insertCommand: INSERT_EMBED_COMMAND,
        matches: ['embed', 'video-link', 'youtube', 'vimeo', 'twitch'],
        priority: 16,
        shortcut: '/embed'
    }];

    getIcon() {
        return EmbedCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <EmbedNodeComponent nodeKey={this.getKey()} title={this.title} url={this.url} />
            </KoenigCardWrapper>
        );
    }
}

export const $createEmbedNode = (dataset) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node) {
    return node instanceof EmbedNode;
}
