import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { routes } from '../src/router/routes.js'
import {
  getProductionActionRoutes,
  loadProductionScreen,
  productionServiceScreens,
  resolveProductionScreen,
} from '../src/services/productionServiceScreens.js'
import {
  mobileBranchSchedule,
  mobileBranchDocuments,
  mobileBranchServices,
} from '../src/services/mobileBranchPresentation.js'

const serviceHomeSource = readFileSync(
  new URL('../src/views/ServiceHomeView.vue', import.meta.url),
  'utf8',
)
const transferHomeSource = readFileSync(
  new URL('../src/views/TransferHomeView.vue', import.meta.url),
  'utf8',
)
const routeViewSource = readFileSync(
  new URL('../src/views/ServiceRouteView.vue', import.meta.url),
  'utf8',
)
const transferFlowPanelSource = readFileSync(
  new URL('../src/components/patterns/TransferFlowPanel.vue', import.meta.url),
  'utf8',
)
const mobileBranchPresentationSource = readFileSync(
  new URL('../src/services/mobileBranchPresentation.js', import.meta.url),
  'utf8',
)
const serviceStyleSource = readFileSync(
  new URL('../src/styles/transfer.css', import.meta.url),
  'utf8',
)

const expectedScreenCounts = {
  transfer: 30,
  bills: 22,
  living: 25,
  voice: 8,
}

test('production routes cover every non-home service screen', () => {
  for (const [service, expectedCount] of Object.entries(expectedScreenCounts)) {
    assert.equal(productionServiceScreens[service].length, expectedCount)

    const route = routes.find(({ name }) => name === `${service}-screen`)
    assert.equal(route?.path, `/${service}/:screenId`)
    assert.equal(typeof route?.component, 'function')
    assert.equal(typeof route?.beforeEnter, 'function')
  }
})

test('production screen resolver accepts known IDs and rejects unknown IDs', () => {
  assert.equal(resolveProductionScreen('transfer', '2-05')?.screenId, '2-05')
  assert.equal(resolveProductionScreen('bills', '3-02A')?.screenId, '3-02A')
  assert.equal(resolveProductionScreen('living', '4-10')?.screenId, '4-10')
  assert.equal(resolveProductionScreen('voice', '5-08')?.screenId, '5-08')
  assert.equal(resolveProductionScreen('transfer', 'missing'), null)
})

test('production screen data includes the reference UI content', async () => {
  const billsScreen = await loadProductionScreen('bills', '3-02A')
  const voiceScreen = await loadProductionScreen('voice', '5-02')

  assert.equal(billsScreen?.title, '고지서를 비춰 주세요')
  assert.match(billsScreen?.contentHtml ?? '', /viewfinder/)
  assert.equal(voiceScreen?.title, '미리 듣기')
  assert.match(voiceScreen?.contentHtml ?? '', /class="voice"/)
})

test('production action routes follow the service flow instead of raw screen order', () => {
  assert.deepEqual(getProductionActionRoutes('transfer', '2-05').primary, {
    name: 'transfer-screen',
    params: { screenId: '2-07' },
  })
  assert.deepEqual(getProductionActionRoutes('transfer', '2-18').secondary, {
    name: 'transfer-screen',
    params: { screenId: '2-05' },
  })
  assert.deepEqual(getProductionActionRoutes('bills', '3-02A').primary, {
    name: 'bills-screen',
    params: { screenId: '3-03' },
  })
  assert.deepEqual(getProductionActionRoutes('living', '4-05').primary, {
    name: 'onboarding',
    params: { stepId: 'login' },
  })
  assert.deepEqual(getProductionActionRoutes('living', '4-13').primary, {
    name: 'my-page',
  })
  assert.deepEqual(getProductionActionRoutes('living', '4-22').primary, {
    name: 'my-page',
  })
  assert.deepEqual(getProductionActionRoutes('voice', '5-01').primary, {
    name: 'my-page-voice',
    params: { screenId: '5-02' },
  })
  assert.deepEqual(getProductionActionRoutes('voice', '5-02').primary, {
    name: 'my-page',
  })
  assert.deepEqual(getProductionActionRoutes('voice', '5-08').primary, {
    name: 'transfer-screen',
    params: { screenId: '2-02' },
  })
})

