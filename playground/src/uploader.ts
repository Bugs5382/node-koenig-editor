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
// A fake uploader: nothing leaves the browser. Files become object URLs, and the accepted types
// are checked the way a real host's uploader would check them.
import type { FileUploader } from "node-koenig-editor";
import { useCallback, useState } from "react";

const FILE_TYPES = {
  image: {
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  },
  file: { extensions: [], mimeTypes: [] },
  video: {
    extensions: [".mp4", ".webm", ".mov"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  audio: {
    extensions: [".mp3", ".wav", ".ogg", ".m4a"],
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
  },
};

export function isAccepted(type: string, file: File): boolean {
  const accepted = (FILE_TYPES as Record<string, { extensions: string[]; mimeTypes: string[] }>)[
    type
  ];
  if (!accepted || (!accepted.mimeTypes.length && !accepted.extensions.length)) return true;
  const name = file.name.toLowerCase();
  return (
    accepted.mimeTypes.includes(file.type) || accepted.extensions.some((e) => name.endsWith(e))
  );
}

export const fileUploader: FileUploader = {
  fileTypes: FILE_TYPES,
  useFileUpload: (type) => {
    const [errors, setErrors] = useState<{ filename?: string; message: string }[]>([]);
    const [isLoading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const upload = useCallback(
      async (files: File[] | FileList) => {
        const list = [...files];
        const rejected = list.filter((f) => !isAccepted(type, f));
        setErrors(
          rejected.map((f) => ({
            filename: f.name,
            message: `${f.name} is not an accepted ${type} type.`,
          })),
        );
        const accepted = list.filter((f) => isAccepted(type, f));
        if (!accepted.length) return null;
        setLoading(true);
        setProgress(50);
        await new Promise((resolve) => setTimeout(resolve, 300));
        setProgress(100);
        setLoading(false);
        return accepted.map((f) => ({ fileName: f.name, url: URL.createObjectURL(f) }));
      },
      [type],
    );
    return { errors, isLoading, progress, upload };
  },
};
