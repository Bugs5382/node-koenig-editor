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
// The sticky bar: the title and the controls that change how the page looks and works, in groups.
import { useEffect, useRef } from "react";
import { Button, Listbox, Segmented, SwatchPicker, Switch } from "./controls";
import {
  applyPreset,
  presetOf,
  PRESETS,
  SELECTION_COLORS,
  SIZES,
  type Catalog,
  type PresetId,
  type Settings,
} from "./config";

interface Props {
  catalog: Catalog;
  galleryOn: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onClear: () => void;
  onCopyLink: () => void;
  onHelp: () => void;
  onLoadKitchenSink: () => void;
  onLoadSamples: () => void;
  onReset: () => void;
  settings: Settings;
}

export function TopBar({
  catalog,
  galleryOn,
  onChange,
  onClear,
  onCopyLink,
  onHelp,
  onLoadKitchenSink,
  onLoadSamples,
  onReset,
  settings,
}: Props) {
  // The split layout is as tall as the window minus the bar, and the bar wraps, so it reports its height.
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const report = () =>
      document.documentElement.style.setProperty("--bar-h", `${element.offsetHeight}px`);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const preset = catalog.cards.length ? presetOf(settings.cards, catalog) : "all";
  return (
    <header className="bar" ref={bar}>
      <h1 className="bar-title">Koenig playground</h1>
      <div className="bar-group" role="group" aria-label="Appearance">
        <Switch label="Dark" checked={settings.dark} onChange={(dark) => onChange({ dark })} />
        <Segmented
          label="Text size in pixels"
          value={settings.size}
          options={SIZES.map((size) => ({ label: String(size), value: size, title: `${size}px` }))}
          onChange={(size) => onChange({ size })}
        />
        <SwatchPicker
          label="Selection"
          emptyLabel="Default"
          colors={SELECTION_COLORS}
          value={settings.selection}
          onChange={(selection) => onChange({ selection })}
        />
      </div>
      <div className="bar-group" role="group" aria-label="Editor">
        <Switch
          label="Read only"
          checked={settings.readOnly}
          onChange={(readOnly) => onChange({ readOnly })}
        />
        {catalog.cards.length > 0 && (
          <Listbox<PresetId | "custom">
            label="Cards"
            value={preset}
            options={[
              ...PRESETS.map((p) => ({ label: p.label, value: p.id as PresetId | "custom" })),
              { label: "Custom", value: "custom", disabled: true },
            ]}
            onChange={(id) => {
              if (id !== "custom") onChange({ cards: applyPreset(id, catalog) });
            }}
          />
        )}
      </div>
      <div className="bar-group bar-actions" role="group" aria-label="Actions">
        <Button
          variant="primary"
          disabled={!galleryOn}
          title={galleryOn ? undefined : "The gallery card is switched off"}
          onClick={onLoadSamples}
        >
          Load sample images
        </Button>
        <Button
          title="Replace the document with one that shows every card"
          onClick={onLoadKitchenSink}
        >
          Load the kitchen sink
        </Button>
        <Button onClick={onCopyLink}>Copy link</Button>
        <Button title="Empty the document, keep the settings" onClick={onClear}>
          Clear
        </Button>
        <Button title="Empty document and default settings" onClick={onReset}>
          Reset
        </Button>
        <Button onClick={onHelp}>Help</Button>
      </div>
    </header>
  );
}
