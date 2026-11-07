export {GeneratedDecoratorNodeBase} from './generate-decorator-node.js';
export * from './export-dom.js';
import * as image from './nodes/image/ImageNode.js';
import * as callout from './nodes/callout/CalloutNode.js';
import * as aside from './nodes/aside/AsideNode.js';
import * as horizontalrule from './nodes/horizontalrule/HorizontalRuleNode.js';
import * as toggle from './nodes/toggle/ToggleNode.js';
import * as toggleGroup from './nodes/toggle-group/ToggleGroupNode.js';
import * as gallery from './nodes/gallery/GalleryNode.js';
import * as header from './nodes/header/HeaderNode.js';
import * as button from './nodes/button/ButtonNode.js';
import * as markdown from './nodes/markdown/MarkdownNode.js';
import * as file from './nodes/file/FileNode.js';
import * as video from './nodes/video/VideoNode.js';
import * as audio from './nodes/audio/AudioNode.js';

import linebreakSerializers from './serializers/linebreak.js';
import paragraphSerializers from './serializers/paragraph.js';

// re-export everything for easier importing
export * from './KoenigDecoratorNode.js';
export * from './nodes/image/ImageNode.js';
export * from './nodes/callout/CalloutNode.js';
export * from './nodes/aside/AsideNode.js';
export * from './nodes/horizontalrule/HorizontalRuleNode.js';
export * from './nodes/toggle/ToggleNode.js';
export * from './nodes/toggle-group/ToggleGroupNode.js';
export * from './nodes/gallery/GalleryNode.js';
export * from './nodes/header/HeaderNode.js';
export * from './nodes/button/ButtonNode.js';
export * from './nodes/markdown/MarkdownNode.js';
export {isSafeUrl, toSafeUrl} from './utils/safe-url.js';
export {renderMarkdown} from './utils/render-markdown.js';
export * from './nodes/file/FileNode.js';
export * from './nodes/video/VideoNode.js';
export * from './nodes/audio/AudioNode.js';

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
    toggle.ToggleNode,
    toggleGroup.ToggleGroupNode,
    gallery.GalleryNode,
    header.HeaderNode,
    button.ButtonNode,
    markdown.MarkdownNode,
    file.FileNode,
    video.VideoNode,
    audio.AudioNode
];
