export const FONT_SCALE_STORAGE_KEY = 'gwipyeonhan-font-scale'

export const FONT_SCALE = Object.freeze({
  standard: 'standard',
  large: 'large',
})

export function normalizeFontScale(value) {
  return value === FONT_SCALE.large ? FONT_SCALE.large : FONT_SCALE.standard
}

function getStorage(storage) {
  if (storage !== undefined) return storage

  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readFontScale(storage) {
  const target = getStorage(storage)

  try {
    return normalizeFontScale(target?.getItem(FONT_SCALE_STORAGE_KEY))
  } catch {
    return FONT_SCALE.standard
  }
}

export function saveFontScale(value, storage) {
  const normalized = normalizeFontScale(value)
  const target = getStorage(storage)

  try {
    target?.setItem(FONT_SCALE_STORAGE_KEY, normalized)
  } catch {
    // Storage can be unavailable in private browsing or a restricted WebView.
  }

  return normalized
}

export function applyFontScale(value, root = globalThis.document?.documentElement) {
  const normalized = normalizeFontScale(value)

  if (root) root.dataset.fontScale = normalized

  return normalized
}
