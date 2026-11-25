import DividerCardIcon from '../assets/icons/kg-card-type-divider.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {HorizontalRuleNode as BaseHorizontalRuleNode} from '#kg-default-nodes';
import {HorizontalRuleCard} from '../components/ui/cards/HorizontalRuleCard';
import {createCommand} from 'lexical';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();
export const INSERT_DIVIDER_LINE_COMMAND = createCommand();

export class HorizontalRuleNode extends BaseHorizontalRuleNode {
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

    // Two entries: the section break (three dots) first, then the plain line. The first takes the
    // host's `strings.cards.divider`, the second its `strings.dividerLine`.
    static kgMenu = [
        {
            label: 'Section break',
            desc: 'Insert a section break',
            Icon: DividerCardIcon,
            insertCommand: INSERT_HORIZONTAL_RULE_COMMAND,
            matches: ['section-break', 'break', 'divider', 'horizontal-rule', 'hr'],
            priority: 2,
            shortcut: '/hr'
        },
        {
            label: 'Divider line',
            desc: 'Insert a plain dividing line',
            Icon: DividerCardIcon,
            insertCommand: INSERT_DIVIDER_LINE_COMMAND,
            matches: ['divider-line', 'line', 'rule'],
            priority: 2
        }
    ];

    getIcon() {
        return DividerCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper className="inline-block" nodeKey={this.getKey()}>
                <HorizontalRuleCard variant={this.variant} />
            </KoenigCardWrapper>
        );
    }
}

export function $createHorizontalRuleNode(variant = 'dots') {
    return new HorizontalRuleNode({variant});
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
