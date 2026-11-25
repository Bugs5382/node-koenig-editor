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
  DEFAULT_EMBED_HOSTS,
  parseEmbedUrl,
  type KoenigEmbedHost,
} from "../src/additions/embed/embedHosts";

const ok = (input: string, options?: { parent?: string }) => {
  const result = parseEmbedUrl(input, DEFAULT_EMBED_HOSTS, options ?? { parent: "example.com" });
  if (!result.ok) throw new Error(`${input}: ${result.reason}`);
  return result.source;
};
const refused = (input: string, options?: { parent?: string }) => {
  const result = parseEmbedUrl(input, DEFAULT_EMBED_HOSTS, options ?? { parent: "example.com" });
  if (result.ok) throw new Error(`${input} was accepted: ${result.source.embedUrl}`);
  return result.reason;
};

const ID = "dQw4w9WgXcQ";

describe("YouTube links", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=${ID}&list=PL1&index=2`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `  https://www.youtube.com/watch?v=${ID}  `,
    `HTTPS://WWW.YOUTUBE.COM/watch?v=${ID}`,
  ])("%s plays from the privacy-enhanced domain", (input) => {
    const source = ok(input);
    expect(source.host).toBe("youtube");
    expect(source.label).toBe("YouTube");
    const url = new URL(source.embedUrl);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("www.youtube-nocookie.com");
    expect(url.pathname).toBe(`/embed/${ID}`);
  });

  it("keeps a start time as whole seconds and nothing else from the link", () => {
    const url = new URL(ok(`https://youtu.be/${ID}?t=90&list=x`).embedUrl);
    expect(url.searchParams.get("start")).toBe("90");
    expect(url.searchParams.has("list")).toBe(false);
  });

  it.each([
    ["https://www.youtube.com/watch?v=short", "not-a-video"],
    ["https://www.youtube.com/watch", "not-a-video"],
    [`https://www.youtube.com/watch?v=${ID}x`, "not-a-video"],
    ["https://www.youtube.com/", "not-a-video"],
    [`https://www.youtube.com/embed/${ID}/../x`, "not-a-video"],
    ["https://www.youtube.com/feed/subscriptions", "not-a-video"],
  ])("refuses %s", (input, reason) => {
    expect(refused(input)).toBe(reason);
  });
});

describe("Vimeo links", () => {
  it.each([
    "https://vimeo.com/76979871",
    "https://www.vimeo.com/76979871",
    "https://player.vimeo.com/video/76979871",
    "https://vimeo.com/76979871?share=copy",
  ])("%s plays with do-not-track on", (input) => {
    const source = ok(input);
    expect(source.host).toBe("vimeo");
    expect(source.label).toBe("Vimeo");
    const url = new URL(source.embedUrl);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("player.vimeo.com");
    expect(url.pathname).toBe("/video/76979871");
    expect(url.searchParams.get("dnt")).toBe("1");
  });

  it("keeps the privacy hash of an unlisted video", () => {
    expect(
      new URL(ok("https://vimeo.com/76979871/abcdef0123").embedUrl).searchParams.get("h"),
    ).toBe("abcdef0123");
    expect(
      new URL(ok("https://player.vimeo.com/video/76979871?h=abcdef0123").embedUrl).searchParams.get(
        "h",
      ),
    ).toBe("abcdef0123");
  });

  it.each(["https://vimeo.com/", "https://vimeo.com/watch", "https://vimeo.com/12ab"])(
    "refuses %s",
    (input) => {
      expect(refused(input)).toBe("not-a-video");
    },
  );
});

