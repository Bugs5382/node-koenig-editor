// the ids a toggle group carries and the ids its item editors were built for
export const itemsMatch = (ids: string[], editors: Array<{id: string}>) => ids.length === editors.length && ids.every((id, i) => id === editors[i].id);
