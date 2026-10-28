export {GeneratedDecoratorNodeBase} from './generate-decorator-node.js';
export * from './export-dom.js';
import * as image from './nodes/image/ImageNode.js';
import * as callout from './nodes/callout/CalloutNode.js';
import * as aside from './nodes/aside/AsideNode.js';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode.js';
import * as toggle from './nodes/toggle/ToggleNode.js';

import linebreakSerializers from './serializers/linebreak.js';
import paragraphSerializers from './serializers/paragraph.js';

// re-export everything for easier importing
export * from './KoenigDecoratorNode.js';
export * from './nodes/image/ImageNode.js';
export * from './nodes/callout/CalloutNode.js';
export * from './nodes/aside/AsideNode.js';
export * from './nodes/horizontalrule/HorizontalRuleNode.js';
export * from './nodes/toggle/ToggleNode.js';

// export utility functions that are useful in other packages or tests
import * as visibilityUtils from './utils/visibility.js';
import * as taggedTemplateFns from './utils/tagged-template-fns.js';
import {generateDecoratorNode} from './generate-decorator-node.js';
import {rgbToHex} from './utils/rgb-to-hex.js';
export const utils = {
    generateDecoratorNode,
    visibility: visibilityUtils,
    rgbToHex,
    taggedTemplateFns
};

export const serializers = {
    linebreak: linebreakSerializers,
    paragraph: paragraphSerializers
};

export const DEFAULT_CONFIG = {
    html: {
        import: {
            ...serializers.linebreak.import,
            ...serializers.paragraph.import
        }
    }
};

// export convenience objects for use elsewhere
export const DEFAULT_NODES = [
    image.ImageNode,
    callout.CalloutNode,
    aside.AsideNode,
    horizontalrule.HorizontalRuleNode,
    toggle.ToggleNode
];
