import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  loadProductionScreen,
  productionServiceScreens,
} from '../../../src/features/service-screen/services/productionServiceScreens.js'
import {
  stripGuidanceCards,
  stripProductionSelectionIndicators,
} from '../../../src/features/service-screen/services/screenContent.js'

const routeSource = readFileSync(
  new URL('../../../src/features/service-screen/pages/ServiceScreenPage.vue', import.meta.url),
  'utf8',
)
const styleSource = readFileSync(
  new URL('../../../src/shared/styles/screen-content.css', import.meta.url),
  'utf8',
)

test('production screens load their bundled reference content', async () => {
  const expectedCounts = { transfer: 30, bills: 22, living: 25, voice: 8 }

  for (const [service, count] of Object.entries(expectedCounts)) {
    assert.equal(productionServiceScreens[service].length, count)
    const firstScreen = await loadProductionScreen(
      service,
      productionServiceScreens[service][0].screenKey,
    )
    assert.equal(firstScreen.service, service)
    assert.ok(firstScreen.title)
    assert.ok(firstScreen.contentHtml)
  }
})

test('production content removes guidance cards and onboarding-only selection indicators', () => {
  assert.match(routeSource, /stripProductionSelectionIndicators\(screen\.contentHtml\)/)
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

test('production screen content keeps senior-friendly card sizing', () => {
  const choicesBlock = styleSource.match(/\.screen-content \.choices\s*\{([\s\S]*?)\}/)?.[1]

  assert.ok(choicesBlock, 'screen choice groups should have a dedicated layout rule')
  assert.match(choicesBlock, /display:\s*grid;/)
  assert.match(choicesBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\);/)
  assert.match(
    styleSource,
    /\.screen-content \.hero\s*\{[\s\S]*?border:\s*2px solid var\(--border\);/,
  )
  assert.match(styleSource, /\.screen-content \.choice\s*\{[\s\S]*?min-height:\s*72px;/)
})
