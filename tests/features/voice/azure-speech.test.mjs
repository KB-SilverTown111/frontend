import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Azure speech invalidates a pending SDK load after stop', async () => {
  const source = await readFile(
    new URL('../../../src/features/voice/services/azureSpeech.js', import.meta.url),
    'utf8',
  )

  assert.match(source, /let speechGeneration = 0/)
  assert.match(source, /const generation = \+\+speechGeneration/)
  assert.match(source, /if \(generation !== speechGeneration\)/)
  assert.match(source, /speechGeneration \+= 1/)
})
