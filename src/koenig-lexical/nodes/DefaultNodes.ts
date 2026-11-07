import {AsideNode} from './AsideNode';
import {AudioNode} from './AudioNode';
import {FileNode} from './FileNode';
import {VideoNode} from './VideoNode';
import {CalloutNode} from './CalloutNode';
import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ButtonNode} from './ButtonNode';
import {GalleryNode} from './GalleryNode';
import {HeaderNode} from './HeaderNode';
import {MarkdownNode} from './MarkdownNode';
import {HorizontalRuleNode} from './HorizontalRuleNode';
import {ImageNode} from './ImageNode';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
import {ToggleGroupNode} from './ToggleGroupNode';
import {ToggleNode} from './ToggleNode';

// Stock Lexical nodes keep their stock type names (`text`, `heading`, `quote`, `code`, `table`
// and so on) so documents stay readable by any plain Lexical consumer.
const DEFAULT_NODES = [
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    LinkNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableRowNode,
    TableCellNode,
    AsideNode,
    HorizontalRuleNode,
    ImageNode,
    CalloutNode,
    ToggleNode,
    ToggleGroupNode,
    GalleryNode,
    HeaderNode,
    ButtonNode,
    MarkdownNode,
    FileNode,
    VideoNode,
    AudioNode
];

export default DEFAULT_NODES;
