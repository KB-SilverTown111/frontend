<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { stripProductionSelectionIndicators } from '@/services/screenContent.js'
import {
  getProductionActionRoutes,
  getProductionHomeRoute,
  loadProductionScreen,
} from '@/services/productionServiceScreens.js'
import { getContactCandidates, photoToBlob, takeBillPhoto } from '@/services/nativeCapabilities.js'
import { useBillStore } from '@/stores/bill.js'
import { useServiceDataStore } from '@/stores/serviceData.js'
import { useTransferStore } from '@/stores/transfer.js'
import { useVoiceStore } from '@/stores/voice.js'
import TransferFlowPanel from '@/components/patterns/TransferFlowPanel.vue'
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
const transferPin = ref('')
const recipientSearch = ref('')
// Keep the legacy name for the hidden fallback input and existing route contracts.
const recipientKeyword = recipientSearch
const transferAmountInput = ref('')
let loadSequence = 0

const actionRoutes = computed(() => getProductionActionRoutes(service.value, screenId.value))
const homeRoute = computed(() => getProductionHomeRoute(service.value))
const isMyPageDetail = computed(
  () => service.value === 'living' && ['4-14', '4-15', '4-16'].includes(screenId.value),
)
const backRoute = computed(() => (isMyPageDetail.value ? { name: 'my-page' } : homeRoute.value))
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
const TRANSFER_FLOW_SCREENS = ['2-05', '2-07', '2-08', '2-14', '2-17', '2-18', '2-23']
const showTransferFlow = computed(
  () => service.value === 'transfer' && TRANSFER_FLOW_SCREENS.includes(screenId.value),
)
const showRecipientSearch = computed(
  () => service.value === 'transfer' && ['2-05', '2-16'].includes(screenId.value),
)
const liveKind = computed(() => {
  if (service.value === 'living') {
    if (['4-02', '4-03', '4-04'].includes(screenId.value)) return 'accounts'
    if (['4-06', '4-07', '4-08', '4-17', '4-18'].includes(screenId.value)) return 'reminders'
  }
  if (
    service.value === 'bills' &&
    billStore.bill &&
    ['3-03', '3-04', '3-05', '3-06', '3-07', '3-11', '3-14', '3-15'].includes(screenId.value)
  ) {
    return 'bill'
  }
  return ''
})

const liveTitle = computed(() => {
  const titles = {
    accounts: '내 계좌에서 불러온 정보',
    reminders: '서버에 저장된 알림',
    bill: '고지서 인식 결과',
  }
  return titles[liveKind.value] || ''
})

const liveLoading = computed(() => {
  if (liveKind.value === 'bill') return billStore.busy
  return liveKind.value && serviceData.loading[liveKind.value]
})
const liveError = computed(() => {
  if (liveKind.value === 'bill') return billStore.error?.message || ''
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
  if (liveKind.value === 'bill' && billStore.bill) {
    return [
      { label: '납부처', value: billStore.bill.payee || '확인 중' },
      { label: '금액', value: formatCurrency(billStore.bill.amount) },
      { label: '납부 기한', value: formatDate(billStore.bill.dueDate) },
    ]
  }
  return []
})

const transferSummaryRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-08') return []

  const recipient = transferStore.recipient || {}
  const account = transferStore.selectedAccount || {}
  return [
    {
      label: '받는 분',
      value:
        recipient.name || recipient.displayName || recipient.accountHolderName || '받는 분 확인 중',
    },
    {
      label: '받는 계좌',
      value:
        recipient.accountNumberMasked ||
        recipient.accountMasked ||
        recipient.bankName ||
        '계좌 확인 중',
    },
    { label: '보낼 금액', value: formatCurrency(transferStore.amount) },
    {
      label: '출금 계좌',
      value:
        account.accountNumberMasked ||
        account.accountMasked ||
        account.accountName ||
        account.accountHolderName ||
        '계좌 확인 중',
    },
  ]
})

const isBusy = computed(
  () =>
    actionBusy.value ||
    transferStore.busy ||
    billStore.busy ||
    (service.value === 'transfer' && serviceData.loading.accounts),
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

function normalizeTransferAmount(event) {
  transferAmountInput.value = String(event.target.value || '').replace(/\D/g, '')
  actionError.value = ''
}

function parsedTransferAmount() {
  const amount = Number(transferAmountInput.value)
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null
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
      await serviceData.loadReminders({ status: 'SCHEDULED' }).catch(() => {})
    }
  }

  if (currentService === 'transfer' && ['2-08', '2-18'].includes(currentScreenId)) {
    await serviceData.loadAccounts({ active: true }).catch(() => {})
  }

  if (currentService === 'transfer' && currentScreenId === '2-02') {
    transferStore.reset()
    recipientKeyword.value = ''
    transferAmountInput.value = ''
  }

  if (
    currentService === 'transfer' &&
    currentScreenId === '2-07' &&
    !transferAmountInput.value &&
    (transferStore.draftAmount || transferStore.amount)
  ) {
    transferAmountInput.value = String(transferStore.draftAmount || transferStore.amount)
  }
}

