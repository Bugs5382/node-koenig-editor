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
import { type FC, useContext, useMemo } from "react";
import { FileIcon, defaultStyles } from "react-file-icon";
import type { KoenigFileIcons } from "node-koenig-editor";

import KoenigComposerContext from "../../koenig-lexical/context/KoenigComposerContext";
import { fileExtension, resolveFileIcons } from "./fileIcons";

/** Whether the host's `fileIcons` option leaves icons on. */
export const useFileIconsEnabled = (): boolean => {
  const { fileIcons } = useContext(KoenigComposerContext) as { fileIcons?: KoenigFileIcons };
  return resolveFileIcons(fileIcons).enabled;
};

interface FileTypeIconProps {
  fileName: string;
}

// The picture for a file's type: the host's own for that extension, else react-file-icon's, which
// falls back to a plain page with the extension on it. It is decoration: the name sits beside it.
export const FileTypeIcon: FC<FileTypeIconProps> = ({ fileName }) => {
  const { fileIcons } = useContext(KoenigComposerContext) as { fileIcons?: KoenigFileIcons };
  const { enabled, overrides } = useMemo(() => resolveFileIcons(fileIcons), [fileIcons]);
  if (!enabled) return null;
  const extension = fileExtension(fileName);
  const Custom = overrides[extension];
  const styles = (defaultStyles as Record<string, object>)[extension] ?? {};
  return (
    <span
      aria-hidden="true"
      className="flex w-[3.2rem] shrink-0 items-center self-center px-1"
      data-kg-file-icon={extension || "generic"}
    >
      {Custom ? <Custom extension={extension} /> : <FileIcon extension={extension} {...styles} />}
    </span>
  );
};

export default FileTypeIcon;
