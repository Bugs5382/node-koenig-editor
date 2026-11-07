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
import { describe, expect, it } from "vitest";
import {
  buildSnippet,
  defaultSettings,
  parseSettings,
  PRESETS,
  applyPreset,
  presetOf,
  SELECTION_COLORS,
  serializeSettings,
  SIZES,
  type Catalog,
} from "./config";

const catalog: Catalog = {
  cards: ["image", "gallery", "header", "divider", "callout"],
  tools: ["emojiPicker", "imageEditor"],
};

describe("settings in the page address", () => {
  it("starts with every card and tool on and the extras off", () => {
    const s = defaultSettings(catalog);
    expect(s.cards).toEqual(catalog.cards);
    expect(s.tools).toEqual(catalog.tools);
    expect(s).toMatchObject({
      comments: true,
      readOnly: false,
      sampleUploads: true,
      size: 16,
    });
  });

  it("writes nothing for the defaults", () => {
    expect(serializeSettings(defaultSettings(catalog), catalog)).toBe("");
  });

  it("round-trips a changed configuration", () => {
    const s = {
      ...defaultSettings(catalog),
      cards: ["image", "divider"],
      tools: [],
      comments: false,
      readOnly: true,
      dark: true,
      sampleUploads: false,
      size: 20,
    };
    const query = serializeSettings(s, catalog);
    expect(parseSettings(`?${query}`, catalog)).toEqual(s);
  });

  it("keeps an empty list apart from a missing one", () => {
    const none = { ...defaultSettings(catalog), cards: [] };
    const query = serializeSettings(none, catalog);
    expect(query).toContain("cards=");
    expect(parseSettings(query, catalog).cards).toEqual([]);
    expect(parseSettings("", catalog).cards).toEqual(catalog.cards);
  });

  it("drops unknown names and keeps catalog order", () => {
    const s = parseSettings("cards=divider,bogus,image&tools=nope", catalog);
    expect(s.cards).toEqual(["image", "divider"]);
    expect(s.tools).toEqual([]);
  });

  it("falls back to the default for a bad flag or text size", () => {
    const s = parseSettings("comments=maybe&size=99&readOnly=1", catalog);
    expect(s.comments).toBe(true);
    expect(s.readOnly).toBe(true);
    expect(s.size).toBe(16);
    expect(SIZES).toContain(s.size);
  });
});

describe("table border style in the page address", () => {
  it("is dashed while editing by default and writes nothing for that", () => {
    const settings = parseSettings("", catalog);
    expect(settings.tableBorder).toBe("dashed");
    expect(serializeSettings(settings, catalog)).toBe("");
  });

  it("round-trips solid and ignores an unknown style", () => {
    const search = serializeSettings(
      { ...parseSettings("", catalog), tableBorder: "solid" },
      catalog,
    );
    expect(search).toBe("tableBorder=solid");
    expect(parseSettings(search, catalog).tableBorder).toBe("solid");
    expect(parseSettings("tableBorder=dotted", catalog).tableBorder).toBe("dashed");
  });
});

describe("preview in the page address", () => {
  it("starts off at desktop width and writes nothing for that", () => {
    const settings = parseSettings("", catalog);
    expect(settings.preview).toBe(false);
    expect(settings.previewWidth).toBe("desktop");
    expect(serializeSettings(settings, catalog)).toBe("");
  });

  it("round-trips the switch and the width", () => {
    const search = serializeSettings(
      { ...parseSettings("", catalog), preview: true, previewWidth: "phone" },
      catalog,
    );
    expect(search).toBe("preview=1&previewWidth=phone");
    const back = parseSettings(search, catalog);
    expect(back.preview).toBe(true);
    expect(back.previewWidth).toBe("phone");
  });

  it("ignores a width it does not know", () => {
    expect(parseSettings("previewWidth=watch", catalog).previewWidth).toBe("desktop");
  });
});

describe("code snippet", () => {
  it("shows the bare composer for the defaults", () => {
    const code = buildSnippet(defaultSettings(catalog), catalog);
    expect(code).toContain("<KoenigComposer");
    expect(code).not.toContain("cards=");
    expect(code).not.toContain("tools=");
    expect(code).toContain("comments={comments}");
  });

  it("lists only the cards and tools that are on", () => {
    const s = { ...defaultSettings(catalog), cards: ["image", "divider"], tools: ["emojiPicker"] };
    const code = buildSnippet(s, catalog);
    expect(code).toContain('cards={["image", "divider"]}');
    expect(code).toContain('tools={["emojiPicker"]}');
  });

  it("writes an empty list when everything is off, and leaves out the rest", () => {
    const s = {
      ...defaultSettings(catalog),
      cards: [],
      tools: [],
      comments: false,
      readOnly: true,
    };
    const code = buildSnippet(s, catalog);
    expect(code).toContain("cards={[]}");
    expect(code).toContain("tools={[]}");
    expect(code).toContain("editable={false}");
    expect(code).toContain("<KoenigEditor readOnly />");
    expect(code).not.toContain("comments=");
  });

  it("leaves out tools when the package has none", () => {
    const bare: Catalog = { cards: catalog.cards, tools: [] };
    const code = buildSnippet(defaultSettings(bare), bare);
    expect(code).not.toContain("tools=");
  });
});