describe("Twitch links", () => {
  it("a channel plays with the parent the host gave", () => {
    const source = ok("https://www.twitch.tv/somechannel", { parent: "blog.example.com" });
    expect(source.host).toBe("twitch");
    const url = new URL(source.embedUrl);
    expect(url.hostname).toBe("player.twitch.tv");
    expect(url.searchParams.get("channel")).toBe("somechannel");
    expect(url.searchParams.get("parent")).toBe("blog.example.com");
  });

  it("a video and a clip play too", () => {
    const video = new URL(ok("https://www.twitch.tv/videos/123456789").embedUrl);
    expect(video.hostname).toBe("player.twitch.tv");
    expect(video.searchParams.get("video")).toBe("123456789");
    expect(video.searchParams.get("parent")).toBe("example.com");
    for (const link of [
      "https://clips.twitch.tv/FunnyClipSlug-abc123",
      "https://www.twitch.tv/somechannel/clip/FunnyClipSlug-abc123",
    ]) {
      const clip = new URL(ok(link).embedUrl);
      expect(clip.hostname).toBe("clips.twitch.tv");
      expect(clip.pathname).toBe("/embed");
      expect(clip.searchParams.get("clip")).toBe("FunnyClipSlug-abc123");
      expect(clip.searchParams.get("parent")).toBe("example.com");
    }
  });

  it("is refused without a parent, which Twitch requires", () => {
    expect(refused("https://www.twitch.tv/somechannel", { parent: "" })).toBe("needs-parent");
  });

  it.each([
    "https://www.twitch.tv/",
    "https://www.twitch.tv/some/thing/else",
    "https://www.twitch.tv/bad-name",
  ])("refuses %s", (input) => {
    expect(refused(input)).toBe("not-a-video");
  });
});

describe("everything else is refused", () => {
  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:video/mp4;base64,AAAA",
    "blob:https://example.com/x",
    "file:///etc/passwd",
    "vbscript:x",
    "//www.youtube.com/watch?v=dQw4w9WgXcQ",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "ftp://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ])("refuses the address %j before looking at the host", (input) => {
    expect(["unsafe", "invalid"]).toContain(refused(input));
  });

  it.each([
    "https://www.example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evil-youtube.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutu.be/dQw4w9WgXcQ",
    "https://www.youtube.com.example.org/watch?v=dQw4w9WgXcQ",
    "https://example.com/?u=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://dailymotion.com/video/x7tgad0",
  ])("refuses %s as not on the list", (input) => {
    expect(refused(input)).toBe("not-allowed");
  });

  it("refuses an address with a user name or password in it", () => {
    expect(refused("https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("unsafe");
    expect(refused("https://user@youtu.be/dQw4w9WgXcQ")).toBe("unsafe");
  });

  it("refuses control characters and spaces inside the address", () => {
    expect(refused("https://www.youtube.com/watch?v=dQw4w9WgXcQ\n<script>")).toBe("unsafe");
    expect(refused("https://www.youtube.com/wa tch?v=dQw4w9WgXcQ")).toBe("unsafe");
    expect(refused("java\tscript:alert(1)")).toBe("unsafe");
  });

  it("says empty and invalid plainly", () => {
    expect(refused("")).toBe("empty");
    expect(refused("   ")).toBe("empty");
    expect(refused("not a link")).toBe("unsafe");
    expect(refused("youtube.com/watch?v=dQw4w9WgXcQ")).toBe("invalid");
  });
});

describe("the host's own list", () => {
  const custom: KoenigEmbedHost = {
    id: "demo",
    label: "Demo Video",
    hostnames: ["video.example.org"],
    parse: (url) =>
      /^\/v\/\d+$/.test(url.pathname) ? `https://player.example.org${url.pathname}` : null,
  };

  it("only the listed hosts are allowed", () => {
    const result = parseEmbedUrl("https://video.example.org/v/42", [custom]);
    expect(result).toMatchObject({
      ok: true,
      source: { host: "demo", label: "Demo Video", embedUrl: "https://player.example.org/v/42" },
    });
    expect(parseEmbedUrl(`https://youtu.be/${ID}`, [custom])).toMatchObject({
      ok: false,
      reason: "not-allowed",
    });
  });

  it("an empty list refuses everything", () => {
    expect(parseEmbedUrl(`https://youtu.be/${ID}`, [])).toMatchObject({
      ok: false,
      reason: "not-allowed",
    });
  });

  it("a parser that returns an address that is not https is refused", () => {
    const sneaky: KoenigEmbedHost = {
      id: "sneaky",
      label: "Sneaky",
      hostnames: ["sneaky.example.org"],
      parse: () => "javascript:alert(1)",
    };
    expect(parseEmbedUrl("https://sneaky.example.org/x", [sneaky])).toMatchObject({
      ok: false,
      reason: "unsafe",
    });
  });
});
