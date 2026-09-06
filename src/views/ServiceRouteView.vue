<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getProductionActionRoutes,
  getProductionHomeRoute,
  loadProductionScreen,
} from '@/services/productionServiceScreens.js'
import {
  getContactCandidates,
  getCurrentLocation,
  photoToBlob,
  takeBillPhoto,
} from '@/services/nativeCapabilities.js'
import { useBillStore } from '@/stores/bill.js'
import { useServiceDataStore } from '@/stores/serviceData.js'
import { useTransferStore } from '@/stores/transfer.js'
import { useVoiceStore } from '@/stores/voice.js'
import VoiceConversationPanel from '@/components/patterns/VoiceConversationPanel.vue'

const route = useRoute()
const router = useRouter()
const serviceData = useServiceDataStore()
const transferStore = useTransferStore()
const billStore = useBillStore()
const voiceStore = useVoiceStore()

const service = computed(() => String(route.meta.service || '').trim())
const screenId = computed(() => String(route.params.screenId || ''))
const screen = ref(null)
const loading = ref(true)
const actionBusy = ref(false)
const actionError = ref('')
const riskPurpose = ref('')
let loadSequence = 0

const actionRoutes = computed(() => getProductionActionRoutes(service.value, screenId.value))
const homeRoute = computed(() => getProductionHomeRoute(service.value))
const primaryRoute = computed(() => actionRoutes.value.primary)
const secondaryRoute = computed(() => actionRoutes.value.secondary)
const VOICE_CONVERSATION_SCREENS = {
  transfer: ['2-02', '2-03', '2-04', '2-15', '2-24', '2-25', '2-26'],
  voice: ['5-08'],
}
const VOICE_SERVICES = Object.keys(VOICE_CONVERSATION_SCREENS)

const showVoiceControl = computed(() =>
  (VOICE_CONVERSATION_SCREENS[service.value] ?? []).includes(screenId.value),
)

/**
 * 2-02만 패널의 키보드 입력과 화면 버튼 라벨이 겹친다.
 * 나머지 음성 화면은 취소·다시 말하기 같은 이동 경로가 화면 버튼에만 있으므로 유지한다.
 */
const hideScreenActions = computed(() => service.value === 'transfer' && screenId.value === '2-02')

const liveKind = computed(() => {
  if (service.value === 'living') {
    if (['4-02', '4-03', '4-04'].includes(screenId.value)) return 'accounts'
    if (['4-06', '4-07', '4-08', '4-17', '4-18'].includes(screenId.value)) return 'reminders'
    if (['4-10', '4-11', '4-12', '4-20', '4-21'].includes(screenId.value)) return 'branches'
    if (['4-14', '4-15', '4-16'].includes(screenId.value)) return 'profile'
  }
  if (service.value === 'voice' && ['5-01', '5-02'].includes(screenId.value)) {
    return 'voiceSettings'
  }
  if (
    service.value === 'bills' &&
    billStore.bill &&
    ['3-03', '3-04', '3-05', '3-06', '3-07', '3-11', '3-14', '3-15'].includes(screenId.value)
  ) {
    return 'bill'
  }
  if (service.value === 'voice' && voiceStore.lastTurn) return 'voiceTurn'
  return ''
})

const liveTitle = computed(() => {
  const titles = {
    accounts: '내 계좌에서 불러온 정보',
    reminders: '서버에 저장된 알림',
    branches: '가까운 이동점포 정보',
    profile: '내 정보에서 불러온 내용',
    voiceSettings: '저장된 음성 설정',
    bill: '고지서 인식 결과',
    voiceTurn: '음성 대화 응답',
  }
  return titles[liveKind.value] || ''
})

const liveLoading = computed(() => {
  if (liveKind.value === 'bill') return billStore.busy
  if (liveKind.value === 'voiceTurn') return voiceStore.busy
  return liveKind.value && serviceData.loading[liveKind.value]
})
const liveError = computed(() => {
  if (liveKind.value === 'bill') return billStore.error?.message || ''
  if (liveKind.value === 'voiceTurn') return voiceStore.error?.message || ''
  return serviceData.errors[liveKind.value]?.message || ''
})

