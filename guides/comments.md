# Inline comments

Threads anchored on selected text, kept in the document, with events for your own storage.

## 💬 Inline comments

Comment on any selected text, like comments in a word processor. Pass `comments` to the composer and
the editor registers Lexical's mark node, which carries each thread's id. The anchors therefore live in
the document: they follow edits and are saved and loaded with the editor state (`serialize()`,
`onChange`, collaboration). The thread content (messages, resolved flag) stays with the host: the editor
reports every change as an event and takes the saved threads back through `threads`.

```tsx
import { KoenigComposer, KoenigEditor, useKoenigComments } from "node-koenig-editor";
import type {
  KoenigCommentEvent,
  KoenigCommentsController,
  KoenigCommentThread,
} from "node-koenig-editor";

const Threads = () => {
  const comments = useKoenigComments();
  if (!comments) return null;
  const { activeThreadId, controller, threads } = comments;
  return (
    <ul>
      {threads.map((thread) => (
        <li key={thread.id} aria-current={thread.id === activeThreadId}>
          “{thread.quote}” — {thread.messages.length} message(s)
          <button onClick={() => controller.reply(thread.id, { body: "Agreed" })}>Reply</button>
          <button onClick={() => controller.resolveThread(thread.id)}>Resolve</button>
          <button onClick={() => controller.removeThread(thread.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

// Keep the controller to call addThread from your own "Comment" button.
let commentsApi: KoenigCommentsController | null | undefined;

export const Editor = ({
  saved,
  save,
}: {
  saved: KoenigCommentThread[];
  save: (e: KoenigCommentEvent) => void;
}) => (
  <KoenigComposer comments={{ onEvent: save, threads: saved }}>
    <KoenigEditor registerAPI={(api) => (commentsApi = api.comments)} />
    <Threads />
  </KoenigComposer>
);
```

| Piece                               | What it does                                                                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comments.threads`                  | The saved threads. Replaced, without events, whenever the array's identity changes (load them asynchronously, or after a refetch).                                                                                       |
| `comments.onEvent`                  | Called with a `KoenigCommentEvent`: `thread-added`, `thread-removed`, `thread-resolved`, `thread-reopened`, `reply-added`, `thread-focused`, `anchor-lost`, `anchor-restored`. Persist from here.                        |
| `api.comments`                      | The controller from `registerAPI`; `null` when `comments` is off. `useKoenigComments()` gives the same controller with live `threads` and `activeThreadId`.                                                              |
| `addThread({ body, author?, id? })` | Anchors a thread on the current text selection and returns it, or returns `null` when nothing is selected. Keep the selection (it persists after blur) while the host asks for the text.                                 |
| `reply(id, { body, author? })`      | Appends a message and returns it, or `null` for an unknown thread.                                                                                                                                                       |
| `resolveThread(id, resolved?)`      | Resolves a thread, or reopens it with `false`. Resolved highlights are muted.                                                                                                                                            |
| `replaceThreadText(id, text)`       | Puts `text` in place of the text under the thread's highlight, keeps the highlight, sets the thread's `quote` to it and emits `thread-text-replaced`. False if the thread is unknown or its text is not in the document. |
| `removeThread(id)`                  | Removes the thread and its highlight, and leaves the text.                                                                                                                                                               |
| `focusThread(id \| null)`           | Marks a thread active and scrolls its highlight into view. Clicking a highlight does the same and emits `thread-focused`.                                                                                                |
| `isAnchored(id)`                    | Whether the highlight is still in the document. Deleting the anchored text emits `anchor-lost`; undo or a collaborator restoring it emits `anchor-restored`.                                                             |

Highlights are `<mark data-kg-comment-ids>` elements, with `data-kg-comment-resolved` and
`data-kg-comment-active` set as the state changes. Style them with `--kg-comment-highlight`,
`--kg-comment-highlight-resolved` and `--kg-comment-highlight-active`.

Read-only editors (`editable={false}` on the composer and `readOnly` on the editor) still show the
highlights and focus threads on click. The controller keeps working there too, `addThread` included, so
it is the host that decides who may comment on a locked document. Messages carry an opaque `author`
string and ISO timestamps; nothing in the package interprets them. Overlapping threads share the marked
text, and a click focuses the first unresolved one.
