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
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mount } from "./__utils__/mount";

beforeEach(() => {
  // jsdom has no layout: the card's drag handling asks for the element under the pointer
  (document as unknown as { elementFromPoint: () => null }).elementFromPoint = () => null;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const photo = (index: number) => ({
  alt: `alt ${index}`,
  caption: "",
  fileName: `p${index}.gif`,
  height: 300,
  row: Math.floor(index / 3),
  src: `${PIXEL}#${index}`,
  title: "",
  width: 400,
});

const galleryDocument = (extra: Record<string, unknown> = {}, count = 5) =>
  JSON.stringify({
    root: {
      children: [
        { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
        {
          caption: "",
          images: Array.from({ length: count }, (_, index) => photo(index)),
          type: "gallery",
          version: 1,
          ...extra,
        },
        { children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

const viewer = () => document.querySelector("[data-gallery-viewer]") as HTMLElement | null;
const counter = () => viewer()?.querySelector("[data-gallery-viewer-count]")?.textContent;
const shownSrc = () =>
  (viewer()?.querySelector("[data-gallery-viewer-image]") as HTMLImageElement | null)?.getAttribute(
    "src",
  );

const load = async (
  extra: Record<string, unknown> = {},
  composer: Record<string, unknown> = {},
  count = 5,
) => {
  await mount({
    composer: { initialEditorState: galleryDocument(extra, count), ...composer },
  });
};

const openViewer = async () => {
  const button = document.querySelector("[data-gallery-fullscreen]") as HTMLButtonElement;
  await act(async () => {
    fireEvent.click(button);
  });
  await waitFor(() => expect(viewer()).not.toBeNull());
};

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("auto-advance", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

  it("moves to the next photo after the set seconds and starts over after the last", async () => {
    await load({ autoplaySeconds: 2 }, {}, 3);
    await openViewer();
    expect(counter()).toBe("1 of 3");
    await tick(2100);
    expect(counter()).toBe("2 of 3");
    await tick(2000);
    expect(counter()).toBe("3 of 3");
    await tick(2000);
    expect(counter()).toBe("1 of 3");
  });

  it("does not advance with no seconds set, and shows no play button", async () => {
    await load({}, {}, 3);
    await openViewer();
    await tick(20000);
    expect(counter()).toBe("1 of 3");
    expect(viewer()?.querySelector("[data-gallery-viewer-play]")).toBeNull();
  });

  it("pauses and plays again with the button, and a move by hand starts the wait again", async () => {
    await load({ autoplaySeconds: 2 }, {}, 4);
    await openViewer();
    const play = viewer()?.querySelector("[data-gallery-viewer-play]") as HTMLButtonElement;
    expect(play.getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(play);
    });
    expect(play.getAttribute("aria-pressed")).toBe("false");
    await tick(5000);
    expect(counter()).toBe("1 of 4");
    await act(async () => {
      fireEvent.click(play);
    });
    await tick(1500);
    await act(async () => {
      fireEvent.keyDown(viewer() as Element, { key: "ArrowRight" });
    });
    expect(counter()).toBe("2 of 4");
    await tick(1500); // under 2 seconds since the move by hand
    expect(counter()).toBe("2 of 4");
    await tick(800);
    expect(counter()).toBe("3 of 4");
  });

  it("is switched off by the host's gallery option, even for a stored setting", async () => {
    await load({ autoplaySeconds: 2 }, { gallery: { autoAdvance: false } }, 3);
    await openViewer();
    await tick(5000);
    expect(counter()).toBe("1 of 3");
  });
});

describe("going round", () => {
  it("goes from the last photo to the first and from the first to the last, by hand", async () => {
    await load({}, {}, 10);
    await openViewer();
    expect(counter()).toBe("1 of 10");
    await act(async () => {
      fireEvent.keyDown(viewer() as Element, { key: "ArrowLeft" });
    });
    expect(counter()).toBe("10 of 10");
    await act(async () => {
      fireEvent.click(viewer()?.querySelector("[data-gallery-viewer-next]") as Element);
    });
    expect(counter()).toBe("1 of 10");
    await act(async () => {
      fireEvent.click(viewer()?.querySelector("[data-gallery-viewer-prev]") as Element);
    });
    expect(counter()).toBe("10 of 10");
  });

  it("disables the arrows only when there is a single photo", async () => {
    await load({}, {}, 1);
    await openViewer();
    expect(
      (viewer()?.querySelector("[data-gallery-viewer-next]") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("keeps playing in order past 10 of 10 with ten photos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await load({ autoplaySeconds: 5 }, {}, 10);
    await openViewer();
    for (let step = 1; step < 10; step++) await tick(5100);
    expect(counter()).toBe("10 of 10");
    await tick(5100);
    expect(counter()).toBe("1 of 10");
  });
});

describe("random order", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  const key = async (name: string) => {
    await act(async () => {
      fireEvent.keyDown(viewer() as Element, { key: name });
    });
  };
  const photoNumber = () => Number(shownSrc()?.split("#").pop());

  it("keeps the strip and the counter in the set order, and Next and Previous in that order", async () => {
    await load({ shuffle: true }, {}, 6);
    await openViewer();
    const strip = [...(viewer()?.querySelectorAll("[data-gallery-viewer-thumbs] img") ?? [])].map(
      (img) => (img.getAttribute("src") ?? "").split("#").pop(),
    );
    expect(strip).toEqual(["0", "1", "2", "3", "4", "5"]);
    for (let n = 1; n < 6; n++) {
      await key("ArrowRight");
      expect(counter()).toBe(`${n + 1} of 6`);
      expect(photoNumber()).toBe(n);
    }
    await key("ArrowRight");
    expect(counter()).toBe("1 of 6");
  });

  it.each([2, 10])(
    "shows every one of %i photos once before any repeats, in each of three passes, with no repeat across a pass boundary",
    async (size) => {
      await load({ autoplaySeconds: 5, shuffle: true }, {}, size);
      await openViewer();
      const sequence = [photoNumber()];
      for (let step = 1; step < size * 3; step++) {
        await tick(5100);
        sequence.push(photoNumber());
        // the counter is the photo's own number
        expect(counter()).toBe(`${photoNumber() + 1} of ${size}`);
      }
      for (let pass = 0; pass < 3; pass++) {
        expect(new Set(sequence.slice(pass * size, (pass + 1) * size)).size).toBe(size);
      }
      for (let n = 1; n < sequence.length; n++) {
        expect(sequence[n]).not.toBe(sequence[n - 1]);
      }
      if (size >= 10) {
        expect(sequence.slice(0, size).join()).not.toBe(
          Array.from({ length: size }, (_, n) => n).join(),
        );
      }
    },
  );

  it("stays on the one photo of a gallery of one", async () => {
    await load({ autoplaySeconds: 5, shuffle: true }, {}, 1);
    await openViewer();
    await tick(20000);
    expect(counter()).toBe("1 of 1");
  });

  it("counts a photo reached by hand as shown", async () => {
    await load({ autoplaySeconds: 5, shuffle: true }, {}, 4);
    await openViewer();
    await key("ArrowRight");
    await key("ArrowRight");
    const shown = [0, 1, 2];
    await tick(5100);
    expect(shown).not.toContain(photoNumber());
    expect(photoNumber()).toBe(3);
  });

  it("keeps the set order in the auto-advance when it is off", async () => {
    await load({ autoplaySeconds: 5 }, {}, 4);
    await openViewer();
    const shown = [photoNumber()];
    for (let step = 0; step < 3; step++) {
      await tick(5100);
      shown.push(photoNumber());
    }
    expect(shown).toEqual([0, 1, 2, 3]);
  });
});

describe("the exit control's notice", () => {
  it("does not repeat the visible 'Exit full screen' text in a second box, and never asks the browser for full screen", async () => {
    const request = vi.fn();
    (document.documentElement as unknown as { requestFullscreen: () => void }).requestFullscreen =
      request;
    await load({}, {}, 3);
    await openViewer();
    const close = viewer()?.querySelector("[data-gallery-viewer-close]") as HTMLElement;
    const tip = document.getElementById(close.getAttribute("aria-describedby") as string);
    // the button shows its own text from the small breakpoint up, so its tooltip only exists below it
    expect(close.querySelector("[data-gallery-viewer-close-text]")?.className).toContain(
      "sm:inline",
    );
    expect(tip?.className).toContain("sm:peer-hover:hidden");
    expect(tip?.className).toContain("sm:peer-focus-visible:hidden");
    expect(request).not.toHaveBeenCalled();
  });
});

describe("screen mode", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

  it("has no thumbnail strip", async () => {
    await load({ screenMode: true });
    await openViewer();
    expect(viewer()?.querySelector("[data-gallery-viewer-thumbs]")).toBeNull();
    expect(viewer()?.getAttribute("data-gallery-viewer-screen-mode")).toBe("true");
  });

  it("keeps the strip when it is off", async () => {
    await load({});
    await openViewer();
    expect(viewer()?.querySelector("[data-gallery-viewer-thumbs]")).not.toBeNull();
  });

  it("hides the controls after a few seconds and a key brings them back; Escape needs a second press to exit", async () => {
    await load({ screenMode: true });
    await openViewer();
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
    await tick(3200);
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("hidden");
    await act(async () => {
      fireEvent.keyDown(viewer() as Element, { key: "Escape" });
    });
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
    expect(viewer()).not.toBeNull();
    await act(async () => {
      fireEvent.keyDown(viewer() as Element, { key: "Escape" });
    });
    await waitFor(() => expect(viewer()).toBeNull());
  });

  it("brings the controls back on a tap or a mouse move", async () => {
    await load({ screenMode: true });
    await openViewer();
    await tick(3200);
    await act(async () => {
      fireEvent.pointerDown(viewer() as Element);
    });
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
    await tick(3200);
    await act(async () => {
      fireEvent.mouseMove(viewer() as Element);
    });
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
  });

  it("is switched off by the host's gallery option", async () => {
    await load({ screenMode: true }, { gallery: { screenMode: false } });
    await openViewer();
    expect(viewer()?.querySelector("[data-gallery-viewer-thumbs]")).not.toBeNull();
    await tick(5000);
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
  });
});

describe("the normal viewer", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

  it("never hides the exit control, however long nothing is touched", async () => {
    await load({});
    await openViewer();
    await tick(30000);
    const bar = viewer()?.querySelector("[data-gallery-viewer-bar]") as HTMLElement;
    expect(viewer()?.getAttribute("data-gallery-viewer-controls")).toBe("shown");
    expect(bar.className).not.toMatch(/(^|\s)(invisible|opacity-0)(\s|$)/);
    expect(viewer()?.querySelector("[data-gallery-viewer-close]")).not.toBeNull();
  });
});

describe("which settings depend on which", () => {
  const select = async (extra: Record<string, unknown> = {}) => {
    await mount({ composer: { initialEditorState: galleryDocument(extra, 3) } });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card='gallery']") as HTMLElement);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-gallery-autoplay-toggle]")).not.toBeNull(),
    );
  };
  const el = (name: string) => document.querySelector(`[data-gallery-${name}]`) as HTMLElement;

  it("disables Random order, with the reason, while auto-advance is off, and turns it on with auto-advance", async () => {
    await select();
    const shuffle = el("shuffle-toggle") as HTMLButtonElement;
    expect(shuffle.disabled).toBe(true);
    expect(shuffle.title).toBe("Needs auto-advance");
    expect(el("shuffle-reason")?.textContent).toBe("Needs auto-advance");
    await act(async () => {
      fireEvent.click(el("autoplay-toggle"));
    });
    expect((el("shuffle-toggle") as HTMLButtonElement).disabled).toBe(false);
    expect(el("shuffle-reason")).toBeNull();
    await act(async () => {
      fireEvent.click(el("shuffle-toggle"));
    });
    expect(el("shuffle-toggle").getAttribute("aria-pressed")).toBe("true");
    await act(async () => {
      fireEvent.click(el("autoplay-toggle"));
    });
    // switched off again: disabled once more, and the choice is kept for next time
    expect((el("shuffle-toggle") as HTMLButtonElement).disabled).toBe(true);
    expect(el("shuffle-toggle").getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps the seconds box tied to auto-advance and Screen mode independent of it", async () => {
    await select();
    expect((el("autoplay-seconds") as HTMLInputElement).disabled).toBe(true);
    expect((el("screen-mode-toggle") as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(el("autoplay-toggle"));
    });
    expect((el("autoplay-seconds") as HTMLInputElement).disabled).toBe(false);
  });
});

describe("the settings and the saved HTML", () => {
  it("shows the three settings under a selected gallery and saves them in the card", async () => {
    const { api } = await mount({ composer: { initialEditorState: galleryDocument({}, 3) } });
    const card = document.querySelector("[data-kg-card='gallery']") as HTMLElement;
    await act(async () => {
      fireEvent.click(card);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-gallery-autoplay-toggle]")).not.toBeNull(),
    );
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-autoplay-toggle]") as Element);
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-shuffle-toggle]") as Element);
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-gallery-screen-mode-toggle]") as Element);
    });
    const saved = JSON.parse(api.serialize()).root.children.find(
      (child: { type: string }) => child.type === "gallery",
    );
    expect(saved.autoplaySeconds).toBe(5);
    expect(saved.shuffle).toBe(true);
    expect(saved.screenMode).toBe(true);
    expect(
      (document.querySelector("[data-gallery-autoplay-seconds]") as HTMLInputElement).disabled,
    ).toBe(false);
    expect(
      document.querySelector("[data-gallery-shuffle-toggle]")?.getAttribute("aria-pressed") ===
        "true",
    ).toBe(true);
    expect(
      document.querySelector("[data-gallery-screen-mode-toggle]")?.getAttribute("aria-pressed") ===
        "true",
    ).toBe(true);
  });

  it("leaves a setting out when the host switches it off", async () => {
    await mount({
      composer: {
        gallery: { shuffle: false },
        initialEditorState: galleryDocument({}, 3),
      },
    });
    await act(async () => {
      fireEvent.click(document.querySelector("[data-kg-card='gallery']") as Element);
    });
    await waitFor(() =>
      expect(document.querySelector("[data-gallery-autoplay-toggle]")).not.toBeNull(),
    );
    expect(document.querySelector("[data-gallery-shuffle-toggle]")).toBeNull();
    expect(document.querySelector("[data-gallery-screen-mode-toggle]")).not.toBeNull();
  });
});
