import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FONT_SCALE,
  applyFontScale,
  normalizeFontScale,
  readFontScale,
  saveFontScale,
} from '../../src/shared/services/fontScale.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
}

test('font scale accepts only standard and large values', () => {
  assert.equal(normalizeFontScale(FONT_SCALE.large), FONT_SCALE.large)
  assert.equal(normalizeFontScale('unknown'), FONT_SCALE.standard)
})

test('font scale persists the login selection for later screens', () => {
  const storage = createStorage()

  assert.equal(saveFontScale(FONT_SCALE.large, storage), FONT_SCALE.large)
  assert.equal(readFontScale(storage), FONT_SCALE.large)
})

test('font scale applies a data attribute to the document root', () => {
  const root = { dataset: {} }

  assert.equal(applyFontScale(FONT_SCALE.large, root), FONT_SCALE.large)
  assert.equal(root.dataset.fontScale, FONT_SCALE.large)
})
