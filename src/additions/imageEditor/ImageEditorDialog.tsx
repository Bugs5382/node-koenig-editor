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
import type { PointerEvent as ReactPointerEvent } from "react";
import { type FC, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { useKoenigStrings } from "../options";
import { FloatingPortal } from "../placement/FloatingPortal";
import {
  type AspectPreset,
  ASPECT_PRESETS,
  aspectOf,
  cropForAspect,
  fullCrop,
  moveRect,
  normalizeTurns,
  type Rect,
  resizeRect,
} from "./geometry";
import { drawEdited, imageBounds, loadImage, renderEditedFile } from "./render";

interface ImageEditorDialogProps {
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
}

const PREVIEW_WIDTH = 480;
const FOCUSABLE = "button:not([disabled]), select:not([disabled]), [tabindex='0']";

type Status = "loading" | "ready" | "error";

// Crop and rotate a picked image before it goes to the host's uploader. The whole job runs on
// a canvas in the browser; no request is made. Keyboard: the crop area takes the arrow keys
// (move) and Shift with the arrow keys (resize), Tab stays inside, Escape cancels.
export const ImageEditorDialog: FC<ImageEditorDialogProps> = ({ file, onApply, onCancel }) => {
  const strings = useKoenigStrings();
  const t = strings.imageEditor;
  const titleId = useId();
  const helpId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ crop: Rect; mode: "move" | "resize"; x: number; y: number } | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState(0);
  const [preset, setPreset] = useState<AspectPreset>("free");
  const [crop, setCrop] = useState<Rect>({ height: 1, width: 1, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const bounds = imageRef.current ? imageBounds(imageRef.current, turns) : { height: 1, width: 1 };
  const aspect = aspectOf(preset, bounds);

  useEffect(() => {
    let release = () => {};
    let cancelled = false;
    loadImage(file).then(
      (loaded) => {
        if (cancelled) return loaded.release();
        release = loaded.release;
        imageRef.current = loaded.image;
        setCrop(fullCrop(imageBounds(loaded.image, 0)));
        setStatus("ready");
      },
      () => {
        if (cancelled) return;
        setError(t.loadError);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
      release();
    };
  }, [file, t.loadError]);

  useEffect(() => {
    const target = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !previewRef.current || !imageRef.current) return;
    drawEdited(previewRef.current, imageRef.current, turns, fullCrop(bounds), PREVIEW_WIDTH);
  }, [status, turns, bounds.width, bounds.height]);

  const rotate = (direction: 1 | -1) => {
    if (!imageRef.current) return;
    const next = turns + direction;
    const nextBounds = imageBounds(imageRef.current, next);
    setTurns(next);
    setCrop(cropForAspect(nextBounds, aspectOf(preset, nextBounds)));
  };

  const choosePreset = (value: AspectPreset) => {
    setPreset(value);
    setCrop(cropForAspect(bounds, aspectOf(value, bounds)));
  };

  const step = Math.max(1, Math.round(Math.min(bounds.width, bounds.height) / 50));

  const onCropKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
    const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    event.stopPropagation();
    setCrop((current) =>
      event.shiftKey
        ? resizeRect(current, dx, dy, bounds, aspect)
        : moveRect(current, dx, dy, bounds),
    );
  };

  const onDialogKey = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const startDrag = (mode: "move" | "resize") => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { crop, mode, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current;
    const frame = frameRef.current;
    if (!start || !frame) return;
    const shown = frame.getBoundingClientRect().width || PREVIEW_WIDTH;
    const ratio = bounds.width / shown;
    const dx = Math.round((event.clientX - start.x) * ratio);
    const dy = Math.round((event.clientY - start.y) * ratio);
    setCrop(
      start.mode === "move"
        ? moveRect(start.crop, dx, dy, bounds)
        : resizeRect(start.crop, dx, dy, bounds, aspect),
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  const apply = async () => {
    if (!imageRef.current || saving) return;
    setSaving(true);
    setError(null);
    let edited: File | null = null;
    try {
      edited = await renderEditedFile(file, imageRef.current, normalizeTurns(turns), crop);
    } catch {
      edited = null;
    }
    setSaving(false);
    if (!edited) {
      setError(t.exportError);
      return;
    }
    onApply(edited);
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;
  const presetLabel = (value: AspectPreset) =>
    value === "free" ? t.aspectFree : value === "original" ? t.aspectOriginal : value;

  return (
    <FloatingPortal to={document.body}>
      {/* The overlay swallows presses so they do not reach the card underneath. */}
      <div
        className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/40"
        data-kg-image-editor-backdrop
      >
        <div
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-modal="true"
          className="not-kg-prose flex max-h-[95vh] w-[min(34rem,95vw)] flex-col gap-4 overflow-auto rounded-lg bg-white p-6 font-sans text-grey-900 shadow-xl dark:bg-grey-950 dark:text-grey-300"
          role="dialog"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={onDialogKey}
        >
          <h2 className="m-0 text-lg font-semibold" id={titleId}>
            {t.title}
          </h2>

          {status === "loading" ? <p className="m-0 text-sm">{t.loading}</p> : null}
          {error ? (
            <p className="m-0 text-sm text-red" role="alert">
              {error}
            </p>
          ) : null}

          {status === "ready" ? (
            <>
              <div
                ref={frameRef}
                className="relative mx-auto w-full max-w-[30rem] select-none overflow-hidden bg-grey-100 dark:bg-grey-900"
              >
                <canvas ref={previewRef} className="block h-auto w-full" />
                <div
                  aria-describedby={helpId}
                  aria-label={t.cropLabel}
                  className="absolute cursor-move touch-none border-2 border-selection shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-selection"
                  data-crop={`${crop.x},${crop.y},${crop.width},${crop.height}`}
                  role="group"
                  style={{
                    height: pct(crop.height, bounds.height),
                    left: pct(crop.x, bounds.width),
                    top: pct(crop.y, bounds.height),
                    width: pct(crop.width, bounds.width),
                  }}
                  tabIndex={0}
                  onKeyDown={onCropKey}
                  onPointerCancel={endDrag}
                  onPointerDown={startDrag("move")}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 size-3 cursor-nwse-resize bg-selection"
                    onPointerCancel={endDrag}
                    onPointerDown={startDrag("resize")}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                  />
                </div>
              </div>
              <p className="m-0 text-xs opacity-70" id={helpId}>
                {t.cropHelp}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-md bg-grey-100 px-3 py-1.5 text-sm font-medium dark:bg-grey-900"
                  type="button"
                  onClick={() => rotate(-1)}
                >
                  {t.rotateLeft}
                </button>
                <button
                  className="rounded-md bg-grey-100 px-3 py-1.5 text-sm font-medium dark:bg-grey-900"
                  type="button"
                  onClick={() => rotate(1)}
                >
                  {t.rotateRight}
                </button>
                <label className="ml-auto flex items-center gap-2 text-sm">
                  {t.aspectLabel}
                  <select
                    className="rounded-md border border-grey-300 bg-white px-2 py-1 dark:bg-grey-900"
                    value={preset}
                    onChange={(event) => choosePreset(event.target.value as AspectPreset)}
                  >
                    {ASPECT_PRESETS.map((value) => (
                      <option key={value} value={value}>
                        {presetLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              className="rounded-md bg-grey-100 px-4 py-2 text-sm font-medium dark:bg-grey-900"
              type="button"
              onClick={onCancel}
            >
              {t.cancel}
            </button>
            <button
              className="rounded-md bg-selection px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:text-black"
              disabled={status !== "ready" || saving}
              type="button"
              onClick={apply}
            >
              {t.apply}
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
};

export default ImageEditorDialog;