test('voice selection screens reject legacy routes and allow only the my page flow', () => {
  const voiceRoute = routes.find(({ name }) => name === 'voice-screen')
  const livingRoute = routes.find(({ name }) => name === 'living-screen')
  const myPageVoiceRoute = routes.find(({ name }) => name === 'my-page-voice')

  assert.deepEqual(
    voiceRoute?.beforeEnter?.(
      { params: { screenId: '5-01' } },
      { name: 'living-screen', params: { screenId: '4-13' } },
    ),
    { name: 'my-page' },
  )
  assert.deepEqual(
    livingRoute?.beforeEnter?.({ params: { screenId: '4-13' } }, { name: 'living-home' }),
    { name: 'my-page' },
  )
  assert.deepEqual(
    voiceRoute?.beforeEnter?.(
      { params: { screenId: '5-02' } },
      { name: 'voice-screen', params: { screenId: '5-01' } },
    ),
    { name: 'my-page' },
  )
  assert.equal(
    myPageVoiceRoute?.beforeEnter?.({ params: { screenId: '5-01' } }, { name: 'my-page' }),
    true,
  )
  assert.equal(
    myPageVoiceRoute?.beforeEnter?.(
      { params: { screenId: '5-02' } },
      { name: 'my-page-voice', params: { screenId: '5-01' } },
    ),
    true,
  )
})

