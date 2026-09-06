import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Android app theme colors are declared in the app resources', async () => {
  const colors = await readFile(
    new URL('../android/app/src/main/res/values/colors.xml', import.meta.url),
    'utf8',
  )

  assert.match(colors, /<color name="colorPrimary">#[0-9A-Fa-f]{6}<\/color>/)
  assert.match(colors, /<color name="colorPrimaryDark">#[0-9A-Fa-f]{6}<\/color>/)
  assert.match(colors, /<color name="colorAccent">#[0-9A-Fa-f]{6}<\/color>/)
})
