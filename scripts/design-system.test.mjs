import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const viewSource = readFileSync(
  new URL('../src/views/DesignSystemView.vue', import.meta.url),
  'utf8',
)
const globalStyleSource = readFileSync(
  new URL('../src/styles/globals.css', import.meta.url),
  'utf8',
)
const cardSource = readFileSync(
  new URL('../src/components/ui/card/Card.vue', import.meta.url),
  'utf8',
)
const buttonSource = readFileSync(
  new URL('../src/components/ui/button/Button.vue', import.meta.url),
  'utf8',
)
const inputSource = readFileSync(
  new URL('../src/components/ui/input/Input.vue', import.meta.url),
  'utf8',
)

test('design system page documents the current senior-friendly foundation', () => {
  assert.match(viewSource, /DESIGN SYSTEM · SENIOR UI/)
  assert.match(viewSource, /Typography/)
  assert.match(viewSource, /Interaction/)
  assert.match(viewSource, /가입 진행 단계/)
})

test('shared design tokens expose the senior readability scale', () => {
  assert.match(globalStyleSource, /--card-border-width:\s*2px;/)
  assert.match(globalStyleSource, /--font-size-title:\s*30px;/)
  assert.match(globalStyleSource, /--font-size-body:\s*19px;/)
  assert.match(globalStyleSource, /--font-size-action:\s*24px;/)
  assert.match(globalStyleSource, /--font-size-display:\s*36px;/)
  assert.match(globalStyleSource, /--touch-target-min:\s*64px;/)
})

test('shadcn primitives use the updated card and touch-target defaults', () => {
  assert.match(cardSource, /border-2/)
  assert.match(buttonSource, /min-h-16/)
  assert.match(buttonSource, /text-\[length:var\(--font-size-action\)\]/)
  assert.match(inputSource, /min-h-16/)
  assert.match(inputSource, /border-2/)
})
