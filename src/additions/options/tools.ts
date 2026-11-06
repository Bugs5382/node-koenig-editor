import type { KoenigTool } from "node-koenig-editor";
import { createContext, useContext } from "react";

/** The features that are not cards, so `cards` cannot switch them off. */
export const KOENIG_TOOLS: readonly KoenigTool[] = ["imageEditor", "emojiPicker"];

/** The composer's `tools`: every tool when the host gives none, only the listed ones otherwise. */
export const resolveTools = (tools?: readonly KoenigTool[]): ReadonlySet<KoenigTool> =>
  new Set(tools ?? KOENIG_TOOLS);

export const KoenigToolsContext = createContext<ReadonlySet<KoenigTool>>(resolveTools());

/** Whether `tool` is on for the composer this component sits in. */
export const useKoenigTool = (tool: KoenigTool): boolean => useContext(KoenigToolsContext).has(tool);
