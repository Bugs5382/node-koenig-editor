# Collaboration

Connecting a Yjs provider, what is shared between windows, and custom cards.

## 🤝 Collaboration

Pass `collaboration` to edit together. The editor asks your `providerFactory` for a Yjs provider
per document: `"main"` for the document itself and one per nested editor (image captions,
callout and toggle text). The factory puts the `Y.Doc` it uses into the map it is handed and
returns an `@lexical/yjs` `Provider`. This package never opens a socket itself.

```ts
import type { Provider } from "@lexical/yjs";
import type { KoenigCollaboration } from "node-koenig-editor";
import { WebsocketProvider } from "y-websocket";
import { Doc } from "yjs";

export const collaboration: KoenigCollaboration = {
  cursorColor: "#2563eb",
  providerFactory: (id, documents) => {
    const document = new Doc();
    documents.set(id, document);
    return new WebsocketProvider("wss://collab.example.test", `doc-42/${id}`, document, {
      connect: false,
    }) as unknown as Provider;
  },
  username: "Ada",
};
```

- `getNestedXmlText(document, id)` keeps a nested editor's content inside the main document
  (a named top-level `XmlText`) when your transport carries one document per room.
- `shouldBootstrap` (default `true`) seeds an empty room from `initialEditorState`.
- Every property of every built-in card is shared between the windows of a session, and each
  card's nested text (captions, the header title and subtitle, callout text, toggle headings and
  content, toggle group items) is a shared document of its own, found by the id Lexical hands your
  `providerFactory`. Create the `Doc` for an id you have not seen, as the example above does.

### Custom cards

A card you add through `customNodes` is shared like any other node: all its properties go into the
shared document. Collaboration for it is yours to provide, and one thing needs declaring. A property
that Yjs cannot store (an editor's saved `EditorState`, a DOM node, a function, anything circular)
stays in the window that made it. List it on the class:

```ts
class PollNode extends DecoratorNode<ReactNode> {
  // kept in this window only; every other property is shared
  static collabLocalProperties = ["__draftEditorState"];
}
```

The package's own cards use the same list. `collaboration.excludedProperties` adds to it from the
host side, for a node class you cannot edit.

If the card holds a nested editor, keep it as a property of its own on the node (`__captionEditor`),
never inside an array or an object. Lexical gives each such editor a shared document, with the same
id in every window, and calls your `providerFactory` for it. List the editor's saved `EditorState`
in `collabLocalProperties` too. An editor that sits inside an array or an object cannot be found by
the other windows, and its editors reach the shared document as an object that cannot be encoded,
which stops sync for the whole document.
