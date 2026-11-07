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
import { act, fireEvent, waitFor } from "@testing-library/react";
import {
  $createParagraphNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import type { KoenigCommentEvent, KoenigCommentThread } from "node-koenig-editor";
import { describe, expect, it } from "vitest";
import { useKoenigComments } from "node-koenig-editor";
import { documentOf, mount, typeAtEnd } from "./__utils__/mount";

const marks = () => [...document.querySelectorAll("mark[data-kg-comment-ids]")];

const selectWord = (api: Awaited<ReturnType<typeof mount>>["api"], start: number, end: number) =>
  act(async () => {
    api.editorInstance.update(() => {
      const paragraph = $getRoot().getFirstChild();
      if ($isElementNode(paragraph)) {
        const text = paragraph.getFirstChild();
        if ($isTextNode(text)) {
          text.select(start, end);
        }
      }
    });
  });

const withComments = (events: KoenigCommentEvent[] = [], threads?: KoenigCommentThread[]) => ({
  composer: {
    comments: { onEvent: (event: KoenigCommentEvent) => events.push(event), threads },
    initialEditorState: documentOf("The quick brown fox"),
  },
});

const textOf = (node: LexicalNode): string => node.getTextContent();

describe("inline comments", () => {
  it("is absent unless the composer is given comments", async () => {
    const { api } = await mount({ composer: { initialEditorState: documentOf("Plain") } });
    expect(api.comments).toBeNull();
  });

  it("anchors a new thread on the selected range and reports it", async () => {
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount(withComments(events));
    await selectWord(api, 4, 9);

    let thread: KoenigCommentThread | null = null;
    await act(async () => {
      thread = api.comments!.addThread({ author: "ann", body: "Why quick?" });
    });

    expect(thread).not.toBeNull();
    expect(thread!.quote).toBe("quick");
    expect(thread!.resolved).toBe(false);
    expect(thread!.messages).toHaveLength(1);
    expect(thread!.messages[0]).toMatchObject({ author: "ann", body: "Why quick?" });
    await waitFor(() => expect(marks()).toHaveLength(1));
    expect(marks()[0]!.textContent).toBe("quick");
    expect(marks()[0]!.getAttribute("data-kg-comment-ids")).toBe(thread!.id);
    expect(events.map((event) => event.type)).toEqual(["thread-added"]);
    expect(api.comments!.getThreads()).toHaveLength(1);
  });

  it("refuses a thread when nothing is selected", async () => {
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount(withComments(events));
    await selectWord(api, 4, 4);
    expect(api.comments!.addThread({ body: "x" })).toBeNull();
    expect(events).toEqual([]);
    expect(marks()).toHaveLength(0);
  });

  it("keeps the anchor through edits and a serialise and reload", async () => {
    const { api } = await mount(withComments());
    await selectWord(api, 4, 9);
    let thread: KoenigCommentThread | null = null;
    await act(async () => {
      thread = api.comments!.addThread({ body: "check" });
    });
    // Edit after the anchor, then serialise.
    await typeAtEnd(api, "!");
    const saved = api.serialize();
    expect(saved).toContain('"type":"mark"');
    expect(saved).toContain(thread!.id);

    document.body.innerHTML = "";
    const reloaded = await mount({
      composer: {
        comments: { threads: [thread!] },
        initialEditorState: saved,
      },
    });
    await waitFor(() => expect(marks()).toHaveLength(1));
    expect(marks()[0]!.textContent).toBe("quick");
    expect(reloaded.api.comments!.getThread(thread!.id)?.messages).toHaveLength(1);
  });

  it("replies, resolves, reopens and removes a thread", async () => {
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount(withComments(events));
    await selectWord(api, 4, 9);
    let id = "";
    await act(async () => {
      id = api.comments!.addThread({ body: "first" })!.id;
    });

    await act(async () => {
      expect(api.comments!.reply(id, { author: "bo", body: "second" })?.body).toBe("second");
    });
    expect(api.comments!.getThread(id)!.messages.map((m) => m.body)).toEqual(["first", "second"]);

    await act(async () => {
      api.comments!.resolveThread(id);
    });
    expect(api.comments!.getThread(id)!.resolved).toBe(true);
    await waitFor(() => expect(marks()[0]!.hasAttribute("data-kg-comment-resolved")).toBe(true));

    await act(async () => {
      api.comments!.resolveThread(id, false);
    });
    expect(api.comments!.getThread(id)!.resolved).toBe(false);
    await waitFor(() => expect(marks()[0]!.hasAttribute("data-kg-comment-resolved")).toBe(false));

    await act(async () => {
      api.comments!.removeThread(id);
    });
    expect(api.comments!.getThread(id)).toBeUndefined();
    await waitFor(() => expect(marks()).toHaveLength(0));
    api.editorInstance.getEditorState().read(() => {
      expect(textOf($getRoot())).toBe("The quick brown fox");
    });
    expect(events.map((event) => event.type)).toEqual([
      "thread-added",
      "reply-added",
      "thread-resolved",
      "thread-reopened",
      "thread-removed",
    ]);
    expect(api.comments!.reply("missing", { body: "x" })).toBeNull();
  });

  it("focuses a thread when its highlight is clicked", async () => {
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount(withComments(events));
    await selectWord(api, 4, 9);
    let id = "";
    await act(async () => {
      id = api.comments!.addThread({ body: "look" })!.id;
    });
    await waitFor(() => expect(marks()).toHaveLength(1));

    fireEvent.click(marks()[0]!);

    await waitFor(() => expect(api.comments!.getActiveThreadId()).toBe(id));
    expect(marks()[0]!.hasAttribute("data-kg-comment-active")).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: "thread-focused" });

    await act(async () => {
      api.comments!.focusThread(null);
    });
    expect(marks()[0]!.hasAttribute("data-kg-comment-active")).toBe(false);
  });

  it("still shows and focuses highlights in read-only mode", async () => {
    const thread: KoenigCommentThread = {
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "t1",
      messages: [{ body: "note", createdAt: "2026-01-01T00:00:00.000Z", id: "m1" }],
      quote: "quick",
      resolved: false,
    };
    const state = JSON.stringify({
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: "The ",
                type: "text",
                version: 1,
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "quick",
                    type: "text",
                    version: 1,
                  },
                ],
                direction: null,
                format: "",
                ids: ["t1"],
                indent: 0,
                type: "mark",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    });
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount({
      composer: {
        comments: { onEvent: (e: KoenigCommentEvent) => events.push(e), threads: [thread] },
        editable: false,
        initialEditorState: state,
      },
      editor: { readOnly: true },
    });
    await waitFor(() => expect(marks()).toHaveLength(1));
    fireEvent.click(marks()[0]!);
    await waitFor(() => expect(api.comments!.getActiveThreadId()).toBe("t1"));
  });

  it("reports a lost anchor when the text is deleted, and drops nothing else", async () => {
    const events: KoenigCommentEvent[] = [];
    const { api } = await mount(withComments(events));
    await selectWord(api, 4, 9);
    let id = "";
    await act(async () => {
      id = api.comments!.addThread({ body: "gone soon" })!.id;
    });
    await waitFor(() => expect(api.comments!.isAnchored(id)).toBe(true));

    await act(async () => {
      api.editorInstance.update(() => {
        $getRoot().clear().append($createParagraphNode());
      });
    });

    await waitFor(() => expect(events.map((event) => event.type)).toContain("anchor-lost"));
    expect(api.comments!.isAnchored(id)).toBe(false);
    expect(api.comments!.getThread(id)).toBeDefined();
  });

  it("gives a host component the live threads through the hook", async () => {
    const Panel = () => {
      const state = useKoenigComments();
      return <output data-testid="count">{state?.threads.length ?? "off"}</output>;
    };
    const { api, view } = await mount({ ...withComments(), extra: <Panel /> });
    expect(view.getByTestId("count").textContent).toBe("0");
    await selectWord(api, 4, 9);
    await act(async () => {
      api.comments!.addThread({ body: "hi" });
    });
    expect(view.getByTestId("count").textContent).toBe("1");
  });
});
