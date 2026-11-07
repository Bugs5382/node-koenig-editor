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
/** How many photos a gallery takes when the host sets nothing. */
export const DEFAULT_GALLERY_MAX_IMAGES = 50;

/**
 * The most photos a stored gallery keeps, whatever limit the host sets. The host's limit is for
 * adding photos; it must never cut off photos a document already has, so the node's own ceiling
 * is far above it.
 */
export const GALLERY_NODE_IMAGE_CEILING = 500;

/** The host's `gallery.maxImages`, or the default when it is missing or not a positive whole number. */
export const resolveMaxImages = (value: unknown): number =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? Math.min(value, GALLERY_NODE_IMAGE_CEILING)
    : DEFAULT_GALLERY_MAX_IMAGES;

/** How many files are sent to the host's uploader at once. */
export const GALLERY_UPLOAD_CONCURRENCY = 3;
