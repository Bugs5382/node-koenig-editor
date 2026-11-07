import ButtonCardIcon from '../assets/icons/kg-card-type-button.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ButtonNode as BaseButtonNode} from '#kg-default-nodes';
import {ButtonNodeComponent} from './ButtonNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_BUTTON_COMMAND = createCommand();

export class ButtonNode extends BaseButtonNode {
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
        label: 'Button',
        desc: 'Add a call-to-action link',
        Icon: ButtonCardIcon,
        insertCommand: INSERT_BUTTON_COMMAND,
        matches: ['button', 'cta', 'link'],
        priority: 3,
        shortcut: '/button'
    };

    getIcon() {
        return ButtonCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                wrapperStyle="wide"
            >
                <ButtonNodeComponent
                    alignment={this.alignment}
                    backgroundColor={this.backgroundColor}
                    buttonEmoji={this.buttonEmoji}
                    textColor={this.textColor}
                    buttonText={this.buttonText}
                    buttonUrl={this.buttonUrl}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createButtonNode(dataset) {
    return new ButtonNode(dataset);
}

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
