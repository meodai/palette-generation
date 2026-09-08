/** Colors each slide has asked to have inspected, by slide id. */
const entries = new Map();

/** Fired on document whenever a slide (re)registers — the inspector listens. */
export const COLORS_EVENT = 'colors-registered';

export function registerColors(slideId, colors, model) {
  entries.set(slideId, { colors, model });
  document.dispatchEvent(new CustomEvent(COLORS_EVENT, { detail: { slideId } }));
}

export function getColors(slideId) {
  return entries.get(slideId) ?? null;
}
