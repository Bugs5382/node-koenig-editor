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
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getRoot, $isElementNode } from "lexical";
import { useEffect } from "react";

import { $syncSpacing } from "./spacing";

// Keeps the spacing of each top-level block drawn: all of them when the editor starts, then the
// blocks an update changed.
export const SpacingPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor._parentEditor) return undefined;
    const sync = (keys?: string[]) =>
      editor.getEditorState().read(() => {
        const blocks = keys
          ? keys
              .map((key) => $getNodeByKey(key))
              .filter((node) => node?.getParent()?.getKey() === "root")
          : $getRoot().getChildren();
        for (const block of blocks) if ($isElementNode(block)) $syncSpacing(editor, block);
      });
    sync();
    return editor.registerUpdateListener(({ dirtyElements }) => {
      const keys = [...dirtyElements]
        .filter(([key, intentional]) => intentional && key !== "root")
        .map(([key]) => key);
      if (keys.length > 0) sync(keys);
    });
  }, [editor]);
  return null;
};

export default SpacingPlugin;
