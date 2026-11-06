/*
MIT License

Copyright (c) 2026 Shane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
// Comment threads, read from the package. The threads themselves live in memory in App.
import { useKoenigComments } from "node-koenig-editor";
import { useState } from "react";

export function ThreadList({ events }: { events: string[] }) {
  const comments = useKoenigComments();
  const [body, setBody] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  if (!comments) return <p className="muted">Comments are off.</p>;
  const { activeThreadId, controller, threads } = comments;
  const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault();

  return (
    <>
      <div className="row">
        <input
          type="text"
          placeholder="Comment text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          onMouseDown={keepSelection}
          onClick={() => {
            const thread = controller.addThread({ body: body || "Comment", author: "me" });
            if (!thread) alert("Select some text first.");
            else setBody("");
          }}
        >
          Comment on selection
        </button>
      </div>
      <ul className="threads">
        {threads.map((t) => (
          <li
            key={t.id}
            aria-current={t.id === activeThreadId}
            className={t.resolved ? "resolved" : ""}
          >
            <div>
              <b>&ldquo;{t.quote}&rdquo;</b>
              {t.resolved ? " (resolved)" : ""}
              {controller.isAnchored(t.id) ? "" : " (anchor lost)"}
            </div>
            {t.messages.map((m, i) => (
              <div key={i}>- {m.body}</div>
            ))}
            <div className="row">
              <input
                type="text"
                placeholder="Reply"
                value={replies[t.id] ?? ""}
                onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })}
              />
              <button
                onClick={() => {
                  controller.reply(t.id, { body: replies[t.id] || "Agreed", author: "me" });
                  setReplies({ ...replies, [t.id]: "" });
                }}
              >
                Reply
              </button>
              <button onClick={() => controller.focusThread(t.id)}>Focus</button>
              <button onClick={() => controller.resolveThread(t.id, !t.resolved)}>
                {t.resolved ? "Reopen" : "Resolve"}
              </button>
              <button onClick={() => controller.removeThread(t.id)}>Delete</button>
            </div>
          </li>
        ))}
        {!threads.length && <li>No threads yet. Select text, type a comment, press the button.</li>}
      </ul>
      <ol className="events" reversed>
        {events.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ol>
    </>
  );
}
