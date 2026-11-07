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

describe("random order", () => {
  it("plays every photo once, starting with the one that was opened", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    await load({ shuffle: true }, {}, 5);
    await openViewer();
    expect(counter()).toBe("1 of 5");
    const seen = [shownSrc()];
    for (let step = 0; step < 4; step++) {
      await act(async () => {
        fireEvent.keyDown(viewer() as Element, { key: "ArrowRight" });
      });
      seen.push(shownSrc());
    }
    expect(new Set(seen).size).toBe(5);
    expect(seen[0]).toContain("#0");
    expect(seen.join()).not.toBe([0, 1, 2, 3, 4].map((n) => `${PIXEL}#${n}`).join());
  });

  it("keeps the order when it is off", async () => {
    await load({}, {}, 4);
    await openViewer();
    const seen = [shownSrc()];
    for (let step = 0; step < 3; step++) {
      await act(async () => {
        fireEvent.keyDown(viewer() as Element, { key: "ArrowRight" });
      });
      seen.push(shownSrc());
    }
    expect(seen).toEqual([0, 1, 2, 3].map((n) => `${PIXEL}#${n}`));
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
      (document.querySelector("[data-gallery-shuffle-toggle]") as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (document.querySelector("[data-gallery-screen-mode-toggle]") as HTMLInputElement).checked,
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
