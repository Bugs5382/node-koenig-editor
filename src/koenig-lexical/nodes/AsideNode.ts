import {
    $createParagraphNode
} from 'lexical';
import {AsideNode as BaseAsideNode} from '#kg-default-nodes';
import {
    addClassNamesToElement
} from '@lexical/utils';

export class AsideNode extends BaseAsideNode {
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

    createDOM(config) {
        const element = document.createElement('aside');
        addClassNamesToElement(element, config.theme.aside);
        return element;
    }

    // Mutation

    insertNewAfter() {
        const newBlock = $createParagraphNode();
        const direction = this.getDirection();
        newBlock.setDirection(direction);
        this.insertAfter(newBlock);
        return newBlock;
    }

    collapseAtStart() {
        const paragraph = $createParagraphNode();
        const children = this.getChildren();
        children.forEach(child => paragraph.append(child));
        this.replace(paragraph);
        return true;
    }
}

export function $createAsideNode() {
    return new AsideNode();
}

export function $isAsideNode(node) {
    return node instanceof AsideNode;
}
