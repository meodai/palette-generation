/** Colours each slide has asked to have inspected, by slide id. */
const entries = new Map();

export function registerColors(slideId, colors, model) {
  entries.set(slideId, { colors, model });
}

export function getColors(slideId) {
  return entries.get(slideId) ?? null;
}