test('home actions point to production detail routes', () => {
  assert.match(transferHomeSource, /transfer-screen/)
  assert.match(transferHomeSource, /screenId: '2-02'/)
  assert.match(transferHomeSource, /router\.push\(\{ name: 'transfer-screen'/)
  assert.match(transferHomeSource, /bills-home/)
  assert.match(serviceHomeSource, /bills-screen/)
  assert.match(serviceHomeSource, /living-screen/)
  assert.match(serviceHomeSource, /voice-screen/)
})

test('production route screen does not use prototype-only components', () => {
  assert.doesNotMatch(
    routeViewSource,
    /Prototype(Index|Help|Screen)View|MobileScreenShell|ScreenContent/,
  )
  assert.match(
    routeViewSource,
    /v-html="stripProductionSelectionIndicators\(screen\.contentHtml\)"/,
  )
  assert.match(routeViewSource, /service-route-screen-content/)
  assert.match(routeViewSource, /getProductionActionRoutes/)
})

test('production route actions use the shared footer layout', () => {
  assert.match(
    routeViewSource,
    /<footer(?=[^>]*\bclass="app-actions service-route-actions")(?=[^>]*\bv-if="[^"]*screen\s*&&\s*!hideScreenActions)[^>]*>/,
  )
})

test('production bill route captures an image and binds it to a BILL_PAYMENT session for OCR', () => {
  assert.match(routeViewSource, /takeBillPhoto\(source\)/)
  assert.match(routeViewSource, /photoToBlob\(photo\)/)
  assert.match(routeViewSource, /startSession\('BILL_PAYMENT'\)/)
  assert.match(routeViewSource, /billStore\.upload\(\{\s*image,\s*voiceSessionId,\s*\}\)/)
  assert.match(routeViewSource, /await billStore\.upload\([\s\S]*?screenId: '3-04'/)
})

test('bill source selection uses action buttons and removes the duplicate footer capture action', async () => {
  const screen = await loadProductionScreen('bills', '3-02')

  assert.equal(screen?.primaryLabel, '')
  assert.match(routeViewSource, /const isBillSourceSelection = computed/)
  assert.match(routeViewSource, /v-if="screen\s*&&\s*isBillSourceSelection/)
  assert.match(
    routeViewSource,
    /<button[\s\S]*?class="choice"[\s\S]*?@click="go\(primaryRoute\)"[\s\S]*?>\s*카메라 촬영\s*<\/button>/,
  )
  assert.match(
    routeViewSource,
    /<button[\s\S]*?class="choice"[\s\S]*?@click="uploadBill\('gallery'\)"[\s\S]*?>\s*앨범에서 선택\s*<\/button>/,
  )
  assert.match(routeViewSource, /!hideScreenActions\s*&&\s*!isBillSourceSelection/)
})

test('bill camera screen renders a live preview and captures the current frame for OCR', () => {
  assert.match(routeViewSource, /getUserMedia/)
  assert.match(routeViewSource, /ref="billCameraVideo"/)
  assert.match(routeViewSource, /playsinline/)
  assert.match(routeViewSource, /captureVideoFrame\(billCameraVideo/)
  assert.match(routeViewSource, /return captureBillFrame\(\)/)
  assert.match(routeViewSource, /!isBillCameraScreen/)
})

test('bill camera screen swaps the video for a placeholder and captured preview by state', () => {
  assert.match(routeViewSource, /v-show="billCameraReady && !billCameraPreviewUrl"/)
  assert.match(routeViewSource, /v-if="billCameraPreviewUrl"/)
  assert.match(routeViewSource, /class="bill-camera-placeholder"/)
  assert.match(routeViewSource, /class="bill-camera-preview"/)
  assert.match(routeViewSource, /촬영한 고지서 미리보기/)
  assert.match(routeViewSource, /사진을 확인하고 있어요\./)
  assert.match(routeViewSource, /revokeObjectURL\(/)
})

test('production transfer route requires candidate selection and prepares only supported transfer data', () => {
  assert.match(routeViewSource, /v-model="recipientKeyword"/)
  assert.match(routeViewSource, /@input="clearRecipientCandidates"/)
  assert.match(routeViewSource, /recipientKeyword\.value\.trim\(\)/)
  assert.match(routeViewSource, /findRecipients\(\{\s*keyword,/)
  assert.match(routeViewSource, /transferStore\.selectRecipient/)
  assert.match(routeViewSource, /transferStore\.selectAccount/)
  assert.match(
    routeViewSource,
    /transferStore\.prepare\(\{[\s\S]*fromAccountId:[\s\S]*recipientId:[\s\S]*amount:/,
  )
  assert.match(routeViewSource, /v-if="service === 'transfer' && screenId === '2-07'"/)
  assert.match(routeViewSource, /v-model="transferAmountInput"/)
  assert.match(routeViewSource, /recognizedAmount: transferAmount/)
  assert.match(routeViewSource, /amountCandidates: \[transferAmount\]/)
  assert.match(routeViewSource, /amount: confirmedAmount/)
  assert.doesNotMatch(routeViewSource, /recognizedAmount: 50000|amountCandidates: \[50000\]/)
  assert.match(
    routeViewSource,
    /await go\(\{ name: 'transfer-screen', params: \{ screenId: '2-18' \} \}\)/,
  )
  assert.match(
    routeViewSource,
    /await go\(\{ name: 'transfer-screen', params: \{ screenId: '2-08' \} \}\)/,
  )
  assert.doesNotMatch(routeViewSource, /guardian-verifications|requestGuardianVerification/)
})

test('transfer confirmation renders the prepared recipient, amount, and masked account instead of prototype data', () => {
  assert.match(routeViewSource, /transferSummaryRows/)
  assert.match(routeViewSource, /recipient\.accountNumberMasked/)
  assert.match(routeViewSource, /formatCurrency\(transferStore\.amount\)/)
  assert.match(routeViewSource, /account\.accountNumberMasked/)
  assert.match(
    routeViewSource,
    /screen\?\.contentHtml[\s\S]*service === 'transfer' && screenId === '2-08'[\s\S]*!hideScreenActions/,
  )
})

test('transfer entry clears stale state and a direct final-confirmation URL is blocked without a transfer', () => {
  assert.match(
    routeViewSource,
    /currentService === 'transfer' && currentScreenId === '2-02'[\s\S]*transferStore\.reset\(\)[\s\S]*recipientKeyword\.value = ''/,
  )
  assert.match(
    routeViewSource,
    /service\.value === 'transfer' && screenId\.value === '2-08' && !transferStore\.transferId[\s\S]*?actionError\.value = '송금 정보를 다시 확인해 주세요\.'/,
  )
  assert.match(
    routeViewSource,
    /service\.value === 'transfer' && screenId\.value === '2-09' && !transferStore\.transferId[\s\S]*?actionError\.value = '송금 정보를 다시 확인해 주세요\.'/,
  )
})

test('active reminder queries use the supported SCHEDULED status', () => {
  assert.match(serviceHomeSource, /loadReminders\(\{ status: 'SCHEDULED' \}\)/)
  assert.match(routeViewSource, /loadReminders\(\{ status: 'SCHEDULED' \}\)/)
})

test('reminder routes render server-backed list states and a retry action', () => {
  assert.match(routeViewSource, /const isReminderListScreen = computed/)
  assert.match(routeViewSource, /serviceData\.loading\.reminders/)
  assert.match(routeViewSource, /serviceData\.errors\.reminders/)
  assert.match(routeViewSource, /!serviceData\.reminders\.length/)
  assert.match(routeViewSource, /reloadReminders/)
  assert.match(routeViewSource, /reminder\.title/)
  assert.match(routeViewSource, /formatReminderDateTime\(reminder\.scheduledAt\)/)
  assert.match(routeViewSource, /reminderStatusLabel\(reminder\.status\)/)
  assert.match(routeViewSource, /role="alert"/)
  assert.match(routeViewSource, /query: \{ reminderId \}/)
  assert.doesNotMatch(routeViewSource, /전기요금 납부 알림/)
  assert.match(routeViewSource, /!isReminderScreen/)
})

test('reminder create and edit forms validate fields and use the CRUD store actions', () => {
  assert.match(routeViewSource, /v-model="reminderTitle"/)
  assert.match(routeViewSource, /v-model="reminderDate"/)
  assert.match(routeViewSource, /v-model="reminderTime"/)
  assert.match(routeViewSource, /!reminderDate\.value \|\| !reminderTime\.value/)
  assert.match(routeViewSource, /Date\.now\(\)/)
  assert.match(routeViewSource, /serviceData\.createReminder/)
  assert.match(routeViewSource, /serviceData\.updateReminder/)
  assert.match(routeViewSource, /serviceData\.loading\.reminders/)
  assert.match(routeViewSource, /route\.query\.reminderId/)
})

test('reminder cancel uses an accessible confirmation dialog and does not navigate on failure', () => {
  const cancelSource = routeViewSource.slice(
    routeViewSource.indexOf('async function confirmReminderCancel'),
    routeViewSource.indexOf('async function handlePrimary'),
  )

  assert.match(routeViewSource, /role="dialog"/)
  assert.match(routeViewSource, /aria-modal="true"/)
  assert.match(routeViewSource, /showReminderCancelConfirm/)
  assert.match(cancelSource, /serviceData\.cancelReminder/)
  assert.match(cancelSource, /catch \(error\)/)
  assert.match(cancelSource, /reminderMutationMessage\('cancel', error\)/)
  assert.match(cancelSource, /try \{[\s\S]*?await go\(\{ name: 'living-screen'/)
  assert.match(routeViewSource, /알림 취소/)
})

test('transfer risk clearance skips rescoring after a safe risk check', () => {
  assert.match(routeViewSource, /if \(!transferStore\.riskCleared\)/)
  assert.match(routeViewSource, /transferStore\.isRiskHeld\(risk\)[\s\S]*screenId: '2-10'/)
  assert.match(routeViewSource, /warningText[\s\S]*risk\?\.warning/)
  assert.match(routeViewSource, /confirmationCompleted/)
  assert.match(routeViewSource, /authenticationCompleted/)
  assert.match(routeViewSource, /추가 확인이 필요해 송금을 진행할 수 없어요\./)
})

test('transfer failure screen renders runtime failure details instead of an empty result state', () => {
  assert.match(
    transferFlowPanelSource,
    /const showFailure = computed\(\(\) => props\.screenId === '2-23'\)/,
  )
  assert.match(transferFlowPanelSource, /transferStore\.error\?\.message/)
  assert.match(transferFlowPanelSource, /transferStore\.amount/)
  assert.match(transferFlowPanelSource, /송금을 처리하지 못했어요/)
})

test('transfer failure screen does not repeat the same error announcement', () => {
  assert.match(transferFlowPanelSource, /v-if="transferStore\.error && !showFailure"/)
})

test('bill home reads the backend monthly totalCount field before legacy fallbacks', () => {
  assert.match(serviceHomeSource, /monthlySummary\.totalCount \?\? monthlySummary\.billCount/)
})

test('production screens hide technical screen identifiers from users', () => {
  assert.doesNotMatch(routeViewSource, /service-route-kicker/)
  assert.doesNotMatch(routeViewSource, /\{\{ screenId \}\}/)
  assert.match(routeViewSource, /screen\?\.title \|\| '서비스 화면'/)
})

test('production choice groups stack one item per row for senior readability', () => {
  const singleColumnBlock = serviceStyleSource.match(
    /\.service-route-screen-content \.choices,\s*\.transfer-device \.transfer-choice-grid,\s*\.service-home-device \.service-choice-grid\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(singleColumnBlock, 'production choice groups should have a dedicated layout rule')
  assert.match(singleColumnBlock, /display:\s*grid;/)
  assert.match(singleColumnBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\);/)

  const choiceBlock = serviceStyleSource.match(
    /\.transfer-device \.transfer-choice,\s*\.service-home-device \.service-choice,\s*\.service-route-screen-content \.choice\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(choiceBlock, 'production choice cards should have a shared touch target rule')
  assert.match(choiceBlock, /min-height:\s*76px;/)
  assert.match(choiceBlock, /padding:\s*18px;/)
})

test('transfer account selection exposes loading, empty, error, and retry states', () => {
  assert.match(
    routeViewSource,
    /v-if="service === 'transfer' && screenId === '2-18'"[\s\S]*serviceData\.loading\.accounts/,
  )
  assert.match(routeViewSource, /serviceData\.errors\.accounts/)
  assert.match(routeViewSource, /reloadTransferAccounts/)
  assert.match(routeViewSource, /등록된 계좌가 없어요\./)
})

test('production buttons use senior-readable size and weight', () => {
  const buttonBlock = serviceStyleSource.match(
    /\.transfer-device button,\s*\.service-home-device button,\s*\.service-route-device button\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(buttonBlock, 'production buttons should have a dedicated readability rule')
  assert.match(buttonBlock, /font-size:\s*var\(--font-size-action\);/)
  assert.match(buttonBlock, /font-weight:\s*800;/)
})

test('production headings and amount emphasis keep the approved senior scale', () => {
  const headingBlock = serviceStyleSource.match(
    /\.transfer-heading h1,\s*\.service-home-heading h1,\s*\.service-route-heading h1\s*\{([\s\S]*?)\}/,
  )?.[1]

  assert.ok(headingBlock, 'production headings should have a shared type scale rule')
  assert.match(headingBlock, /font-size:\s*var\(--font-size-title\);/)
  assert.match(
    serviceStyleSource,
    /\.service-route-screen-content \.amount strong\s*\{[\s\S]*?font-size:\s*var\(--font-size-display\);/,
  )
})

test('production supporting text stays readable beside the large action labels', () => {
  assert.match(serviceStyleSource, /\.transfer-balance-content h2\s*\{[\s\S]*?font-size:\s*22px;/)
  assert.match(
    serviceStyleSource,
    /\.transfer-balance-content p\s*\{[\s\S]*?font-size:\s*var\(--font-size-body\);/,
  )
  assert.match(
    serviceStyleSource,
    /\.service-route-input-field\s*\{[\s\S]*?font-size:\s*var\(--font-size-body\);/,
  )
  assert.match(
    serviceStyleSource,
    /\.service-route-error,[\s\S]*?\.service-home-data-error\s*\{[\s\S]*?font-size:\s*16px;/,
  )
})

test('mobile branch screen loads nearby data, renders card fields, and guards direct detail entry', () => {
  assert.match(routeViewSource, /getCurrentLocation/)
  assert.match(routeViewSource, /loadMobileBranches/)
  assert.match(routeViewSource, /mobileBranches/)
  assert.match(routeViewSource, /mobileBranchServices/)
  assert.match(routeViewSource, /mobileBranchDocuments/)
  assert.match(routeViewSource, /mobileBranchDistance/)
  assert.match(mobileBranchPresentationSource, /availableServices/)
  assert.match(mobileBranchPresentationSource, /requiredDocuments/)
  assert.match(mobileBranchPresentationSource, /distanceMeters/)
  assert.match(mobileBranchPresentationSource, /visitTime/)
  assert.match(routeViewSource, /mobileBranchLocationLoading/)
  assert.match(routeViewSource, /mobileBranchPrimaryDisabled/)
  assert.match(routeViewSource, /:disabled="isBusy \|\| mobileBranchPrimaryDisabled"/)
  const loadScreenSource = routeViewSource.slice(
    routeViewSource.indexOf('async function loadScreen()'),
    routeViewSource.indexOf('async function go('),
  )

  assert.match(
    loadScreenSource,
    /service\.value === 'living'[\s\S]*?screenId\.value === '4-11'[\s\S]*?!serviceData\.mobileBranches\.length[\s\S]*?await go\(\{\s*name: 'living-screen',\s*params: \{ screenId: '4-10' \} \}\)[\s\S]*?screen\.value = nextScreen/,
  )
})

test('mobile branch presentation renders the three agreed MVP data shapes', () => {
  const branches = [
    {
      branchId: 'mobile-1',
      name: 'KB 이동점포 강남 데모 1호',
      address: '서울특별시 강남구 테헤란로 152',
      visitDate: '2026-09-08',
      visitTime: '10:00~16:00',
      availableServices: ['입출금·통장 업무', '금융 상담'],
      requiredDocuments: ['신분증'],
    },
    {
      branchId: 'mobile-2',
      name: 'KB 이동점포 송파 데모 2호',
      address: '서울특별시 송파구 올림픽로 300',
      visitDate: '2026-09-09',
      visitTime: '10:00~16:00',
      availableServices: ['계좌 조회·통장 업무', '카드 관련 상담'],
      requiredDocuments: ['신분증'],
    },
    {
      branchId: 'mobile-3',
      name: 'KB 이동점포 마포 데모 3호',
      address: '서울특별시 마포구 월드컵로 240',
      visitDate: '2026-09-10',
      visitTime: '10:00~16:00',
      availableServices: ['금융 상담', '대출 상담'],
      requiredDocuments: ['신분증', '상담 관련 서류'],
    },
  ]

  assert.match(mobileBranchSchedule(branches[0]), /9월 8일/)
  assert.match(mobileBranchSchedule(branches[0]), /10:00~16:00/)
  assert.match(mobileBranchSchedule(branches[1]), /9월 9일/)
  assert.match(mobileBranchSchedule(branches[2]), /9월 10일/)
  assert.deepEqual(mobileBranchServices(branches[0]), ['입출금·통장 업무', '금융 상담'])
  assert.deepEqual(mobileBranchServices(branches[1]), ['계좌 조회·통장 업무', '카드 관련 상담'])
  assert.deepEqual(mobileBranchServices(branches[2]), ['금융 상담', '대출 상담'])
  assert.deepEqual(mobileBranchDocuments(branches[0]), ['신분증'])
  assert.deepEqual(mobileBranchDocuments(branches[1]), ['신분증'])
  assert.deepEqual(mobileBranchDocuments(branches[2]), ['신분증', '상담 관련 서류'])
})
