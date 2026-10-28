import React from 'react';
import {$convertFromMarkdownString} from '@lexical/markdown';
import {$createParagraphNode, $getSelection, $insertNodes, $isRangeSelection, COMMAND_PRIORITY_LOW, createCommand} from 'lexical';
import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {DEFAULT_TRANSFORMERS} from './MarkdownShortcutPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
export const PASTE_MARKDOWN_COMMAND = createCommand('PASTE_MARKDOWN_COMMAND');
export const MIME_TEXT_PLAIN = 'text/plain';
export const MIME_TEXT_HTML = 'text/html';

// Upstream renders pasted Markdown to HTML with its own Markdown renderer and pastes that.
// This build converts it with @lexical/markdown instead, into the editor's own nodes, so no
// second Markdown parser ships. Shift+paste still pastes the raw text.
export const MarkdownPastePlugin = () => {
    const [editor] = useLexicalComposerContext();
    const [isShiftDown, setShiftDown] = React.useState(false);

    React.useEffect(() => {
        const handleKeyUp = (e) => {
            if (e.key === 'Shift') {
                setShiftDown(false);
            }
        };
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [setShiftDown]);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Shift') {
                setShiftDown(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setShiftDown]);

    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                PASTE_MARKDOWN_COMMAND,
                ({text}) => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) {
                        return false;
                    }
                    if (isShiftDown) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.setData(MIME_TEXT_PLAIN, text);
                        $insertDataTransferForRichText(dataTransfer, selection, editor);
                        return true;
                    }
                    const transformers = DEFAULT_TRANSFORMERS.filter(transformer => !('dependencies' in transformer) || editor.hasNodes(transformer.dependencies));
                    const holder = $createParagraphNode();
                    $convertFromMarkdownString(text, transformers, holder);
                    const nodes = holder.getChildren();
                    holder.remove();
                    if (nodes.length === 0) {
                        return true;
                    }
                    $insertNodes(nodes);
                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor, isShiftDown]);

    return null;
};

export default MarkdownPastePlugin;
