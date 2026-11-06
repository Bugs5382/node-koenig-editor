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
// The toolbarActions example: a fake "AI" button whose card rewrites or shortens the selection.
import type { KoenigToolbarAction, KoenigToolbarSelection } from "node-koenig-editor";
import { useState } from "react";

export const shorten = (text: string): string => {
  const words = text.split(/\s+/);
  if (words.length <= 3) return text;
  return words.slice(0, Math.max(3, Math.ceil(words.length / 2))).join(" ") + "...";
};

// Pressing a button inside the card must not move focus out of the editor selection.
const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault();

function AiCard({ text, replaceSelection, close }: KoenigToolbarSelection) {
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="ai-card">
      <strong>AI (fake)</strong>
      <p>{result ?? text}</p>
      <div className="row">
        <button onMouseDown={keepSelection} onClick={() => setResult(text.toUpperCase())}>
          Rewrite
        </button>
        <button onMouseDown={keepSelection} onClick={() => setResult(shorten(text))}>
          Shorten
        </button>
        <button
          disabled={result === null}
          onMouseDown={keepSelection}
          onClick={() => {
            if (result !== null && !replaceSelection(result)) {
              alert("The text changed meanwhile, nothing was replaced.");
            }
          }}
        >
          Accept
        </button>
        <button onMouseDown={keepSelection} onClick={close}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export const toolbarActions: KoenigToolbarAction[] = [{ id: "ai", label: "AI", Card: AiCard }];
