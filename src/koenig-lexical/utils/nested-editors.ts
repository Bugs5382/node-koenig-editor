import generateEditorState from './generateEditorState';
import {MINIMAL_NODES} from '../index.js';
import {$getEditor, createEditor} from 'lexical';

const BLANK_EDITOR_STATE = JSON.stringify({
    root: {
        children: [
            {
                children: [],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1
            }
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

// The namespace of the editor this node is being created in, so the nested editor starts with the
// parent's (as Lexical would otherwise copy it, and warn). Outside an active editor there is none.
function parentNamespace(): string | undefined {
    try {
        return $getEditor()._config.namespace;
    } catch {
        return undefined;
    }
}

export function setupNestedEditor(node, editorProperty, {editor, initialEditorState = BLANK_EDITOR_STATE, nodes = MINIMAL_NODES} = {}) {
    if (editor) {
        node[editorProperty] = editor;
    } else {
        node[editorProperty] = createEditor({namespace: parentNamespace(), nodes});

        // set up a blank document with a paragraph otherwise the editor won't receive focus
        const editorState = node[editorProperty].parseEditorState(initialEditorState);
        node[editorProperty].setEditorState(editorState, {tag: 'history-merge'}); // use history merge to prevent undo clearing the initial state
    }
}

export function populateNestedEditor(node, editorProperty, html) {
    if (!html) {
        return;
    }

    const nestedEditor = node[editorProperty];
    const editorState = generateEditorState({
        editor: nestedEditor,
        initialHtml: html
    });
    
    nestedEditor.setEditorState(editorState, {tag: 'history-merge'}); // use history merge to prevent undo clearing the initial state

    // store the initial state separately as it's passed in to `<CollaborationPlugin />`
    // for use when there is no YJS document already stored
    node[`${editorProperty}InitialState`] = editorState;
}
