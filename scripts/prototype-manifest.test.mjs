import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import helpScreen from '../src/prototype/data/help.js'
import {
  getPrototypeStartRoute,
  loadFlow,
  prototypeFlows,
} from '../src/prototype/prototypeFlows.js'
import {
  buildPrototypeNavigation,
  resolvePrototypeScreen,
} from '../src/prototype/resolvePrototypeScreen.js'
import {
  stripGuidanceCards,
  stripProductionSelectionIndicators,
} from '../src/prototype/stripGuidanceCards.js'

const screenContentSource = readFileSync(
  new URL('../src/components/prototype/ScreenContent.vue', import.meta.url),
  'utf8',
)
const serviceRouteSource = readFileSync(
  new URL('../src/views/ServiceRouteView.vue', import.meta.url),
  'utf8',
)
const prototypeStyleSource = readFileSync(
  new URL('../src/styles/prototype.css', import.meta.url),
  'utf8',
)

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

test('navigation stays inside a flow and returns to the index at its boundaries', async () => {
  const screens = await loadFlow('onboarding')

  assert.deepEqual(buildPrototypeNavigation('onboarding', screens, 0), {
    previous: { name: 'prototype-index' },
    next: {
      name: 'prototype-screen',
      params: { flow: 'onboarding', screenId: '1-02' },
    },
  })
  assert.deepEqual(buildPrototypeNavigation('onboarding', screens, screens.length - 1).next, {
    name: 'prototype-index',
  })
})

test('flow start routes point to each configured first screen', () => {
  assert.deepEqual(getPrototypeStartRoute('bills'), {
    name: 'prototype-screen',
    params: { flow: 'bills', screenId: '3-01' },
  })
  assert.deepEqual(getPrototypeStartRoute('missing'), { name: 'prototype-index' })
})

test('prototype and production content remove guidance cards before rendering', () => {
  assert.match(screenContentSource, /stripGuidanceCards\(screen\.contentHtml\)/)
  assert.match(serviceRouteSource, /stripProductionSelectionIndicators\(screen\.contentHtml\)/)
  assert.equal(
    stripGuidanceCards('<div class="field">내용</div><div class="note"><b>안내</b> 설명</div>'),
    '<div class="field">내용</div>',
  )
  assert.equal(
    stripProductionSelectionIndicators(
      '<div class="choice active"><span>선택</span><i>✓</i></div>',
    ),
    '<div class="choice"><span>선택</span><i></i></div>',
  )
})

test('prototype choice cards stack one item per row', () => {
  const choicesBlock = prototypeStyleSource.match(
    /\.prototype-screen-content \.choices\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(choicesBlock, 'prototype choice groups should have a dedicated layout rule')
  assert.match(choicesBlock, /display:\s*grid;/)
  assert.match(choicesBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\);/)
})

test('prototype cards use a thicker visible border', () => {
  assert.match(
    prototypeStyleSource,
    /\.prototype-screen-content \.hero\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/,
  )
  assert.match(
    prototypeStyleSource,
    /\.prototype-screen-content \.field,[\s\S]*?\.prototype-screen-content \.note\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/,
  )
})

test('prototype choice cards keep a senior-friendly touch height', () => {
  assert.match(
    prototypeStyleSource,
    /\.prototype-screen-content \.choice\s*\{[\s\S]*?min-height:\s*72px;/,
  )
})
