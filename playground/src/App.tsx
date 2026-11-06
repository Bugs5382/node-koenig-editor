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
import {
  KoenigComposer,
  KoenigEditor,
  type KoenigCardName,
  type KoenigCommentEvent,
  type KoenigCommentThread,
} from "node-koenig-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catalog, useWordCount } from "./catalog";
import {
  buildSnippet,
  defaultSettings,
  parseSettings,
  serializeSettings,
  SIZES,
  type Settings,
} from "./config";
import { SettingsPanel } from "./SettingsPanel";
import { ThreadList } from "./ThreadList";
import { toolbarActions } from "./toolbarActions";
import { fileUploader } from "./uploader";

// Everything but the text size changes what the composer is built with, so it rebuilds.
const REBUILD: (keyof Settings)[] = [
  "cards",
  "tools",
  "toolbarActions",
  "comments",
  "readOnly",
  "dark",
];

function WordCount() {
  // Only rendered when the package has the hook, which does not change while the page is open.
  const count = useWordCount?.();
  return count ? (
    <div className="word-count">
      {count.wordsLabel} &middot; {count.readingTimeLabel}
    </div>
  ) : null;
}

export function App() {
  const [settings, setSettings] = useState(() => parseSettings(window.location.search, catalog));
  const [state, setState] = useState<unknown>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [rebuilds, setRebuilds] = useState(0);
  const [initial, setInitial] = useState<string | undefined>(undefined);
  const [threadsInit, setThreadsInit] = useState<KoenigCommentThread[]>([]);
  const stateRef = useRef<unknown>(null);
  const threadsRef = useRef<KoenigCommentThread[]>([]); // the in-memory comment store

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.size}px`;
    document.documentElement.classList.toggle("dark", settings.dark);
  }, [settings.size, settings.dark]);

  // The address always shows the current setup, so the page URL is the share link.
  useEffect(() => {
    const query = serializeSettings(settings, catalog);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [settings]);

  // A rebuild keeps the document and the comment threads.
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (REBUILD.some((key) => current[key] !== next[key])) {
        setInitial(stateRef.current ? JSON.stringify(stateRef.current) : undefined);
        setThreadsInit([...threadsRef.current]);
        setRebuilds((n) => n + 1);
      }
      return next;
    });
  }, []);

  const onEvent = useCallback((event: KoenigCommentEvent) => {
    const thread = event.thread;
    if (thread) {
      const rest = threadsRef.current.filter((t) => t.id !== thread.id);
      if (event.type === "thread-removed") threadsRef.current = rest;
      else if (event.type !== "thread-focused") threadsRef.current = [...rest, thread];
    }
    const label = `${event.type}${thread ? " " + thread.id.slice(0, 6) : ""}`;
    setEvents((all) => [label, ...all].slice(0, 30));
  }, []);
  const comments = useMemo(() => ({ onEvent, threads: threadsInit }), [onEvent, threadsInit]);

  const onChange = useCallback((next: unknown) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const json = useMemo(
    () => (state ? JSON.stringify(state, null, 2) : "(edit something)"),
    [state],
  );
  // `tools` is missing from older builds' types, so it is passed loosely and only when offered.
  const optionalProps: Record<string, unknown> = catalog.tools.length
    ? { tools: settings.tools }
    : {};
  const snippet = useMemo(() => buildSnippet(settings, catalog), [settings]);

  return (
    <>
      <header className="bar">
        <h1>Koenig playground</h1>
        <label>
          <input
            type="checkbox"
            checked={settings.dark}
            onChange={(e) => update({ dark: e.target.checked })}
          />{" "}
          Dark
        </label>
        <label>
          Text size{" "}
          <select value={settings.size} onChange={(e) => update({ size: Number(e.target.value) })}>
            {SIZES.map((s, i) => (
              <option key={s} value={s}>
                {i + 1}: {s}px
              </option>
            ))}
          </select>
        </label>
      </header>
      <KoenigComposer
        key={rebuilds}
        cards={catalog.cards.length ? (settings.cards as KoenigCardName[]) : undefined}
        comments={settings.comments ? comments : undefined}
        darkMode={settings.dark}
        editable={!settings.readOnly}
        fileUploader={fileUploader}
        initialEditorState={initial}
        toolbarActions={settings.toolbarActions ? toolbarActions : undefined}
        {...optionalProps}
      >
        <div className="page">
          <main>
            <div className="editor-box" style={{ "--kg-rem": "0.625rem" } as React.CSSProperties}>
              <KoenigEditor readOnly={settings.readOnly} onChange={onChange} />
            </div>
            {catalog.wordCount && settings.wordCount && <WordCount />}
          </main>
          <aside>
            <section className="card">
              <h2>Options</h2>
              <SettingsPanel
                catalog={catalog}
                settings={settings}
                onChange={update}
                onReset={() => update(defaultSettings(catalog))}
              />
            </section>
            <section className="card">
              <h2>Code for this setup</h2>
              <pre className="code">{snippet}</pre>
              <div className="row">
                <button onClick={() => void navigator.clipboard?.writeText(snippet)}>
                  Copy code
                </button>
              </div>
            </section>
            <section className="card">
              <h2>Comment threads</h2>
              <ThreadList events={events} />
            </section>
            <section className="card">
              <h2>Saved state</h2>
              <pre className="json">{json}</pre>
            </section>
          </aside>
        </div>
      </KoenigComposer>
    </>
  );
}
