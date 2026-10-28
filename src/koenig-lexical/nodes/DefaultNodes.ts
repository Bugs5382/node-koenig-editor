import {AsideNode} from './AsideNode';
import {CalloutNode} from './CalloutNode';
import {CodeHighlightNode, CodeNode} from '@lexical/code';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {HorizontalRuleNode} from './HorizontalRuleNode';
import {ImageNode} from './ImageNode';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {TableCellNode, TableNode, TableRowNode} from '@lexical/table';
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
    ToggleNode
];

export default DEFAULT_NODES;
