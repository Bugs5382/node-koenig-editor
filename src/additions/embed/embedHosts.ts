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

/** One video site the embed card may play. The host app supplies the list (`embedHosts`). */
export interface KoenigEmbedHost {
  /** A short stable id, saved nowhere: `youtube`. */
  id: string;
  /** The name people see: `YouTube`. */
  label: string;
  /** The hostnames a link to this site may have, lowercase and without a port. Matched exactly. */
  hostnames: readonly string[];
  /** Twitch-style players refuse to load without the page's domain: set this and the card refuses
   *  a link until the host app gives `embedParent`. */
  needsParent?: boolean;
  /** Turns a link on one of `hostnames` into the address of the host's player (https), or `null`
   *  when the link is not a video. `parent` is `embedParent`; the card never calls the network. */
  parse: (url: URL, context: { parent: string }) => string | null;
}

/** What a good link becomes. */
export interface KoenigEmbedSource {
  /** The id of the host that accepted the link. */
  host: string;
  /** That host's name for people. */
  label: string;
  /** The address the iframe loads, after the reader presses play. */
  embedUrl: string;
}

export type KoenigEmbedRefusal =
  /** Nothing was typed. */
  | "empty"
  /** Not an absolute web address. */
  | "invalid"
  /** Not https, protocol-relative, a script or data address, with a password, or with stray characters. */
  | "unsafe"
  /** A fine address on a site that is not on the host's list. */
  | "not-allowed"
  /** On the list, but not a link to a video. */
  | "not-a-video"
  /** Twitch needs `embedParent` and the host app gave none. */
  | "needs-parent";

export type KoenigEmbedResult =
  | { ok: true; source: KoenigEmbedSource }
  | { ok: false; reason: KoenigEmbedRefusal };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{6,20}$/;
const TWITCH_CHANNEL = /^[A-Za-z0-9_]{1,25}$/;
const TWITCH_VIDEO = /^\d{1,12}$/;
const TWITCH_CLIP = /^[A-Za-z0-9_-]{1,80}$/;
const TWITCH_RESERVED = new Set([
  "directory",
  "downloads",
  "friends",
  "inventory",
  "jobs",
  "p",
  "popout",
  "settings",
  "store",
  "subscriptions",
  "turbo",
  "videos",
  "wallet",
]);

const segments = (url: URL): string[] => url.pathname.split("/").filter((part) => part !== "");

const seconds = (value: string | null): string | null => {
  const match = value === null ? null : /^(\d{1,6})s?$/.exec(value);
  return match ? (match[1] as string) : null;
};

const youtube: KoenigEmbedHost = {
  id: "youtube",
  label: "YouTube",
  hostnames: [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtube-nocookie.com",
  ],
  parse: (url) => {
    const parts = segments(url);
    let id: string | undefined;
    if (url.hostname === "youtu.be") {
      if (parts.length === 1) id = parts[0];
    } else if (parts[0] === "watch" && parts.length === 1) {
      id = url.searchParams.get("v") ?? undefined;
    } else if ((parts[0] === "embed" || parts[0] === "shorts") && parts.length === 2) {
      id = parts[1];
    }
    if (!id || !YOUTUBE_ID.test(id)) return null;
    // the privacy-enhanced domain sets no cookies until the video is played
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    embed.searchParams.set("rel", "0");
    const start = seconds(url.searchParams.get("t") ?? url.searchParams.get("start"));
    if (start) embed.searchParams.set("start", start);
    embed.searchParams.set("autoplay", "1");
    return embed.toString();
  },
};

const vimeo: KoenigEmbedHost = {
  id: "vimeo",
  label: "Vimeo",
  hostnames: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
  parse: (url) => {
    const parts = segments(url);
    let id: string | undefined;
    let hash: string | null = null;
    if (url.hostname === "player.vimeo.com") {
      if (parts[0] === "video" && parts.length === 2) {
        id = parts[1];
        hash = url.searchParams.get("h");
      }
    } else if (parts.length === 1 || parts.length === 2) {
      id = parts[0];
      hash = parts[1] ?? null;
    }
    if (!id || !VIMEO_ID.test(id)) return null;
    if (hash !== null && !VIMEO_HASH.test(hash)) return null;
    const embed = new URL(`https://player.vimeo.com/video/${id}`);
    if (hash) embed.searchParams.set("h", hash);
    // do not track: Vimeo sets no tracking cookies for the viewer
    embed.searchParams.set("dnt", "1");
    embed.searchParams.set("autoplay", "1");
    return embed.toString();
  },
};

