import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('permissions step submits signup before completing the UI flow', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')
  const permissionsBranch = source.match(
    /if\s*\(id\s*===\s*'permissions'\)\s*\{([\s\S]*?)\n\s*\}\n\s*if\s*\(id\s*===\s*'complete'\)/,
  )?.[1]

  assert.ok(permissionsBranch)
  assert.match(permissionsBranch, /const result = await store\.submit\(\)/)
  assert.match(permissionsBranch, /if \(!result\.ok\)/)
  assert.ok(
    permissionsBranch.indexOf('store.submit()') < permissionsBranch.indexOf('store.finishUiFlow()'),
  )
})
