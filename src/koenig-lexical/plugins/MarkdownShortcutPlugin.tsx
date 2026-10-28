import {$createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode} from '../nodes/HorizontalRuleNode';
import {
    CODE,
    HEADING,
    ORDERED_LIST,
    QUOTE,
    TEXT_FORMAT_TRANSFORMERS,
    TEXT_MATCH_TRANSFORMERS,
    UNORDERED_LIST
} from '@lexical/markdown';
import {MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';

export const HR = {
    dependencies: [HorizontalRuleNode],
    export: (node) => {
        return $isHorizontalRuleNode(node) ? '---' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _1, _2, isImport) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) {
            parentNode.replace(line);
        } else {
            parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element'
};

// custom text format transformers
export const SUBSCRIPT = {
    format: ['subscript'],
    tag: '~',
    type: 'text-format'
};

export const SUPERSCRIPT = {
    format: ['superscript'],
    tag: '^',
    type: 'text-format'
};

export const ELEMENT_TRANSFORMERS = [
    HEADING,
    QUOTE,
    UNORDERED_LIST,
    ORDERED_LIST,
    HR,
    CODE
];

export const CUSTOM_TEXT_FORMAT_TRANSFORMERS = [
    SUBSCRIPT,
    SUPERSCRIPT
];

export const DEFAULT_TRANSFORMERS = [
    ...ELEMENT_TRANSFORMERS,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export const MINIMAL_TRANSFORMERS = [
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export const BASIC_TRANSFORMERS = [
    UNORDERED_LIST,
    ORDERED_LIST,
    ...TEXT_FORMAT_TRANSFORMERS,
    ...CUSTOM_TEXT_FORMAT_TRANSFORMERS,
    ...TEXT_MATCH_TRANSFORMERS
];

export default function MarkdownShortcutPlugin({transformers = DEFAULT_TRANSFORMERS} = {}) {
    return LexicalMarkdownShortcutPlugin({transformers});
}
