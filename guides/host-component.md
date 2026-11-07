# A complete host component

One component that turns on every option, to copy from.

## 🧱 A complete host component

A generic wrapper that picks three cards, adds one custom node with its own menu entry, sets the
wording and the theme tokens, and wires collaboration when the host passes it in:

```tsx
import "node-koenig-editor/styles.css";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  DecoratorNode,
  type NodeKey,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";
import {
  type CardMenuItem,
  type FileUploader,
  type KoenigCollaboration,
  KoenigComposer,
  KoenigEditor,
  type KoenigStringsInput,
} from "node-koenig-editor";
import { type CSSProperties, type JSX, useEffect, useMemo, useRef } from "react";

const INSERT_NOTE_COMMAND = createCommand<unknown>("INSERT_NOTE_COMMAND");

/** The host's own card: a note block with a "+" and slash menu entry. */
class NoteNode extends DecoratorNode<JSX.Element> {
  static kgMenu: CardMenuItem = {
    desc: "A highlighted note",
    insertCommand: INSERT_NOTE_COMMAND,
    label: "Note",
    matches: ["note"],
  };

  static override getType(): string {
    return "note";
  }

  static override clone(node: NoteNode): NoteNode {
    return new NoteNode(node.__key);
  }

  static override importJSON(): NoteNode {
    return new NoteNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  override createDOM(): HTMLElement {
    return document.createElement("div");
  }

  override updateDOM(): false {
    return false;
  }

  override exportJSON(): SerializedLexicalNode {
    return { type: "note", version: 1 };
  }

  override decorate(): JSX.Element {
    return <aside className="my-note">Note</aside>;
  }
}

/** Handles the menu entry's command. */
function NotePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        INSERT_NOTE_COMMAND,
        () => {
          $insertNodes([new NoteNode()]);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );
  return null;
}

const STRINGS: KoenigStringsInput = {
  cards: { image: { desc: "Upload a picture", label: "Picture" } },
  placeholder: "Start your note...",
  toolbar: { italic: "Italic" },
};

// The box is also the positioning context remote carets are drawn against.
const THEME = {
  "--kg-accent-color": "#2563eb",
  "--kg-color-grey-900": "#1f2937",
  "--kg-font-serif": "Georgia, serif",
  position: "relative",
} as CSSProperties;

export interface MyEditorProps {
  collaboration?: KoenigCollaboration | null;
  initialState?: string;
  onChange?: (state: SerializedEditorState) => void;
  uploader: FileUploader;
}

export function MyEditor({
  collaboration = null,
  initialState,
  onChange,
  uploader,
}: MyEditorProps) {
  const cursors = useRef<HTMLDivElement | null>(null);
  const collab = useMemo(
    () => (collaboration ? { ...collaboration, cursorsContainerRef: cursors } : null),
    [collaboration],
  );
  return (
    <div ref={cursors} style={THEME}>
      <KoenigComposer
        cards={["image", "divider", "callout"]}
        collaboration={collab}
        customNodes={[NoteNode]}
        fileUploader={uploader}
        initialEditorState={initialState}
        strings={STRINGS}
        toolbar={["bold", "italic", "heading2", "link"]}
      >
        <KoenigEditor onChange={onChange} />
        <NotePlugin />
      </KoenigComposer>
    </div>
  );
}
```
