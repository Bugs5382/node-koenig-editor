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
// The controls the top bar is made of: a button, a switch, a segmented control, a listbox and a
// colour swatch picker. Plain React and CSS (controls.css), no UI library, and no dependency on the
// rest of the demo, so the staging playground reuses this file as it is. Each one works from the
// keyboard and shows a focus ring.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

interface ButtonProps {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  variant?: "primary" | "quiet";
}

export function Button({ children, disabled, onClick, title, variant = "quiet" }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx("ctl-button", `ctl-button-${variant}`)}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface SwitchProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

/** An on/off switch. Space and Enter toggle it, like any button. */
export function Switch({ checked, label, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="ctl-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="ctl-switch-track" aria-hidden="true">
        <span className="ctl-switch-thumb" />
      </span>
      <span>{label}</span>
    </button>
  );
}

interface SegmentedProps<T extends string | number> {
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; title?: string; value: T }[];
  value: T;
}

/** One choice out of a few, side by side. Arrow keys move the choice, Home and End jump. */
export function Segmented<T extends string | number>({
  label,
  onChange,
  options,
  value,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const move = (to: number) => {
    const next = (to + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowRight: selected + 1,
      ArrowDown: selected + 1,
      ArrowLeft: selected - 1,
      ArrowUp: selected - 1,
      Home: 0,
      End: options.length - 1,
    };
    const target = keys[event.key];
    if (target === undefined) return;
    event.preventDefault();
    move(target);
  };

  return (
    <div className="ctl-segmented" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="button"
          role="radio"
          aria-checked={index === selected}
          tabIndex={index === selected ? 0 : -1}
          title={option.title}
          className={cx("ctl-segment", index === selected && "is-selected")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Closes a popup on a press outside it, or on Escape.
function useDismiss(open: boolean, close: () => void, ref: { current: HTMLElement | null }) {
  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPress);
    return () => document.removeEventListener("mousedown", onPress);
  }, [open, close, ref]);
}

interface ListboxProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: readonly { disabled?: boolean; label: string; value: T }[];
  value: T;
}

/** A styled dropdown: a button that opens a listbox. Arrow keys, Home, End, Enter, Escape. */
export function Listbox<T extends string>({ label, onChange, options, value }: ListboxProps<T>) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const current = options.find((o) => o.value === value);

  const close = () => setOpen(false);
  useDismiss(open, close, root);

  const show = () => {
    const at = options.findIndex((o) => o.value === value);
    setActive(at < 0 ? 0 : at);
    setOpen(true);
  };
  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    button.current?.focus();
  };

  const step = (from: number, by: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (((from + by * i) % options.length) + options.length) % options.length;
      if (!options[next]?.disabled) return next;
    }
    return from;
  };

  const onListKey = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        setActive(step(active, 1));
        break;
      case "ArrowUp":
        setActive(step(active, -1));
        break;
      case "Home":
        setActive(step(-1, 1));
        break;
      case "End":
        setActive(step(options.length, -1));
        break;
      case "Enter":
      case " ":
        choose(active);
        break;
      case "Escape":
        setOpen(false);
        button.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        return;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className="ctl-pop" ref={root}>
      <button
        ref={button}
        type="button"
        className="ctl-button ctl-button-quiet ctl-listbox-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current?.label ?? ""}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            show();
          }
        }}
      >
        <span className="ctl-listbox-label">{label}</span>
        <span className="ctl-listbox-value">{current?.label}</span>
        <span className="ctl-caret" aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={`${id}-list`}
          ref={list}
          className="ctl-popup ctl-listbox"
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${id}-opt-${active}`}
          tabIndex={-1}
          onKeyDown={onListKey}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              className={cx(
                "ctl-option",
                index === active && "is-active",
                option.value === value && "is-selected",
              )}
              onMouseEnter={() => !option.disabled && setActive(index)}
              onClick={() => choose(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SwatchPickerProps {
  colors: readonly { label: string; value: string }[];
  label: string;
  onChange: (value: string) => void;
  /** What an empty value means, shown as the first choice. */
  emptyLabel: string;
  value: string;
}

/** A colour picker made of swatches in a small popup: a themed stand-in for the browser's own. */
export function SwatchPicker({ colors, emptyLabel, label, onChange, value }: SwatchPickerProps) {
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useDismiss(open, close, root);

  const choices = [{ label: emptyLabel, value: "" }, ...colors];
  const current = choices.find((c) => c.value === value);

  return (
    <div
      className="ctl-pop"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className="ctl-button ctl-button-quiet"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? emptyLabel}`}
        onClick={() => setOpen(!open)}
      >
        <span
          className={cx("ctl-swatch", !value && "is-empty")}
          style={value ? { background: value } : undefined}
          aria-hidden="true"
        />
        <span>{label}</span>
        <span className="ctl-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="ctl-popup ctl-swatches" role="radiogroup" aria-label={label}>
          {choices.map((choice) => (
            <button
              key={choice.value || "default"}
              type="button"
              role="radio"
              aria-checked={choice.value === value}
              aria-label={choice.label}
              title={choice.label}
              className={cx(
                "ctl-swatch ctl-swatch-choice",
                !choice.value && "is-empty",
                choice.value === value && "is-selected",
              )}
              style={choice.value ? { background: choice.value } : undefined}
              onClick={() => {
                onChange(choice.value);
                setOpen(false);
                button.current?.focus();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
