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
// The checkboxes. Each one is an option of the composer, so the names match the code snippet.
import type { Catalog, Settings } from "./config";

interface Props {
  catalog: Catalog;
  onChange: (patch: Partial<Settings>) => void;
  settings: Settings;
}

const toggle = (list: string[], name: string, on: boolean, order: readonly string[]) =>
  order.filter((n) => (n === name ? on : list.includes(n)));

export function SettingsPanel({ catalog, onChange, settings }: Props) {
  return (
    <div className="settings">
      <fieldset>
        <legend>
          Cards <code>cards</code>
        </legend>
        <div className="checks">
          {catalog.cards.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={settings.cards.includes(name)}
                onChange={(e) =>
                  onChange({ cards: toggle(settings.cards, name, e.target.checked, catalog.cards) })
                }
              />{" "}
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      {catalog.tools.length > 0 && (
        <fieldset>
          <legend>
            Tools <code>tools</code>
          </legend>
          <div className="checks">
            {catalog.tools.map((name) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={settings.tools.includes(name)}
                  onChange={(e) =>
                    onChange({
                      tools: toggle(settings.tools, name, e.target.checked, catalog.tools),
                    })
                  }
                />{" "}
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {catalog.toolbar && catalog.toolbar.length > 0 && (
        <fieldset>
          <legend>
            Toolbar <code>toolbar</code>
          </legend>
          <div className="checks">
            {catalog.toolbar.map((name) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={settings.toolbar.includes(name)}
                  onChange={(e) =>
                    onChange({
                      toolbar: toggle(
                        settings.toolbar,
                        name,
                        e.target.checked,
                        catalog.toolbar ?? [],
                      ),
                    })
                  }
                />{" "}
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>Features</legend>
        <div className="checks">
          <label>
            <input
              type="checkbox"
              checked={settings.comments}
              onChange={(e) => onChange({ comments: e.target.checked })}
            />{" "}
            comments
          </label>
          {catalog.wordCount && (
            <label>
              <input
                type="checkbox"
                checked={settings.wordCount}
                onChange={(e) => onChange({ wordCount: e.target.checked })}
              />{" "}
              word count
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={settings.sampleUploads}
              onChange={(e) => onChange({ sampleUploads: e.target.checked })}
            />{" "}
            sample images for uploads
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.fonts}
              onChange={(e) => onChange({ fonts: e.target.checked })}
            />{" "}
            sample fonts
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.colorPicker}
              onChange={(e) => onChange({ colorPicker: e.target.checked })}
            />{" "}
            colour wheel
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.brandColors}
              onChange={(e) => onChange({ brandColors: e.target.checked })}
            />{" "}
            brand colours only
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.spellCheck}
              onChange={(e) => onChange({ spellCheck: e.target.checked })}
            />{" "}
            spell check
          </label>
          <label title="Open this page in a second window and edit the same document live">
            <input
              type="checkbox"
              checked={settings.collaboration}
              onChange={(e) => onChange({ collaboration: e.target.checked })}
            />{" "}
            live collaboration (two windows)
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.toolbarRows === 1}
              onChange={(e) => onChange({ toolbarRows: e.target.checked ? 1 : 2 })}
            />{" "}
            one-row selection toolbar
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.readOnly}
              onChange={(e) => onChange({ readOnly: e.target.checked })}
            />{" "}
            read only
          </label>
        </div>
      </fieldset>
    </div>
  );
}
