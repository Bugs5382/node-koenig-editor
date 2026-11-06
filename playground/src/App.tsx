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
import { ConfirmDialog, Toast } from "./dialogs";
import { EditorErrorBoundary } from "./EditorErrorBoundary";
import { GuidePage } from "./GuidePage";
import { kitchenSink, tryDocument, tryNeeds } from "./kitchenSink";
import { parseRoute, type Route } from "./route";
import {
  buildSnippet,
  defaultSettings,
  parseSettings,
  serializeSettings,
  type Settings,
} from "./config";
import {
  appendCard,
  dropCards,
  emptyDocument,
  galleryNode,
  imageNode,
  isEmptyDocument,
  SAMPLES,
  seedDocument,
  type CardNode,
} from "./seed";
import { SettingsPanel } from "./SettingsPanel";
import { TopBar } from "./TopBar";
import { ThreadList } from "./ThreadList";
import { toolbarActions } from "./toolbarActions";
import { fileUploader, setSampleUploads } from "./uploader";

// Everything but the text size changes what the composer is built with, so it rebuilds.
const REBUILD: (keyof Settings)[] = [
  "cards",
  "tools",
  "toolbarActions",
  "comments",
  "readOnly",
  "dark",
];

// The enabled cards, or null when the package does not list its cards (every card is on).
const enabledCards = (settings: Settings) => (catalog.cards.length ? settings.cards : null);

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
  const settingsRef = useRef(settings);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [confirm, setConfirm] = useState<"clear" | "reset" | null>(null);
  const [toast, setToast] = useState<{ message: string; undo: () => void } | null>(null);
  const [state, setState] = useState<unknown>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [rebuilds, setRebuilds] = useState(0);
  const [initial, setInitial] = useState<string | undefined>(() =>
    seedDocument(enabledCards(settings)),
  );
  const [threadsInit, setThreadsInit] = useState<KoenigCommentThread[]>([]);
  const docRef = useRef<string | undefined>(initial); // the document as it is now
  const threadsRef = useRef<KoenigCommentThread[]>([]); // the in-memory comment store

  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.size}px`;
    document.documentElement.classList.toggle("dark", settings.dark);
  }, [settings.size, settings.dark]);

  useEffect(() => {
    setSampleUploads(settings.sampleUploads);
  }, [settings.sampleUploads]);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // The address always shows the current setup, so the page URL is the share link.
  useEffect(() => {
    const query = serializeSettings(settings, catalog);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [settings]);

  // A rebuild keeps the document and the comment threads.
  const rebuild = useCallback((doc: string | undefined) => {
    docRef.current = doc;
    setInitial(doc);
    setThreadsInit([...threadsRef.current]);
    setRebuilds((n) => n + 1);
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      const current = settingsRef.current;
      const next = { ...current, ...patch };
      settingsRef.current = next;
      setSettings(next);
      if (REBUILD.some((key) => current[key] !== next[key])) {
        const doc = docRef.current;
        rebuild(doc ? dropCards(doc, enabledCards(next)) : doc);
      }
    },
    [rebuild],
  );

  const addCard = useCallback(
    (node: CardNode) => rebuild(appendCard(docRef.current, node)),
    [rebuild],
  );

  // Replaces the document with one that shows every card. Comment anchors go with the old text, so
  // the threads are cleared too.
  const loadKitchenSink = useCallback(() => {
    threadsRef.current = [];
    rebuild(kitchenSink(catalog.cards, enabledCards(settingsRef.current)));
  }, [rebuild]);

  // A "Try it" link: switch on what the card needs, put the card in a short document, and leave a
  // plain address behind so a reload does not do it again.
  const tryId = route.page === "editor" ? route.tryId : undefined;
  useEffect(() => {
    if (!tryId) return;
    const doc = tryDocument(tryId, catalog.cards);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
    setRoute({ page: "editor" });
    if (!doc) return;
    const needs = tryNeeds(tryId, settingsRef.current, catalog);
    if (Object.keys(needs).length) update(needs);
    threadsRef.current = [];
    rebuild(doc);
  }, [tryId, update, rebuild]);

  // Clear and Reset throw work away, so they ask first when there is something to lose, and they
  // leave an Undo that puts back the document, the settings and the comment threads together.
  const snapshot = () => ({
    doc: docRef.current,
    settings: settingsRef.current,
    threads: [...threadsRef.current],
  });

  const restore = useCallback(
    (snap: ReturnType<typeof snapshot>) => {
      settingsRef.current = snap.settings;
      setSettings(snap.settings);
      threadsRef.current = snap.threads;
      setToast(null);
      rebuild(snap.doc);
    },
    [rebuild],
  );

  const requestClear = () => {
    if (!isEmptyDocument(docRef.current)) setConfirm("clear");
  };
  const requestReset = () => {
    if (!isEmptyDocument(docRef.current) || serializeSettings(settingsRef.current, catalog)) {
      setConfirm("reset");
    }
  };

  const doClear = () => {
    const snap = snapshot();
    setConfirm(null);
    threadsRef.current = [];
    rebuild(emptyDocument());
    setToast({ message: "Document cleared.", undo: () => restore(snap) });
  };

  const doReset = () => {
    const snap = snapshot();
    const defaults = defaultSettings(catalog);
    setConfirm(null);
    settingsRef.current = defaults;
    setSettings(defaults);
    threadsRef.current = [];
    rebuild(emptyDocument());
    setToast({
      message: "Reset to an empty document and the default settings.",
      undo: () => restore(snap),
    });
  };

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
    docRef.current = JSON.stringify(next);
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

  const editorStyle = {
    "--kg-rem": "0.625rem",
    ...(settings.selection ? { "--kg-selection-color": settings.selection } : {}),
    "--kg-table-edit-border-style": settings.tableBorder,
  } as React.CSSProperties;

  const cardOn = (card: string) => !catalog.cards.length || settings.cards.includes(card);

  return (
    <>
      <TopBar
        catalog={catalog}
        galleryOn={cardOn("gallery")}
        settings={settings}
        page={route.page}
        onChange={update}
        onCopyLink={() => void navigator.clipboard?.writeText(window.location.href)}
        onLoadKitchenSink={loadKitchenSink}
        onLoadSamples={() => addCard(galleryNode(SAMPLES))}
        onClear={requestClear}
        onReset={requestReset}
      />
      {confirm === "clear" && (
        <ConfirmDialog
          title="Clear the document?"
          message="The text and cards in the editor are removed. Your settings stay. You can undo this right after."
          confirmLabel="Clear"
          onCancel={() => setConfirm(null)}
          onConfirm={doClear}
        />
      )}
      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset to an empty document?"
          message="The editor is emptied and every setting goes back to its default. You can undo this right after."
          confirmLabel="Reset"
          onCancel={() => setConfirm(null)}
          onConfirm={doReset}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel="Undo"
          onAction={toast.undo}
          onDismiss={() => setToast(null)}
        />
      )}
      {route.page === "guide" && <GuidePage anchor={route.anchor} />}
      <EditorErrorBoundary key={rebuilds}>
        <KoenigComposer
          cards={catalog.cards.length ? (settings.cards as KoenigCardName[]) : undefined}
          comments={settings.comments ? comments : undefined}
          darkMode={settings.dark}
          editable={!settings.readOnly}
          fileUploader={fileUploader}
          initialEditorState={initial}
          toolbarActions={settings.toolbarActions ? toolbarActions : undefined}
          {...optionalProps}
        >
          <div className="page" hidden={route.page === "guide"}>
            <main>
              <div className="editor-box" style={editorStyle}>
                <KoenigEditor readOnly={settings.readOnly} onChange={onChange} />
              </div>
              {catalog.wordCount && settings.wordCount && <WordCount />}
            </main>
            <aside>
              <section className="card">
                <h2>Options</h2>
                <SettingsPanel catalog={catalog} settings={settings} onChange={update} />
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
                <h2>Sample images</h2>
                <p className="muted">
                  Ten pictures drawn by the demo. Click one to add it as an image card.
                </p>
                <div className="samples">
                  {SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      disabled={!cardOn("image")}
                      title={`Add sample ${sample.id} (${sample.width} x ${sample.height})`}
                      onClick={() => addCard(imageNode(sample))}
                    >
                      <img src={sample.url} alt={sample.alt} loading="lazy" />
                    </button>
                  ))}
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
      </EditorErrorBoundary>
    </>
  );
}