const liveRows = computed(() => {
  if (liveKind.value === 'accounts') {
    return serviceData.accounts.map((account) => ({
      label: account.accountName || account.accountType || '계좌',
      value: account.accountNumberMasked || formatCurrency(account.balance),
    }))
  }
  if (liveKind.value === 'reminders') {
    return serviceData.reminders.map((reminder) => ({
      label: reminder.title || '납부 알림',
      value: formatDate(reminder.scheduledAt || reminder.dueDate),
    }))
  }
  if (liveKind.value === 'branches') {
    return serviceData.branches.map((branch) => ({
      label: branch.name || branch.branchName || '이동점포',
      value: branch.distance ? `${branch.distance}km` : branch.address || '상세 보기',
    }))
  }
  if (liveKind.value === 'profile' && serviceData.profile) {
    return [
      { label: '이름', value: serviceData.profile.name || '등록된 이름 없음' },
      { label: '휴대전화', value: serviceData.profile.phone || '등록된 번호 없음' },
      { label: '주소', value: serviceData.profile.address || '등록된 주소 없음' },
    ]
  }
  if (liveKind.value === 'voiceSettings' && serviceData.voiceSettings) {
    return [
      { label: '목소리', value: serviceData.voiceSettings.ttsVoice || '기본 목소리' },
      {
        label: '말하기 속도',
        value: serviceData.voiceSettings.speechRateMultiplier
          ? `${serviceData.voiceSettings.speechRateMultiplier}배`
          : '기본',
      },
    ]
  }
  if (liveKind.value === 'bill' && billStore.bill) {
    return [
      { label: '납부처', value: billStore.bill.payee || '확인 중' },
      { label: '금액', value: formatCurrency(billStore.bill.amount) },
      { label: '납부 기한', value: formatDate(billStore.bill.dueDate) },
    ]
  }
  if (liveKind.value === 'voiceTurn' && voiceStore.lastTurn) {
    return [
      { label: '상태', value: voiceStore.lastTurn.state || '처리 완료' },
      { label: '안내', value: voiceStore.lastTurn.ttsText || '화면을 확인해 주세요.' },
    ]
  }
  return []
})

const isBusy = computed(
  () => actionBusy.value || transferStore.busy || billStore.busy || voiceStore.busy,
)

function formatCurrency(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '잔액 확인 중'
}

function formatDate(value) {
  if (!value) return '일정 확인 중'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ko-KR')
}

async function loadContext(currentService, currentScreenId) {
  if (currentService === 'bills' && route.query.billId) {
    await billStore.load(String(route.query.billId)).catch(() => {})
  }

  if (currentService === 'living') {
    if (['4-02', '4-03', '4-04'].includes(currentScreenId)) {
      await serviceData.loadAccounts({ active: true }).catch(() => {})
    }
    if (['4-06', '4-07', '4-08', '4-17', '4-18'].includes(currentScreenId)) {
      await serviceData.loadReminders({ status: 'PENDING' }).catch(() => {})
    }
    if (currentScreenId === '4-10') {
      try {
        const position = await getCurrentLocation()
        await serviceData.loadBranches({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          taskType: 'BRANCH',
        })
      } catch {
        serviceData.errors.branches = {
          message: '위치를 확인할 수 없어 지역을 직접 선택해 주세요.',
        }
      }
    }
    if (['4-14', '4-15', '4-16'].includes(currentScreenId)) {
      await serviceData.loadProfile().catch(() => {})
      if (currentScreenId === '4-16') await serviceData.loadConsents().catch(() => {})
    }
  }

  if (currentService === 'voice' && ['5-01', '5-02'].includes(currentScreenId)) {
    const loadedSettings = await serviceData.loadVoiceSettings().catch(() => null)
    if (loadedSettings) {
      Object.assign(voiceStore.settings, {
        ttsVoice: loadedSettings.ttsVoice,
        speechRateMultiplier: loadedSettings.speechRateMultiplier,
        volumeMultiplier: loadedSettings.volumeMultiplier,
      })
    }
  }

  if (currentService === 'transfer' && currentScreenId === '2-02' && !voiceStore.sessionId) {
    const session = await voiceStore.startSession('TRANSFER').catch(() => null)
    transferStore.sessionId = session?.sessionId || transferStore.sessionId
    await voiceStore.issueSpeechToken().catch(() => {})
  }
}

