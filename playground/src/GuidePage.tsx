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
// The cards guide as a page of its own: contents on the side, the whole of guides/cards.md in the
// middle with an anchor and a "Try it" link per card, Print, and a way back to the editor.
import { useEffect, useMemo, useRef } from "react";
import guideMarkdown from "../../guides/cards.md?raw";
import { renderGuide } from "./guideDoc";
import { editorHref, guideHref } from "./route";

const guide = renderGuide(guideMarkdown);

export function GuidePage({ anchor }: { anchor?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const body = useMemo(() => ({ __html: guide.html }), []);

  // A section in the address scrolls into view; the bare guide starts at the top.
  useEffect(() => {
    const target = anchor ? document.getElementById(`guide-${anchor}`) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else scroller.current?.scrollTo?.(0, 0);
  }, [anchor]);

  return (
    <div className="guide" ref={scroller}>
      <nav className="guide-toc" aria-label="Contents">
        <h2>Contents</h2>
        <ol>
          {guide.toc.map((item) => (
            <li key={item.id}>
              <a
                href={guideHref(item.id)}
                aria-current={item.id === anchor ? "location" : undefined}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <main className="guide-main">
        <div className="guide-head">
          <a className="guide-back" href={editorHref}>
            Back to the editor
          </a>
          <button
            type="button"
            className="ctl-button ctl-button-quiet"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
        {/* The guide is this repo's own file, rendered with raw HTML switched off. */}
        <article className="md" dangerouslySetInnerHTML={body} />
      </main>
    </div>
  );
}