describe("selection colour", () => {
  it("is the editor's own colour until one is picked", () => {
    expect(defaultSettings(catalog).selection).toBe("");
  });

  it("travels in the address as a palette colour without the #", () => {
    const color = SELECTION_COLORS[2]!.value;
    const s = { ...defaultSettings(catalog), selection: color };
    const query = serializeSettings(s, catalog);
    expect(query).toBe(`selection=${color.slice(1)}`);
    expect(parseSettings(query, catalog).selection).toBe(color);
  });

  it("ignores a colour that is not in the palette", () => {
    expect(parseSettings("selection=123456", catalog).selection).toBe("");
    expect(parseSettings("selection=zzz", catalog).selection).toBe("");
  });
});

describe("card presets", () => {
  it("lists all cards first, then smaller sets", () => {
    expect(PRESETS[0]?.id).toBe("all");
    expect(PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps only cards the package has, in the package's order", () => {
    expect(applyPreset("all", catalog)).toEqual(catalog.cards);
    const media = applyPreset("media", catalog);
    expect(media).toEqual(["image", "gallery", "header", "divider"]);
    expect(applyPreset("text", { cards: ["divider"], tools: [] })).toEqual(["divider"]);
  });

  it("names the preset a card list matches, or custom", () => {
    expect(presetOf(catalog.cards, catalog)).toBe("all");
    expect(presetOf(["image", "gallery", "header", "divider"], catalog)).toBe("media");
    expect(presetOf(["image"], catalog)).toBe("custom");
    expect(presetOf(["header", "image", "gallery", "divider"], catalog)).toBe("custom");
    expect(PRESETS.every((p) => p.cards === null || p.cards.includes("divider" as never))).toBe(
      true,
    );
  });
});

describe("the colour settings", () => {
  it("start with the colour wheel on and no brand palette, and leave the address clean", () => {
    const s = defaultSettings(catalog);
    expect(s.colorPicker).toBe(true);
    expect(s.brandColors).toBe(false);
    expect(serializeSettings(s, catalog)).toBe("");
    expect(buildSnippet(s, catalog)).not.toContain("colors=");
  });

  it("travel in the address and show in the snippet when they differ", () => {
    const s = { ...defaultSettings(catalog), brandColors: true, colorPicker: false };
    const query = serializeSettings(s, catalog);
    expect(query).toContain("brandColors");
    expect(parseSettings(`?${query}`, catalog)).toEqual(s);
    expect(buildSnippet(s, catalog)).toContain("colors={colors}");
  });
});

describe("the toolbar, fonts and spell check settings", () => {
  const withToolbar: Catalog = {
    ...catalog,
    toolbar: ["bold", "italic", "underline", "fontSize"],
  };

  it("start with every toolbar button on, no sample fonts and spell check on", () => {
    const s = defaultSettings(withToolbar);
    expect(s.toolbar).toEqual(withToolbar.toolbar);
    expect(s.fonts).toBe(false);
    expect(s.spellCheck).toBe(true);
    expect(serializeSettings(s, withToolbar)).toBe("");
  });

  it("travel in the address, in the package's order, ignoring names it does not know", () => {
    const s = {
      ...defaultSettings(withToolbar),
      toolbar: ["bold", "underline"],
      fonts: true,
      spellCheck: false,
    };
    const query = serializeSettings(s, withToolbar);
    expect(query).toContain("toolbar=bold,underline");
    expect(parseSettings(`?${query}`, withToolbar)).toEqual(s);
    expect(parseSettings("?toolbar=underline,nope,bold", withToolbar).toolbar).toEqual([
      "bold",
      "underline",
    ]);
  });

  it("show in the code snippet only when they differ", () => {
    const base = defaultSettings(withToolbar);
    expect(buildSnippet(base, withToolbar)).not.toContain("toolbar=");
    const changed = { ...base, toolbar: ["bold"], fonts: true, spellCheck: false };
    const snippet = buildSnippet(changed, withToolbar);
    expect(snippet).toContain('toolbar={["bold"]}');
    expect(snippet).toContain("fonts={fonts}");
    expect(snippet).toContain("spellCheck={false}");
  });

  it("start with collaboration off, and it travels in the address and shows in the snippet", () => {
    const base = defaultSettings(withToolbar);
    expect(base.collaboration).toBe(false);
    expect(buildSnippet(base, withToolbar)).not.toContain("collaboration");
    const on = { ...base, collaboration: true };
    expect(serializeSettings(on, withToolbar)).toContain("collaboration=1");
    expect(parseSettings(`?${serializeSettings(on, withToolbar)}`, withToolbar).collaboration).toBe(
      true,
    );
    expect(buildSnippet(on, withToolbar)).toContain("collaboration={collaboration}");
  });

  it("start with the two-row selection toolbar, and one row travels in the address and the snippet", () => {
    const base = defaultSettings(withToolbar);
    expect(base.toolbarRows).toBe(2);
    expect(buildSnippet(base, withToolbar)).not.toContain("toolbarRows");
    const one = { ...base, toolbarRows: 1 as const };
    expect(serializeSettings(one, withToolbar)).toContain("toolbarRows=1");
    expect(parseSettings("?toolbarRows=1", withToolbar).toolbarRows).toBe(1);
    expect(parseSettings("?toolbarRows=7", withToolbar).toolbarRows).toBe(2);
    expect(buildSnippet(one, withToolbar)).toContain("toolbarRows={1}");
  });

  it("are not offered by a build that lacks the toolbar list", () => {
    const old = defaultSettings(catalog);
    expect(old.toolbar).toEqual([]);
    expect(serializeSettings(old, catalog)).toBe("");
    expect(buildSnippet(old, catalog)).not.toContain("toolbar=");
  });
});
