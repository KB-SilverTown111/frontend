import assert from 'node:assert/strict'
import test from 'node:test'

import helpScreen from '../src/prototype/data/help.js'
import { loadFlow, prototypeFlows } from '../src/prototype/prototypeFlows.js'
import { resolvePrototypeScreen } from '../src/prototype/resolvePrototypeScreen.js'

test('prototype manifest contains 109 flow screens plus help', async () => {
  const groups = await Promise.all(prototypeFlows.map(({ key }) => loadFlow(key)))

  assert.equal(groups.flat().length, 109)
  assert.equal(helpScreen.id, 'help')
})

test('prototype route keys and ids are unique', async () => {
  const groups = await Promise.all(prototypeFlows.map(({ key }) => loadFlow(key)))
  const keys = groups.flatMap((screens, index) =>
    screens.map((screen) => `${prototypeFlows[index].key}/${screen.id}`),
  )

  assert.equal(new Set(keys).size, 109)
})

test('resolver returns screen position and rejects unknown routes', async () => {
  const result = await resolvePrototypeScreen('onboarding', '1-01')

  assert.equal(result.screen.title, '시작하기')
  assert.equal(result.index, 0)
  assert.equal(await resolvePrototypeScreen('missing', '1-01'), null)
})