async function loadScreen() {
  const sequence = ++loadSequence
  loading.value = true
  screen.value = null
  actionError.value = ''
  riskPurpose.value = ''
  transferPin.value = ''

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

    let voiceSessionId = ''
    if (voiceStore.session?.entryPoint === 'BILL_PAYMENT') {
      voiceSessionId = voiceStore.sessionId
    } else {
      const session = await voiceStore.startSession('BILL_PAYMENT')
      voiceSessionId = session?.sessionId
    }
    if (!voiceSessionId) throw new Error('음성 세션을 준비하지 못했어요. 다시 시도해 주세요.')

    await billStore.upload({
      image,
      voiceSessionId,
    })
    await go({ name: 'bills-screen', params: { screenId: '3-04' } })
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
  const spoken = voiceStore.transcript.split(/에게|한테|으로|에/)[0].trim()
  const keyword = spoken || recipientKeyword.value.trim()
  if (!keyword) {
    actionError.value = '받는 분 이름을 입력해 주세요.'
    return
  }

  actionBusy.value = true
  actionError.value = ''
  try {
    const contacts = await getContactCandidates().catch(() => [])
    const found = await transferStore.findRecipients({ keyword, contacts: contacts.slice(0, 200) })
    if (!found.length) {
      throw new Error('받는 분을 찾지 못했어요. 이름이나 계좌 정보를 다시 확인해 주세요.')
    }
  } catch (error) {
    actionError.value = error?.message || '연락처를 불러오지 못했어요. 직접 검색해 주세요.'
  } finally {
    actionBusy.value = false
  }
}

async function selectRecipient(candidate) {
  transferStore.selectRecipient(candidate)
  actionError.value = ''
  await go({ name: 'transfer-screen', params: { screenId: '2-18' } })
}

function clearRecipientCandidates() {
  transferStore.clearRecipientSelection()
  actionError.value = ''
}

async function reloadTransferAccounts() {
  actionError.value = ''
  await serviceData.loadAccounts({ active: true }).catch((error) => {
    actionError.value = error?.message || '계좌를 불러오지 못했어요. 다시 시도해 주세요.'
  })
}

function selectAccount(account) {
  transferStore.selectAccount(account)
  actionError.value = ''
}

function needsAdditionalRiskCheck(risk) {
  return Boolean(
    risk?.additionalCheckRequired ||
    risk?.requiresAdditionalCheck ||
    risk?.verificationRequired ||
    risk?.requiresVerification,
  )
}

