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

test('required consent detail guidance explains that agreement is required', async () => {
  const source = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')

  assert.match(
    source,
    /'mydata-consent': '필수 동의 항목이에요\. 동의해야 가입을 계속할 수 있어요\.'/,
  )
  assert.match(
    source,
    /'ai-voice-consent': '필수 동의 항목이에요\. 동의해야 음성 명령을 사용할 수 있어요\.'/,
  )
  assert.doesNotMatch(source, /'mydata-consent': '동의하지 않아도 송금은 쓸 수 있어요\.'/)
  assert.doesNotMatch(source, /'ai-voice-consent': '동의하지 않으면 화면 단추로만 쓰게 돼요\.'/)
})

test('onboarding shell does not render question-mark help controls', async () => {
  const shell = await readFile(
    new URL('../src/components/onboarding/OnboardingShell.vue', import.meta.url),
    'utf8',
  )
  const view = await readFile(new URL('../src/views/OnboardingView.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(shell, /aria-label="도움말"/)
  assert.doesNotMatch(shell, /<span>\?<\/span>도움/)
  assert.doesNotMatch(view, /:show-help=/)
})