const twitch: KoenigEmbedHost = {
  id: "twitch",
  label: "Twitch",
  hostnames: ["twitch.tv", "www.twitch.tv", "m.twitch.tv", "clips.twitch.tv"],
  needsParent: true,
  parse: (url, { parent }) => {
    const parts = segments(url);
    const clip = (slug: string | undefined) => {
      if (!slug || !TWITCH_CLIP.test(slug)) return null;
      const embed = new URL("https://clips.twitch.tv/embed");
      embed.searchParams.set("clip", slug);
      embed.searchParams.set("parent", parent);
      embed.searchParams.set("autoplay", "true");
      return embed.toString();
    };
    const player = (key: "channel" | "video", value: string) => {
      const embed = new URL("https://player.twitch.tv/");
      embed.searchParams.set(key, value);
      embed.searchParams.set("parent", parent);
      embed.searchParams.set("autoplay", "true");
      return embed.toString();
    };
    if (url.hostname === "clips.twitch.tv") {
      if (parts.length === 1) return clip(parts[0]);
      return parts.length === 2 && parts[0] === "embed"
        ? clip(url.searchParams.get("clip") ?? undefined)
        : null;
    }
    if (parts[0] === "videos" && parts.length === 2) {
      return TWITCH_VIDEO.test(parts[1] as string) ? player("video", parts[1] as string) : null;
    }
    if (parts.length === 3 && parts[1] === "clip" && TWITCH_CHANNEL.test(parts[0] as string)) {
      return clip(parts[2]);
    }
    if (
      parts.length === 1 &&
      TWITCH_CHANNEL.test(parts[0] as string) &&
      !TWITCH_RESERVED.has((parts[0] as string).toLowerCase())
    ) {
      return player("channel", parts[0] as string);
    }
    return null;
  },
};

/** The three hosts the embed card knows when the host app gives no `embedHosts`. */
export const DEFAULT_EMBED_HOSTS: readonly KoenigEmbedHost[] = [youtube, vimeo, twitch];

// Control characters and spaces can hide a scheme from a plain prefix check ("java\tscript:").
// eslint-disable-next-line no-control-regex
const STRAY = /[\u0000-\u001f\u007f\s]/;

/**
 * Turns what an author typed into a player address, or says why not. It is plain string work:
 * the address must be an https link on a host the list names, with no password, and the host's
 * own parser must recognise a video in it. Nothing here touches the network.
 */
export const parseEmbedUrl = (
  input: string,
  hosts: readonly KoenigEmbedHost[] = DEFAULT_EMBED_HOSTS,
  options: { parent?: string } = {},
): KoenigEmbedResult => {
  const text = typeof input === "string" ? input.trim() : "";
  if (text === "") return { ok: false, reason: "empty" };
  if (STRAY.test(text) || text.startsWith("//")) return { ok: false, reason: "unsafe" };
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(text);
  if (!scheme) return { ok: false, reason: "invalid" };
  if (scheme[1]!.toLowerCase() !== "https") return { ok: false, reason: "unsafe" };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.username !== "" || url.password !== "" || url.port !== "") {
    return { ok: false, reason: "unsafe" };
  }
  const host = hosts.find((entry) => entry.hostnames.includes(url.hostname));
  if (!host) return { ok: false, reason: "not-allowed" };
  const parent = options.parent ?? "";
  if (host.needsParent && parent === "") return { ok: false, reason: "needs-parent" };
  const embedUrl = host.parse(url, { parent });
  if (embedUrl === null) return { ok: false, reason: "not-a-video" };
  // what a host's parser hands back is checked too: an https address, nothing else
  try {
    const player = new URL(embedUrl);
    if (player.protocol !== "https:" || player.username !== "" || player.password !== "") {
      return { ok: false, reason: "unsafe" };
    }
  } catch {
    return { ok: false, reason: "unsafe" };
  }
  return { ok: true, source: { host: host.id, label: host.label, embedUrl } };
};