function riskWarning(risk) {
  return (
    risk?.warningText ||
    risk?.warning ||
    risk?.message ||
    '추가 확인이 필요해 송금을 진행할 수 없어요.'
  )
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
  if (service.value === 'transfer' && ['2-05', '2-17'].includes(screenId.value)) {
    if (!transferStore.candidates.length) return loadRecipients()
    if (!transferStore.selectedRecipient) {
      actionError.value = '받는 분을 직접 선택해 주세요.'
      return
    }
    return go({ name: 'transfer-screen', params: { screenId: '2-18' } })
  }
  if (service.value === 'transfer' && screenId.value === '2-18') {
    if (!transferStore.fromAccount) {
      actionError.value = '출금할 계좌를 직접 선택해 주세요.'
      return
    }
    return go({ name: 'transfer-screen', params: { screenId: '2-07' } })
  }
  if (service.value === 'transfer' && screenId.value === '2-07') {
    const transferAmount = transferStore.draftAmount || parsedTransferAmount()
    if (!transferAmount) {
      actionError.value = '보낼 금액을 숫자로 입력해 주세요.'
      return
    }

    try {
      const amountValidation = await transferStore.validateAmount({
        recognizedAmount: transferAmount,
        amountCandidates: [transferAmount],
      })
      const confirmedAmount = Number(amountValidation?.confirmedAmount ?? transferAmount)
      if (!Number.isSafeInteger(confirmedAmount) || confirmedAmount <= 0) {
        throw new Error('보낼 금액을 확인해 주세요.')
      }
      if (transferStore.amountReconfirmRequired) return
      transferStore.setAmount(confirmedAmount)
      await transferStore.prepare({
        fromAccountId: transferStore.fromAccount?.accountId ?? transferStore.fromAccount?.id,
        recipientId:
          transferStore.selectedRecipient?.recipientId ?? transferStore.selectedRecipient?.id,
        amount: confirmedAmount,
      })
      await go({ name: 'transfer-screen', params: { screenId: '2-08' } })
    } catch (error) {
      actionError.value = error.message
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-08' && !transferStore.transferId) {
    actionError.value = '송금 정보를 다시 확인해 주세요.'
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-08' && transferStore.transferId) {
    try {
      if (!transferStore.riskCleared) {
        const risk = await transferStore.assessRisk()
        if (transferStore.isRiskHeld(risk)) {
          await go({ name: 'transfer-screen', params: { screenId: '2-10' } })
          return
        }
        if (needsAdditionalRiskCheck(risk)) {
          await go({ name: 'transfer-screen', params: { screenId: '2-09' } })
          return
        }
      }
      const confirmed = await transferStore.confirm({ approved: true })
      if (!confirmed?.executable || !transferStore.executable) {
        actionError.value = '지금은 송금을 진행할 수 없어요.'
        return
      }
      // 실행 전에 거래 승인 비밀번호를 확인한다.
      await go({ name: 'transfer-screen', params: { screenId: '2-11' } })
    } catch (error) {
      actionError.value = error.message
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-09' && !transferStore.transferId) {
    actionError.value = '송금 정보를 다시 확인해 주세요.'
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-09' && transferStore.transferId) {
    try {
      const risk = await transferStore.checkRisk({
        purposeAnswer: riskPurpose.value.trim() || null,
      })
      if (transferStore.isRiskHeld(risk)) {
        await go({ name: 'transfer-screen', params: { screenId: '2-10' } })
      } else if (needsAdditionalRiskCheck(risk)) {
        actionError.value = riskWarning(risk)
      } else {
        await go({ name: 'transfer-screen', params: { screenId: '2-08' } })
      }
    } catch (error) {
      actionError.value = error.message
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-11' && transferStore.transferId) {
    const pin = transferPin.value.trim()
    if (!/^\d{6}$/.test(pin)) {
      actionError.value = '송금 PIN 6자리를 입력해 주세요.'
      return
    }
    try {
      const authenticated = await transferStore.authenticate({ pin })
      transferPin.value = ''
      if (!authenticated?.authenticated || !transferStore.authenticationCompleted) {
        await go({ name: 'transfer-screen', params: { screenId: '2-13' } })
        return
      }
      await go({ name: 'transfer-screen', params: { screenId: '2-22' } })
    } catch (error) {
      transferPin.value = ''
      actionError.value = error.message
      await go({ name: 'transfer-screen', params: { screenId: '2-13' } })
    }
    return
  }
  if (service.value === 'transfer' && screenId.value === '2-22' && transferStore.transferId) {
    if (!transferStore.confirmationCompleted || !transferStore.authenticationCompleted) {
      actionError.value = '확인 절차가 끝나지 않았어요. 다시 확인해 주세요.'
      return
    }
    try {
      const executed = await transferStore.execute()
      await go({
        name: 'transfer-screen',
        params: { screenId: executed?.status === 'SUCCESS' ? '2-14' : '2-23' },
      })
    } catch (error) {
      actionError.value = error.message
      await go({ name: 'transfer-screen', params: { screenId: '2-23' } })
    }
    return
  }
  if (service.value === 'living' && screenId.value === '4-07') {
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    await serviceData
      .createReminder({ title: '전기요금 납부 알림', scheduledAt })
      .then(() => go(primaryRoute.value))
      .catch((error) => (actionError.value = error.message))
    return
  }
  return go(primaryRoute.value)
}

async function handleSecondary() {
  if (!screen.value || isBusy.value) return
  actionError.value = ''

  if (service.value === 'bills' && screenId.value === '3-02A') return uploadBill('gallery')
  if (service.value === 'bills' && screenId.value === '3-03') billStore.reset()
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
          :aria-label="isMyPageDetail ? '마이페이지로' : '서비스 홈으로'"
          class="app-header-button service-route-back"
          :to="backRoute"
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
          <h1>{{ screen?.title || '서비스 화면' }}</h1>
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
          v-if="
            screen?.contentHtml &&
            !(service === 'transfer' && screenId === '2-08') &&
            !hideScreenActions &&
            !showVoiceControl &&
            !showTransferFlow
          "
          class="service-route-screen-content screen-content"
          :data-variant="screen.variant"
        >
          <!-- Content is loaded from the reviewed reference screen data. -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="content"
            v-html="stripProductionSelectionIndicators(screen.contentHtml)"
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
          v-if="showRecipientSearch"
          class="service-route-input-field"
        >
          <span>받는 분 이름</span>
          <input
            v-model="recipientSearch"
            autocomplete="name"
            maxlength="50"
            placeholder="예: 김영희"
            type="text"
            @input="clearRecipientCandidates"
          />
        </label>

        <label
          v-if="service === 'transfer' && screenId === '2-11'"
          class="service-route-input-field"
        >
          <span>거래 승인 비밀번호</span>
          <input
            v-model="transferPin"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            placeholder="PIN 6자리"
            type="password"
          />
        </label>

        <TransferFlowPanel
          v-if="showTransferFlow"
          :screen-id="screenId"
        />

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

        <label
          v-if="service === 'transfer' && screenId === '2-07'"
          v-show="!showTransferFlow"
          class="service-route-input-field"
        >
          <span>보낼 금액</span>
          <input
            v-model="transferAmountInput"
            inputmode="numeric"
            maxlength="12"
            placeholder="예: 50000"
            type="text"
            @input="normalizeTransferAmount"
          />
        </label>

        <section
          v-if="
            service === 'transfer' &&
            screenId === '2-05' &&
            !showTransferFlow &&
            transferStore.recipientCandidates.length
          "
          aria-label="받는 분 선택"
          class="service-route-live-panel"
        >
          <div class="service-route-live-heading">
            <strong>받는 분을 선택해 주세요</strong>
          </div>
          <Button
            v-for="candidate in transferStore.recipientCandidates"
            :key="candidate.recipientId || candidate.id"
            :aria-pressed="transferStore.recipient === candidate"
            class="service-route-live-row"
            variant="secondary"
            @click="selectRecipient(candidate)"
          >
            {{ candidate.name || candidate.displayName || '받는 분' }}
            {{ candidate.bankName || candidate.bankCode || '' }}
            {{ candidate.accountNumberMasked || candidate.accountMasked || '' }}
          </Button>
        </section>

        <label
          v-if="service === 'transfer' && screenId === '2-05' && !showTransferFlow"
          class="service-route-input-field"
        >
          <span>받는 분 이름</span>
          <input
            v-model="recipientKeyword"
            autocomplete="name"
            maxlength="50"
            placeholder="예: 김영희"
            type="text"
            @input="clearRecipientCandidates"
          />
        </label>

        <section
          v-if="service === 'transfer' && screenId === '2-18'"
          v-show="!showTransferFlow"
          aria-label="출금 계좌 선택"
          class="service-route-live-panel"
        >
          <div class="service-route-live-heading">
            <strong>출금할 계좌를 선택해 주세요</strong>
            <span v-if="serviceData.loading.accounts">불러오는 중…</span>
          </div>
          <p
            v-if="serviceData.errors.accounts"
            class="service-route-live-error"
            role="status"
          >
            계좌를 불러오지 못했어요. 다시 시도해 주세요.
          </p>
          <Button
            v-if="serviceData.errors.accounts"
            class="service-route-live-retry"
            :disabled="serviceData.loading.accounts"
            variant="secondary"
            @click="reloadTransferAccounts"
          >
            다시 불러오기
          </Button>
          <p
            v-else-if="!serviceData.loading.accounts && !serviceData.accounts.length"
            class="service-route-live-empty"
          >
            등록된 계좌가 없어요. 출금할 계좌를 먼저 등록해 주세요.
          </p>
          <div
            v-if="!serviceData.errors.accounts && serviceData.accounts.length"
            class="service-route-live-rows"
          >
            <Button
              v-for="account in serviceData.accounts"
              :key="account.accountId || account.id"
              :aria-pressed="transferStore.selectedAccount === account"
              class="service-route-live-row"
              variant="secondary"
              @click="selectAccount(account)"
            >
              {{ account.accountName || account.accountType || '내 계좌' }}
              {{ account.accountNumberMasked || '' }}
            </Button>
          </div>
        </section>

        <label
          v-if="service === 'transfer' && screenId === '2-08' && !showTransferFlow"
          class="service-route-input-field"
        >
          <span>송금 PIN 6자리</span>
          <input
            v-model="transferPin"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            placeholder="PIN 6자리"
            type="password"
          />
        </label>

        <section
          v-if="transferSummaryRows.length && !showTransferFlow"
          aria-label="실제 송금 내용"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>송금 내용을 확인해 주세요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in transferSummaryRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

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
        class="app-bottom-nav four-items service-route-bottom-nav"
      >
        <RouterLink :to="{ name: 'transfer-home' }">홈</RouterLink>
        <RouterLink :to="{ name: 'bills-home' }">고지서</RouterLink>
        <RouterLink :to="{ name: 'living-home' }">생활금융</RouterLink>
        <RouterLink :to="{ name: 'my-page' }">마이페이지</RouterLink>
      </nav>
    </article>
  </div>
</template>