async function loadScreen() {
  const sequence = ++loadSequence
  loading.value = true
  screen.value = null
  actionError.value = ''
  riskPurpose.value = ''

  let nextScreen
  try {
    nextScreen = await loadProductionScreen(service.value, screenId.value)
  } catch {
    if (sequence !== loadSequence) return
    actionError.value = '화면을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
  if (sequence !== loadSequence) return

  screen.value = nextScreen
  loading.value = false
  await loadContext(service.value, screenId.value)
}

async function go(target) {
  if (target) await router.push(target)
}

async function uploadBill(source) {
  actionBusy.value = true
  actionError.value = ''
  try {
    const photo = await takeBillPhoto(source)
    const image = await photoToBlob(photo)
    if (!image) throw new Error('사진을 읽을 수 없어요. 다시 촬영해 주세요.')

    let voiceSessionId = voiceStore.sessionId || transferStore.sessionId
    if (!voiceSessionId) {
      const session = await voiceStore.startSession('BILL_PAYMENT')
      voiceSessionId = session?.sessionId
    }
    if (!voiceSessionId) throw new Error('음성 세션을 준비하지 못했어요. 다시 시도해 주세요.')

    await billStore.upload({
      image,
      voiceSessionId,
    })
    await go({ name: 'bills-screen', params: { screenId: '3-03' } })
  } catch (error) {
    if (
      !String(error?.message || '')
        .toLowerCase()
        .includes('cancel')
    ) {
      actionError.value = error?.message || '고지서를 준비하지 못했어요. 다시 시도해 주세요.'
    }
  } finally {
    actionBusy.value = false
  }
}

async function loadRecipients() {
  actionBusy.value = true
  actionError.value = ''
  try {
    const contacts = await getContactCandidates()
    const keyword = voiceStore.transcript.split(/에게|에|으로/)[0].trim() || '김영희'
    await transferStore.findRecipients({ keyword, contacts: contacts.slice(0, 200) })
    await go(primaryRoute.value)
  } catch (error) {
    actionError.value = error?.message || '연락처를 불러오지 못했어요. 직접 검색해 주세요.'
  } finally {
    actionBusy.value = false
  }
}

async function loadBranchesFromDevice() {
  actionBusy.value = true
  actionError.value = ''
  try {
    const position = await getCurrentLocation()
    await serviceData.loadBranches({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      taskType: 'BRANCH',
    })
    await go(primaryRoute.value)
  } catch (error) {
    actionError.value = error?.message || '위치를 확인하지 못했어요. 지역을 직접 선택해 주세요.'
  } finally {
    actionBusy.value = false
  }
}

async function listenForVoice() {
  actionBusy.value = true
  actionError.value = ''
  try {
    if (!voiceStore.sessionId) {
      const session = await voiceStore.startSession(
        service.value === 'transfer' ? 'TRANSFER' : 'GENERAL_FINANCE',
      )
      transferStore.sessionId = session?.sessionId || transferStore.sessionId
      await voiceStore.issueSpeechToken().catch(() => {})
    }
    await voiceStore.listenAndSendTurn()
  } catch (error) {
    actionError.value = error?.message || '말씀을 듣지 못했어요. 다시 시도해 주세요.'
  } finally {
    actionBusy.value = false
  }
}

async function handlePrimary() {
  if (!screen.value || isBusy.value) return
  actionError.value = ''

  if (service.value === 'bills' && screenId.value === '3-02A') return uploadBill('camera')
  if (service.value === 'bills' && screenId.value === '3-04' && billStore.billId) {
    await billStore
      .confirm({
        approved: true,
        confirmedPayee: billStore.bill?.payee,
        confirmedAmount: billStore.bill?.amount,
        confirmedDueDate: billStore.bill?.dueDate,
      })
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'bills' && screenId.value === '3-06' && billStore.billId) {
    await billStore
      .execute()
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'bills' && screenId.value === '3-05' && billStore.billId) {
    await billStore
      .confirm({ approved: true })
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-05') return loadRecipients()
  if (service.value === 'transfer' && screenId.value === '2-07') {
    await transferStore
      .validateAmount({ recognizedAmount: 50000, amountCandidates: [50000] })
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-08' && transferStore.transferId) {
    try {
      const risk = await transferStore.assessRisk()
      if (risk?.additionalCheckRequired) {
        await go({ name: 'transfer-screen', params: { screenId: '2-09' } })
      } else {
        await transferStore.confirm({ approved: true })
        await go(primaryRoute.value)
      }
    } catch (error) {
      actionError.value = error.message
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-09' && transferStore.transferId) {
    try {
      const risk = await transferStore.checkRisk({
        purposeAnswer: riskPurpose.value.trim() || null,
      })
      await go(
        risk?.hold
          ? { name: 'transfer-screen', params: { screenId: '2-10' } }
          : { name: 'transfer-screen', params: { screenId: '2-08' } },
      )
    } catch (error) {
      actionError.value = error.message
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-11' && transferStore.transferId) {
    await transferStore
      .requestGuardianVerification()
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-22' && transferStore.transferId) {
    await transferStore
      .execute()
      .then(() => go({ name: 'transfer-screen', params: { screenId: '2-14' } }))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'living' && screenId.value === '4-10') {
    return go(primaryRoute.value)
  }
  if (service.value === 'living' && ['4-12', '4-20', '4-21'].includes(screenId.value)) {
    return loadBranchesFromDevice()
  }
  if (service.value === 'living' && screenId.value === '4-07') {
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await serviceData
      .createReminder({ title: '전기요금 납부 알림', scheduledAt })
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'living' && screenId.value === '4-13') {
    await voiceStore
      .saveSettings()
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'voice' && ['5-01', '5-02'].includes(screenId.value)) {
    await voiceStore
      .saveSettings()
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  if (service.value === 'voice' && ['5-03', '5-07'].includes(screenId.value)) {
    if (voiceStore.sessionId && voiceStore.lastTurn?.turnId) {
      await voiceStore
        .sendEvent({ eventType: 'REPLAY', turnId: voiceStore.lastTurn.turnId })
        .catch(() => {})
    }
    return go(primaryRoute.value)
  }
  if (service.value === 'voice' && ['5-05', '5-08'].includes(screenId.value)) {
    if (screenId.value === '5-08') return listenForVoice()
    await voiceStore.issueSpeechToken().catch(() => {})
    await voiceStore.startSession('GENERAL_FINANCE').catch(() => {})
  }

  return go(primaryRoute.value)
}

async function handleSecondary() {
  if (!screen.value || isBusy.value) return
  actionError.value = ''

  if (service.value === 'bills' && screenId.value === '3-02A') return uploadBill('gallery')
  if (service.value === 'bills' && screenId.value === '3-03') billStore.reset()
  if (service.value === 'voice' && screenId.value === '5-04') {
    await voiceStore.startSession('GENERAL_FINANCE').catch(() => {})
  }
  if (service.value === 'voice' && screenId.value === '5-07') {
    await voiceStore.closeSession().catch(() => {})
  }
  return go(secondaryRoute.value)
}

function openVoice() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-assist'))
  router.push({ name: 'voice-screen', params: { screenId: '5-08' } })
}

/** 서비스를 완전히 벗어날 때만 세션을 닫는다. 같은 서비스 안의 화면 이동은 유지한다. */
onBeforeRouteLeave((to) => {
  if (!VOICE_SERVICES.includes(service.value)) return
  if (to.meta?.service === service.value || to.name === `${service.value}-home`) return

  voiceStore.silence()
  if (voiceStore.sessionId) voiceStore.closeSession().catch(() => {})
  voiceStore.transcript = ''
})

watch([service, screenId], loadScreen, { immediate: true })
onMounted(() => {
  if (service.value === 'bills' && screenId.value === '3-02A') billStore.reset()
})
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell service-route-device">
      <header class="app-header">
        <RouterLink
          aria-label="서비스 홈으로"
          class="app-header-button service-route-back"
          :to="homeRoute"
        >
          ‹
        </RouterLink>
        <strong class="app-brand">귀편한 금융</strong>
        <Button
          aria-label="음성 도움"
          class="app-header-button service-mic-button"
          size="icon"
          variant="secondary"
          @click="openVoice"
        >
          <span
            aria-hidden="true"
            class="service-mic-icon"
          >
            <span class="service-mic-stem" />
          </span>
        </Button>
      </header>

      <main class="app-main service-route-main">
        <section class="screen-heading service-route-heading">
          <span class="service-route-kicker">
            {{ screen?.serviceLabel || '서비스' }} · {{ screenId }}
          </span>
          <h1>{{ screen?.title || screenId }}</h1>
          <p>{{ screen?.description || '화면을 불러오는 중입니다.' }}</p>
        </section>

        <div
          v-if="actionError"
          class="service-route-error"
          role="alert"
        >
          {{ actionError }}
        </div>

        <section
          v-if="screen?.contentHtml && !showVoiceControl"
          class="service-route-screen-content prototype-screen-content"
          :data-variant="screen.variant"
        >
          <!-- Content is loaded from the reviewed reference screen data. -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="content"
            v-html="screen.contentHtml"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p
            v-if="screen.variant === 'warning'"
            class="sr-only"
            role="status"
          >
            확인이 필요한 화면입니다.
          </p>
          <p
            v-if="screen.variant === 'destructive'"
            class="sr-only"
            role="alert"
          >
            오류 또는 주의가 필요한 화면입니다.
          </p>
        </section>

        <label
          v-if="service === 'transfer' && screenId === '2-09'"
          class="service-route-input-field"
        >
          <span>송금 목적을 알려주세요 (선택)</span>
          <input
            v-model="riskPurpose"
            maxlength="500"
            placeholder="예: 생활비"
            type="text"
          />
        </label>

        <VoiceConversationPanel
          v-if="showVoiceControl"
          :entry-point="service === 'transfer' ? 'TRANSFER' : 'GENERAL_FINANCE'"
          :screen-id="screenId"
        />

        <section
          v-if="liveKind"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>{{ liveTitle }}</strong>
            <span v-if="liveLoading">불러오는 중…</span>
          </div>
          <p
            v-if="liveError"
            class="service-route-live-error"
            role="status"
          >
            {{ liveError }}
          </p>
          <p
            v-else-if="!liveLoading && !liveRows.length"
            class="service-route-live-empty"
          >
            아직 서버에 저장된 정보가 없어요. 화면의 안내를 따라 등록해 주세요.
          </p>
          <div
            v-else
            class="service-route-live-rows"
          >
            <div
              v-for="row in liveRows"
              :key="`${row.label}-${row.value}`"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <Card
          v-if="!screen"
          class="service-route-card"
        >
          <CardContent>
            <strong v-if="loading">화면을 불러오는 중입니다.</strong>
            <strong v-else>연결된 화면을 찾을 수 없습니다.</strong>
            <p>잠시 후 다시 시도하거나 서비스 홈으로 이동해 주세요.</p>
          </CardContent>
        </Card>
      </main>

      <footer v-if="screen && !hideScreenActions && (screen.primaryLabel || screen.secondaryLabel)">
        <Button
          v-if="screen.primaryLabel"
          class="service-route-primary"
          :disabled="isBusy"
          @click="handlePrimary"
        >
          {{ isBusy ? '처리하고 있어요…' : screen.primaryLabel }}
        </Button>
        <Button
          v-if="screen.secondaryLabel"
          class="service-route-secondary"
          :disabled="isBusy"
          variant="secondary"
          @click="handleSecondary"
        >
          {{ screen.secondaryLabel }}
        </Button>
      </footer>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav three-items service-route-bottom-nav"
      >
        <RouterLink :to="{ name: 'transfer-home' }">홈</RouterLink>
        <RouterLink :to="{ name: 'bills-home' }">고지서</RouterLink>
        <RouterLink :to="{ name: 'living-home' }">생활금융</RouterLink>
      </nav>
    </article>
  </div>
</template>
