<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { goBackOrReplace } from '@/router/navigation.js'
import { stripProductionSelectionIndicators } from '@/services/screenContent.js'
import { withAppLoading } from '@/services/appLoading.js'
import {
  getProductionActionRoutes,
  getProductionHomeRoute,
  loadProductionScreen,
} from '@/services/productionServiceScreens.js'
import {
  captureVideoFrame,
  CONTACTS_PERMISSION_DENIED,
  getContactCandidates,
  getCurrentLocation,
  photoToBlob,
  takeBillPhoto,
} from '@/services/nativeCapabilities.js'
import {
  mobileBranchAddress,
  mobileBranchDistance,
  mobileBranchDocuments,
  mobileBranchId,
  mobileBranchName,
  mobileBranchSchedule,
  mobileBranchServices,
} from '@/services/mobileBranchPresentation.js'
import { useBillStore } from '@/stores/bill.js'
import { useServiceDataStore } from '@/stores/serviceData.js'
import { useTransferPlanStore } from '@/stores/transferPlan.js'
import { useTransferStore } from '@/stores/transfer.js'
import { useVoiceStore } from '@/stores/voice.js'
import TransferFlowPanel from '@/components/patterns/TransferFlowPanel.vue'
import VoiceConversationPanel from '@/components/patterns/VoiceConversationPanel.vue'

const route = useRoute()
const router = useRouter()
const serviceData = useServiceDataStore()
const transferStore = useTransferStore()
const transferPlanStore = useTransferPlanStore()
const billStore = useBillStore()
const voiceStore = useVoiceStore()

const service = computed(() => String(route.meta.service || '').trim())
const screenId = computed(() => String(route.params.screenId || ''))
const reminderTargetId = computed(() => String(route.query.reminderId || '').trim())
const screen = ref(null)
const loading = ref(true)
const actionBusy = ref(false)
const actionError = ref('')
const reminderTitle = ref('')
const reminderDate = ref('')
const reminderTime = ref('')
const showReminderCancelConfirm = ref(false)
const reminderCancelDialog = ref(null)
const billCameraVideo = ref(null)
const billCameraReady = ref(false)
const billCameraPreviewUrl = ref('')
let billCameraStream = null
let billCameraRequestId = 0
const riskPurpose = ref('')
const transferPin = ref('')
const guardianCode = ref('')
const recipientSearch = ref('')
// Keep the legacy name for the hidden fallback input and existing route contracts.
const recipientKeyword = recipientSearch
const transferAmountInput = ref('')
const planLabel = ref('')
const planAmount = ref('')
const planDay = ref('')
const planRepeat = ref('MONTHLY')
let loadSequence = 0

const planTargetId = computed(() => String(route.query.planId || '').trim())
const PLAN_SCREENS = ['2-27', '2-28', '2-29', '2-30', '2-31']
const isPlanScreen = computed(
  () => service.value === 'transfer' && PLAN_SCREENS.includes(screenId.value),
)
const isPlanFormScreen = computed(
  () => service.value === 'transfer' && ['2-28', '2-31'].includes(screenId.value),
)
const editingPlan = computed(() => transferPlanStore.findPlan(planTargetId.value))

const actionRoutes = computed(() => getProductionActionRoutes(service.value, screenId.value))
const homeRoute = computed(() => getProductionHomeRoute(service.value))
const isMyPageDetail = computed(
  () =>
    (service.value === 'living' && ['4-14', '4-15', '4-16'].includes(screenId.value)) ||
    Boolean(route.meta?.myPageVoice),
)
const backRoute = computed(() => (isMyPageDetail.value ? { name: 'my-page' } : homeRoute.value))
const primaryRoute = computed(() => actionRoutes.value.primary)
const secondaryRoute = computed(() => actionRoutes.value.secondary)
const VOICE_CONVERSATION_SCREENS = {
  transfer: ['2-02', '2-03', '2-04', '2-15', '2-24', '2-25', '2-26'],
  voice: ['5-08'],
}
const VOICE_SERVICES = Object.keys(VOICE_CONVERSATION_SCREENS)
const REPLACE_TARGETS = new Set([
  'bills-home',
  'living-home',
  'my-page',
  'onboarding',
  'transfer-home',
  'voice-home',
])

const showVoiceControl = computed(() =>
  (VOICE_CONVERSATION_SCREENS[service.value] ?? []).includes(screenId.value),
)
const isBillSourceSelection = computed(() => service.value === 'bills' && screenId.value === '3-02')
const isBillCameraScreen = computed(() => service.value === 'bills' && screenId.value === '3-02A')
const isReminderListScreen = computed(() => service.value === 'living' && screenId.value === '4-06')
const isReminderCreateScreen = computed(
  () => service.value === 'living' && screenId.value === '4-07',
)
const isReminderEditScreen = computed(() => service.value === 'living' && screenId.value === '4-08')
const isReminderEmptyScreen = computed(
  () => service.value === 'living' && screenId.value === '4-17',
)
const isReminderErrorScreen = computed(
  () => service.value === 'living' && screenId.value === '4-18',
)
const isReminderFormScreen = computed(
  () => isReminderCreateScreen.value || isReminderEditScreen.value,
)
const isReminderScreen = computed(
  () =>
    isReminderListScreen.value ||
    isReminderFormScreen.value ||
    isReminderEmptyScreen.value ||
    isReminderErrorScreen.value,
)
const selectedReminder = computed(
  () =>
    serviceData.reminders.find(
      (reminder) => String(reminder?.reminderId ?? reminder?.id ?? '') === reminderTargetId.value,
    ) || null,
)
const reminderMinDate = computed(() => {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})
const isMobileBranchListScreen = computed(
  () => service.value === 'living' && screenId.value === '4-10',
)
const isMobileBranchDetailScreen = computed(
  () => service.value === 'living' && screenId.value === '4-11',
)
const isMobileBranchScreen = computed(
  () => isMobileBranchListScreen.value || isMobileBranchDetailScreen.value,
)
const mobileBranchLocationError = ref('')
const mobileBranchLocationLoading = ref(false)
const selectedMobileBranchId = ref('')
let mobileBranchRequestId = 0

/**
 * 2-02만 패널의 키보드 입력과 화면 버튼 라벨이 겹친다.
 * 나머지 음성 화면은 취소·다시 말하기 같은 이동 경로가 화면 버튼에만 있으므로 유지한다.
 */
const hideScreenActions = computed(() => service.value === 'transfer' && screenId.value === '2-02')
const TRANSFER_FLOW_SCREENS = ['2-05', '2-07', '2-08', '2-14', '2-17', '2-18', '2-23']
const showTransferFlow = computed(
  () => service.value === 'transfer' && TRANSFER_FLOW_SCREENS.includes(screenId.value),
)
/** PIN을 아직 정하지 않아 2-11 인증이 막힌 사용자에게 등록 화면 경로를 준다. */
const TRANSFER_PIN_HELP_SCREENS = ['2-11', '2-13']
const showTransferPinHelp = computed(
  () => service.value === 'transfer' && TRANSFER_PIN_HELP_SCREENS.includes(screenId.value),
)
/**
 * 2-11은 화면 문구부터 "인증값 입력"으로 일반화돼 있다.
 * 보호자 확인이 진행 중이면 인증번호를, 아니면 거래 승인 PIN을 받는다.
 */
const guardianPending = computed(
  () => service.value === 'transfer' && Boolean(transferStore.guardianVerification),
)
const showRecipientSearch = computed(
  () => service.value === 'transfer' && ['2-05', '2-16'].includes(screenId.value),
)
const liveKind = computed(() => {
  if (service.value === 'living') {
    if (['4-02', '4-03', '4-04'].includes(screenId.value)) return 'accounts'
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
  if (liveKind.value === 'bill' && billStore.bill) {
    return [
      { label: '납부처', value: billStore.bill.payee || '확인 중' },
      { label: '금액', value: formatCurrency(billStore.bill.amount) },
      { label: '납부 기한', value: formatDate(billStore.bill.dueDate) },
    ]
  }
  return []
})

const selectedMobileBranch = computed(() => {
  const requestedId = route.query.branchId || selectedMobileBranchId.value
  if (requestedId) {
    const match = serviceData.mobileBranches.find(
      (branch) => String(mobileBranchId(branch)) === String(requestedId),
    )
    if (match) return match
  }

  return isMobileBranchListScreen.value ? serviceData.mobileBranches[0] || null : null
})
const mobileBranchViewItems = computed(() =>
  isMobileBranchListScreen.value
    ? serviceData.mobileBranches
    : selectedMobileBranch.value
      ? [selectedMobileBranch.value]
      : [],
)

const mobileBranchPrimaryDisabled = computed(() => {
  if (!isMobileBranchListScreen.value) return false

  return (
    mobileBranchLocationLoading.value ||
    Boolean(mobileBranchLocationError.value) ||
    serviceData.loading.mobileBranches ||
    Boolean(serviceData.errors.mobileBranches) ||
    !selectedMobileBranch.value ||
    mobileBranchId(selectedMobileBranch.value) == null
  )
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
    (service.value === 'living' && serviceData.loading.reminders) ||
    (service.value === 'transfer' && serviceData.loading.accounts) ||
    (isMobileBranchListScreen.value &&
      (mobileBranchLocationLoading.value || serviceData.loading.mobileBranches)),
)
/** 2-19는 어디까지 하셨는지 실제 초안 내용으로 보여준다. */
const unfinishedTransferRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-19') return []

  const prepared = transferStore.prepared
  if (!prepared) return []

  const recipient = prepared.recipient || transferStore.recipient || {}
  return [
    {
      label: '받는 분',
      value: recipient.displayName || recipient.name || transferStore.recipientName || '받는 분',
    },
    { label: '보내려던 금액', value: formatCurrency(prepared.amount ?? transferStore.amount) },
  ]
})

/** 2-20은 돈이 나가지 않았음을 남은 잔액으로 확인시켜 준다. */
const remainingBalanceRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-20') return []

  const account = transferStore.selectedAccount || serviceData.accounts[0]
  if (!account) return []

  return [
    { label: '출금 계좌', value: account.accountName || account.accountType || '내 계좌' },
    { label: '그대로 있는 잔액', value: formatCurrency(account.balance) },
  ]
})

function planScheduleLabel(plan) {
  const repeat = plan?.repeat === 'ONCE' ? '이번 달' : '매달'
  return `${repeat} ${plan?.dayOfMonth}일`
}

/** 2-27은 정해둔 약속을 날짜순으로 보여준다. */
const planRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-27') return []

  return transferPlanStore.sortedPlans.map((plan) => ({
    id: plan.id,
    label: `${plan.label} · ${planScheduleLabel(plan)}`,
    value: formatCurrency(plan.amount),
    sent: transferPlanStore.alreadySentThisMonth(plan.id),
  }))
})

/** 2-29는 오늘 보낼 약속만 보여준다. */
const duePlanRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-29') return []

  return transferPlanStore.duePlans.map((plan) => ({
    id: plan.id,
    label: plan.label,
    value: formatCurrency(plan.amount),
    sent: transferPlanStore.alreadySentThisMonth(plan.id),
  }))
})

/** 2-30은 이번 달에 이미 보낸 약속을 확인시켜 준다. */
const sentPlanRows = computed(() => {
  if (service.value !== 'transfer' || screenId.value !== '2-30') return []

  const plan = editingPlan.value
  if (!plan) return []

  return [
    { label: '보낼 돈', value: plan.label },
    { label: '금액', value: formatCurrency(plan.amount) },
    { label: '보낸 날', value: formatDate(plan.lastSentAt) },
  ]
})

/** 3-21은 실제 납부 금액을 보여준다. */
const billPaymentRows = computed(() => {
  if (service.value !== 'bills' || screenId.value !== '3-21') return []
  if (!billStore.bill) return []

  return [
    { label: '납부처', value: billStore.bill.payee || '확인 중' },
    { label: '납부 금액', value: formatCurrency(billStore.bill.amount) },
  ]
})

/** 3-13은 최초 납부 결과를 그대로 다시 보여준다. */
const billDuplicateRows = computed(() => {
  if (service.value !== 'bills' || screenId.value !== '3-13') return []

  const paid = billStore.result
  if (!paid && !billStore.bill) return []

  return [
    { label: '상태', value: paid?.status === 'PAID' || billStore.alreadyPaid ? '완료' : '확인 중' },
    { label: '결제 번호', value: billStore.paymentId || '확인 중' },
    { label: '납부 금액', value: formatCurrency(paid?.amount ?? billStore.bill?.amount) },
    { label: '납부한 날', value: formatDate(paid?.paidAt) },
  ]
})

/** 3-16에서 읽어줄 문장. 금액과 기한을 사람이 듣기 쉬운 순서로 붙인다. */
const billSpokenText = computed(() => {
  const bill = billStore.bill
  if (!bill) return ''

  const parts = [bill.payee || '고지서', formatCurrency(bill.amount)]
  if (bill.dueDate) parts.push(`${formatDate(bill.dueDate)}까지`)
  return parts.join(', ')
})

function formatCurrency(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '잔액 확인 중'
}

function formatDate(value) {
  if (!value) return '일정 확인 중'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ko-KR')
}

function reminderIdentifier(reminder) {
  return String(reminder?.reminderId ?? reminder?.id ?? '').trim()
}

function formatReminderDateTime(value) {
  if (!value) return '예약일시 확인 중'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function reminderStatusLabel(status) {
  const labels = {
    SCHEDULED: '예약됨',
    ACTIVE: '진행 중',
    COMPLETED: '완료',
    CANCELLED: '취소됨',
    CANCELED: '취소됨',
  }
  const normalizedStatus = String(status ?? '')
    .trim()
    .toUpperCase()
  return labels[normalizedStatus] || (normalizedStatus ? String(status) : '상태 확인 중')
}

function reminderInputValues(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: '', time: '' }

  const pad = (part) => String(part).padStart(2, '0')
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

function buildReminderScheduledAt(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null
  const date = new Date(`${dateValue}T${timeValue}:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function reminderMutationMessage(operation, error) {
  if (Number(error?.status) === 404) return '알림을 찾지 못했어요. 목록을 다시 확인해 주세요.'

  const messages = {
    create: '알림을 저장하지 못했어요. 다시 시도해 주세요.',
    update: '알림을 변경하지 못했어요. 다시 시도해 주세요.',
    cancel: '알림을 취소하지 못했어요. 다시 시도해 주세요.',
  }
  return messages[operation] || '알림 요청을 처리하지 못했어요. 다시 시도해 주세요.'
}

function resetReminderForm() {
  reminderTitle.value = ''
  reminderDate.value = ''
  reminderTime.value = ''
}

function fillReminderForm(reminder) {
  const inputValues = reminderInputValues(reminder?.scheduledAt)
  reminderTitle.value = String(reminder?.title ?? '')
  reminderDate.value = inputValues.date
  reminderTime.value = inputValues.time
}

function isSelectedMobileBranch(branch) {
  return String(mobileBranchId(branch)) === String(mobileBranchId(selectedMobileBranch.value))
}

function selectMobileBranch(branch) {
  const branchId = mobileBranchId(branch)
  if (branchId == null) return

  selectedMobileBranchId.value = String(branchId)
  actionError.value = ''
}

function stopBillCamera() {
  billCameraRequestId += 1
  billCameraStream?.getTracks().forEach((track) => track.stop())
  billCameraStream = null
  billCameraReady.value = false

  if (billCameraVideo.value) {
    billCameraVideo.value.srcObject = null
  }
}

function clearBillCameraPreview() {
  const objectUrl = globalThis.URL
  if (billCameraPreviewUrl.value && typeof objectUrl?.revokeObjectURL === 'function') {
    objectUrl.revokeObjectURL(billCameraPreviewUrl.value)
  }
  billCameraPreviewUrl.value = ''
}

function setBillCameraPreview(image) {
  const objectUrl = globalThis.URL
  if (!image || typeof objectUrl?.createObjectURL !== 'function') return

  clearBillCameraPreview()
  billCameraPreviewUrl.value = objectUrl.createObjectURL(image)
}

function cleanupBillCamera() {
  stopBillCamera()
  clearBillCameraPreview()
}

async function startBillCamera() {
  stopBillCamera()
  const requestId = billCameraRequestId

  if (!navigator.mediaDevices?.getUserMedia) {
    actionError.value =
      '카메라 미리보기를 준비할 수 없어요. 촬영 버튼을 눌러 기기 카메라를 열어 주세요.'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })

    if (requestId !== billCameraRequestId || !isBillCameraScreen.value) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    const video = billCameraVideo.value
    if (!video) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    billCameraStream = stream
    video.srcObject = stream
    await video.play()

    if (requestId !== billCameraRequestId || !isBillCameraScreen.value) {
      if (billCameraStream === stream) {
        stopBillCamera()
      } else {
        stream.getTracks().forEach((track) => track.stop())
      }
      return
    }

    billCameraReady.value = true
  } catch (error) {
    if (requestId !== billCameraRequestId) return

    stopBillCamera()
    if (isBillCameraScreen.value) {
      actionError.value =
        error?.name === 'NotAllowedError' || error?.name === 'SecurityError'
          ? '카메라 권한을 허용해 주세요. 촬영 버튼을 누르면 다시 시도할 수 있어요.'
          : '카메라 미리보기를 준비하지 못했어요. 촬영 버튼을 눌러 다시 시도해 주세요.'
    }
  }
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
    if (['4-06', '4-08', '4-17', '4-18'].includes(currentScreenId)) {
      await serviceData.loadReminders({ status: 'SCHEDULED' }).catch(() => {})

      if (currentScreenId === '4-06') {
        if (serviceData.errors.reminders) {
          await go({ name: 'living-screen', params: { screenId: '4-18' } })
          return { redirected: true }
        }
        if (!serviceData.reminders.length) {
          await go({ name: 'living-screen', params: { screenId: '4-17' } })
          return { redirected: true }
        }
      }

      if (currentScreenId === '4-17' && !serviceData.errors.reminders) {
        if (serviceData.reminders.length) {
          await go({ name: 'living-screen', params: { screenId: '4-06' } })
          return { redirected: true }
        }
      }

      if (currentScreenId === '4-18' && !serviceData.errors.reminders) {
        await go({
          name: 'living-screen',
          params: { screenId: serviceData.reminders.length ? '4-06' : '4-17' },
        })
        return { redirected: true }
      }

      if (currentScreenId === '4-08') {
        if (serviceData.errors.reminders || !reminderTargetId.value || !selectedReminder.value) {
          await go({ name: 'living-screen', params: { screenId: '4-06' } })
          return { redirected: true }
        }
        fillReminderForm(selectedReminder.value)
      }
    }
    if (currentScreenId === '4-10') await loadMobileBranchData()
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

  return { redirected: false }
}

function mobileBranchLocationMessage(error) {
  const code = Number(error?.code)
  if (
    error?.message === '위치 권한이 필요해요.' ||
    error?.name === 'NotAllowedError' ||
    code === 1
  ) {
    return '위치 권한을 허용해 주세요. 허용한 뒤 다시 찾기를 눌러 주세요.'
  }
  if (error?.name === 'TimeoutError' || code === 3) {
    return '현재 위치 확인 시간이 오래 걸렸어요. 잠시 후 다시 시도해 주세요.'
  }
  if (code === 2) return '현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'
  if (error?.message === '이 기기에서는 위치를 확인할 수 없어요.') return error.message
  return '현재 위치를 확인하지 못했어요. 위치 설정을 확인한 뒤 다시 시도해 주세요.'
}

async function loadMobileBranchData() {
  if (mobileBranchLocationLoading.value || serviceData.loading.mobileBranches) return

  const requestId = ++mobileBranchRequestId
  mobileBranchLocationLoading.value = true
  mobileBranchLocationError.value = ''
  actionError.value = ''

  try {
    let position
    try {
      position = await getCurrentLocation()
    } catch (error) {
      if (requestId === mobileBranchRequestId) {
        mobileBranchLocationError.value = mobileBranchLocationMessage(error)
      }
      return
    }

    if (requestId !== mobileBranchRequestId || !isMobileBranchListScreen.value) return

    const latitude = Number(position?.coords?.latitude)
    const longitude = Number(position?.coords?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      mobileBranchLocationError.value = '현재 위치를 확인하지 못했어요. 다시 시도해 주세요.'
      return
    }

    try {
      await serviceData.loadMobileBranches({ latitude, longitude })
    } catch {
      return
    }

    if (requestId !== mobileBranchRequestId || !isMobileBranchListScreen.value) return

    const hasSelectedBranch = serviceData.mobileBranches.some(
      (branch) => String(mobileBranchId(branch)) === String(selectedMobileBranchId.value),
    )
    if (!hasSelectedBranch) selectedMobileBranchId.value = ''
    if (!selectedMobileBranchId.value && serviceData.mobileBranches[0]) {
      selectedMobileBranchId.value = String(mobileBranchId(serviceData.mobileBranches[0]))
    }
  } finally {
    if (requestId === mobileBranchRequestId) mobileBranchLocationLoading.value = false
  }
}

async function loadScreen() {
  const sequence = ++loadSequence
  return withAppLoading(async () => {
    cleanupBillCamera()
    loading.value = true
    screen.value = null
    actionError.value = ''
    resetReminderForm()
    showReminderCancelConfirm.value = false
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

    if (
      service.value === 'living' &&
      screenId.value === '4-11' &&
      !serviceData.mobileBranches.length
    ) {
      await go({ name: 'living-screen', params: { screenId: '4-10' } })
      return
    }

    screen.value = nextScreen
    loading.value = false
    const context = await loadContext(service.value, screenId.value)
    if (context?.redirected || sequence !== loadSequence) return

    if (sequence !== loadSequence || !isBillCameraScreen.value) return

    await nextTick()
    if (sequence === loadSequence) await startBillCamera()
  })
}

async function go(target) {
  if (!target) return

  if (REPLACE_TARGETS.has(target.name)) {
    await router.replace(target)
    return
  }

  await router.push(target)
}

async function uploadBill(source, capturedImage = null) {
  actionBusy.value = true
  actionError.value = ''
  try {
    const photo = capturedImage ? null : await takeBillPhoto(source)
    const image = capturedImage ?? (await photoToBlob(photo))
    if (!image) throw new Error('사진을 읽을 수 없어요. 다시 촬영해 주세요.')
    if (source === 'camera') setBillCameraPreview(image)

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

async function captureBillFrame() {
  const video = billCameraVideo.value

  if (!video?.srcObject || !billCameraReady.value) {
    stopBillCamera()
    return uploadBill('camera')
  }

  try {
    const image = await captureVideoFrame(billCameraVideo.value)
    stopBillCamera()
    return uploadBill('camera', image)
  } catch {
    stopBillCamera()
    return uploadBill('camera')
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
    let contacts = []
    try {
      contacts = await getContactCandidates()
    } catch (contactsError) {
      // 권한 거부는 안내 화면으로 보내고, 그 밖의 실패는 직접 검색으로 이어간다.
      if (contactsError?.code === CONTACTS_PERMISSION_DENIED) {
        await go({ name: 'transfer-screen', params: { screenId: '2-06' } })
        return
      }
    }

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

async function openReminder(reminder) {
  const reminderId = reminderIdentifier(reminder)
  if (!reminderId) {
    actionError.value = '알림 정보를 확인할 수 없어요. 목록을 다시 불러와 주세요.'
    return
  }

  await go({
    name: 'living-screen',
    params: { screenId: '4-08' },
    query: { reminderId },
  })
}

async function reloadReminders() {
  if (serviceData.loading.reminders) return

  actionError.value = ''
  try {
    await serviceData.loadReminders({ status: 'SCHEDULED' })
    if (isReminderEmptyScreen.value || isReminderErrorScreen.value) {
      await go({
        name: 'living-screen',
        params: { screenId: serviceData.reminders.length ? '4-06' : '4-17' },
      })
    }
  } catch {
    // The store keeps a concise user-facing error and the current screen stays visible.
  }
}

function validateReminderForm() {
  const title = reminderTitle.value.trim()
  if (!title) return { error: '알림 제목을 입력해 주세요.' }
  if (!reminderDate.value || !reminderTime.value) {
    return { error: '날짜와 시간을 모두 선택해 주세요.' }
  }

  const scheduledAt = buildReminderScheduledAt(reminderDate.value, reminderTime.value)
  if (!scheduledAt) return { error: '날짜와 시간을 다시 선택해 주세요.' }
  if (new Date(scheduledAt).getTime() <= Date.now()) {
    return { error: '현재 이후의 날짜와 시간을 선택해 주세요.' }
  }

  return { request: { title, scheduledAt } }
}

async function saveReminder() {
  if (actionBusy.value || serviceData.loading.reminders) return

  actionError.value = ''
  const validation = validateReminderForm()
  if (validation.error) {
    actionError.value = validation.error
    return
  }

  const operation = isReminderEditScreen.value ? 'update' : 'create'
  actionBusy.value = true
  try {
    if (operation === 'update') {
      await serviceData.updateReminder(reminderTargetId.value, validation.request)
    } else {
      await serviceData.createReminder(validation.request)
    }
    await go({ name: 'living-screen', params: { screenId: '4-06' } })
  } catch (error) {
    actionError.value = reminderMutationMessage(operation, error)
  } finally {
    actionBusy.value = false
  }
}

async function confirmReminderCancel() {
  if (actionBusy.value || !reminderTargetId.value) return

  actionBusy.value = true
  actionError.value = ''
  try {
    await serviceData.cancelReminder(reminderTargetId.value)
    showReminderCancelConfirm.value = false
    await go({ name: 'living-screen', params: { screenId: '4-06' } })
  } catch (error) {
    showReminderCancelConfirm.value = false
    actionError.value = reminderMutationMessage('cancel', error)
  } finally {
    actionBusy.value = false
  }
}

async function handlePrimary() {
  if (!screen.value || isBusy.value) return
  actionError.value = ''

  if (isMobileBranchListScreen.value && mobileBranchPrimaryDisabled.value) return

  if (isReminderErrorScreen.value) return reloadReminders()
  if (isReminderCreateScreen.value || isReminderEditScreen.value) return saveReminder()

  if (service.value === 'bills' && screenId.value === '3-02A') return captureBillFrame()
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
    // 이미 낸 고지서는 다시 실행하지 않고 최초 결과를 보여준다.
    if (billStore.alreadyPaid) {
      return go({ name: 'bills-screen', params: { screenId: '3-13' } })
    }
    // 실행은 진행 화면에서 돈다. 여기서 기다리면 3-21을 볼 수 없다.
    return go({ name: 'bills-screen', params: { screenId: '3-21' } })
  }
  if (service.value === 'bills' && screenId.value === '3-16') {
    await speakBill()
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
  if (
    service.value === 'transfer' &&
    screenId.value === '2-11' &&
    transferStore.transferId &&
    guardianPending.value
  ) {
    const code = guardianCode.value.trim()
    if (!code) {
      actionError.value = '보호자에게 온 번호를 입력해 주세요.'
      return
    }
    try {
      const verified = await transferStore.verifyGuardian(code)
      guardianCode.value = ''
      if (!verified?.verified) {
        await go({ name: 'transfer-screen', params: { screenId: '2-13' } })
        return
      }
      await go({ name: 'transfer-screen', params: { screenId: '2-08' } })
    } catch (error) {
      guardianCode.value = ''
      actionError.value = error.message
      await go({ name: 'transfer-screen', params: { screenId: '2-13' } })
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
  if (service.value === 'transfer' && ['2-28', '2-31'].includes(screenId.value)) {
    const input = {
      label: planLabel.value.trim(),
      recipientName: planLabel.value.trim(),
      amount: Number(planAmount.value.replace(/[^0-9]/g, '')),
      dayOfMonth: Number(planDay.value),
      repeat: planRepeat.value,
    }
    const saved =
      screenId.value === '2-31'
        ? transferPlanStore.updatePlan(planTargetId.value, input)
        : transferPlanStore.addPlan(input)

    if (!saved) {
      actionError.value = transferPlanStore.error || '약속을 저장하지 못했어요.'
      return
    }
    return go({ name: 'transfer-screen', params: { screenId: '2-27' } })
  }
  if (service.value === 'transfer' && screenId.value === '2-29') {
    const due = transferPlanStore.duePlans[0]
    if (!due) return go({ name: 'transfer-screen', params: { screenId: '2-27' } })
    if (transferPlanStore.alreadySentThisMonth(due.id)) {
      return go({
        name: 'transfer-screen',
        params: { screenId: '2-30' },
        query: { planId: due.id },
      })
    }
    // 약속은 알림까지만 한다. 실제 송금은 사용자가 평소 흐름으로 직접 진행한다.
    return go({ name: 'transfer-screen', params: { screenId: '2-02' } })
  }
  if (service.value === 'transfer' && screenId.value === '2-19') {
    if (!transferStore.transferId) {
      transferStore.discardDraft()
      return go(homeRoute.value)
    }
    // 초안이 이미 있으므로 계좌·금액을 다시 고르지 않고 최종 확인으로 간다.
    return go({ name: 'transfer-screen', params: { screenId: '2-08' } })
  }
  if (service.value === 'transfer' && screenId.value === '2-21') {
    transferStore.reset()
    return go({ name: 'transfer-screen', params: { screenId: '2-02' } })
  }
  if (
    service.value === 'transfer' &&
    ['2-12', '2-13'].includes(screenId.value) &&
    transferStore.transferId
  ) {
    try {
      const started = await transferStore.startGuardianVerification()
      guardianCode.value = ''
      if (started?.deliveryFailureCode) {
        actionError.value = '아직 보호자에게 메시지를 보내지 못했어요. 잠시 후 다시 해주세요.'
        return
      }
      await go({ name: 'transfer-screen', params: { screenId: '2-11' } })
    } catch (error) {
      actionError.value = error.message
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
  if (isMobileBranchListScreen.value) {
    const branch = selectedMobileBranch.value
    const branchId = mobileBranchId(branch)
    if (!branch || branchId == null) {
      actionError.value = '이동점포를 하나 선택해 주세요.'
      return
    }
    await go({
      name: 'living-screen',
      params: { screenId: '4-11' },
      query: { branchId: String(branchId) },
    })
    return
  }
  if (isMobileBranchDetailScreen.value) {
    await go({ name: 'living-screen', params: { screenId: '4-10' } })
    return
  }
  return go(primaryRoute.value)
}

/** 고지서 내용을 소리로 읽어준다. 재생 계층은 음성 스토어를 그대로 쓴다. */
async function speakBill() {
  actionError.value = ''
  if (!billSpokenText.value) {
    actionError.value = '읽어드릴 고지서 내용이 없어요.'
    return
  }

  const spoken = await voiceStore.speakText(billSpokenText.value).catch(() => null)
  if (!spoken?.spoken) {
    actionError.value = '소리로 읽어드릴 수 없어 화면으로 안내해 드릴게요.'
  }
}

async function handleSecondary() {
  if (!screen.value || isBusy.value) return
  actionError.value = ''

  if (service.value === 'bills' && screenId.value === '3-16') voiceStore.silence()
  if (service.value === 'bills' && screenId.value === '3-02A') return uploadBill('gallery')
  if (service.value === 'bills' && screenId.value === '3-03') billStore.reset()
  if (isReminderEditScreen.value) {
    showReminderCancelConfirm.value = true
    return
  }
  // 2-31의 두 번째 단추는 약속 삭제다. 되돌릴 수 없어 확인 문구를 남긴다.
  if (service.value === 'transfer' && screenId.value === '2-31' && planTargetId.value) {
    transferPlanStore.removePlan(planTargetId.value)
    return go({ name: 'transfer-screen', params: { screenId: '2-27' } })
  }
  // "없던 일로 하기"는 화면만 넘기지 않고 남아 있던 초안을 실제로 되돌린다.
  if (service.value === 'transfer' && screenId.value === '2-19') {
    if (transferStore.transferId) await transferStore.cancel().catch(() => {})
    transferStore.discardDraft()
  }
  // 보호자 확인 화면의 취소는 화면 이동만이 아니라 거래도 되돌린다.
  if (
    service.value === 'transfer' &&
    ['2-12', '2-13'].includes(screenId.value) &&
    transferStore.transferId
  ) {
    guardianCode.value = ''
    await transferStore.cancel().catch(() => {})
  }
  return go(secondaryRoute.value)
}

function openVoice() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-assist'))
  router.push({ name: 'voice-screen', params: { screenId: '5-08' } })
}

function goBack() {
  return goBackOrReplace(router, backRoute.value)
}

watch(showReminderCancelConfirm, async (visible) => {
  if (!visible) return
  await nextTick()
  reminderCancelDialog.value?.focus()
})

/** 서비스를 완전히 벗어날 때만 세션을 닫는다. 같은 서비스 안의 화면 이동은 유지한다. */
onBeforeRouteLeave((to) => {
  cleanupBillCamera()

  if (!VOICE_SERVICES.includes(service.value)) return
  if (to.meta?.service === service.value || to.name === `${service.value}-home`) return

  voiceStore.silence()
  if (voiceStore.sessionId) voiceStore.closeSession().catch(() => {})
  voiceStore.transcript = ''
})

watch([service, screenId, reminderTargetId], loadScreen, { immediate: true })

/** 3-21에 들어오면 납부를 실행한다. 결과에 따라 완료·실패 화면으로 보낸다. */
watch(
  [service, screenId],
  async () => {
    if (service.value !== 'bills' || screenId.value !== '3-21') return
    if (!billStore.billId || billStore.busy) return
    if (billStore.result) return

    try {
      await billStore.execute()
      await go({ name: 'bills-screen', params: { screenId: '3-07' } })
    } catch (error) {
      actionError.value = error?.message || '납부하지 못했어요. 다시 시도해 주세요.'
      await go({ name: 'bills-screen', params: { screenId: '3-22' } })
    }
  },
  { immediate: true },
)

/** 3-16에 들어오면 바로 읽어준다. */
watch(
  [service, screenId],
  () => {
    if (service.value !== 'bills' || screenId.value !== '3-16') return
    speakBill()
  },
  { immediate: true },
)

/** 약속 화면에 들어올 때 저장소를 읽고, 고치기 화면이면 입력칸을 채운다. */
watch(
  [service, screenId, planTargetId],
  () => {
    if (!isPlanScreen.value) return
    transferPlanStore.ensureLoaded()

    const plan = editingPlan.value
    if (screenId.value === '2-31' && plan) {
      planLabel.value = plan.label
      planAmount.value = String(plan.amount)
      planDay.value = String(plan.dayOfMonth)
      planRepeat.value = plan.repeat
      return
    }
    if (screenId.value === '2-28') {
      planLabel.value = ''
      planAmount.value = ''
      planDay.value = ''
      planRepeat.value = 'MONTHLY'
    }
  },
  { immediate: true },
)
/** 2-20에서 보여줄 잔액이 없으면 계좌를 불러온다. */
watch(
  [service, screenId],
  () => {
    if (service.value !== 'transfer' || screenId.value !== '2-20') return
    if (serviceData.accounts.length || serviceData.loading.accounts) return
    serviceData.loadAccounts({ active: true }).catch(() => {})
  },
  { immediate: true },
)
/** 2-10에 들어오면 보호자에게 확인 요청을 보낸다. 발송 실패는 2-12에서 안내한다. */
watch(
  [service, screenId],
  async () => {
    if (service.value !== 'transfer' || screenId.value !== '2-10') return
    if (!transferStore.transferId || transferStore.guardianVerification) return

    try {
      const started = await transferStore.startGuardianVerification()
      if (started?.deliveryFailureCode) {
        await go({ name: 'transfer-screen', params: { screenId: '2-12' } })
      }
    } catch (error) {
      actionError.value = error?.message || '보호자에게 확인 요청을 보내지 못했어요.'
      await go({ name: 'transfer-screen', params: { screenId: '2-12' } })
    }
  },
  { immediate: true },
)
onBeforeUnmount(cleanupBillCamera)

onMounted(() => {
  if (service.value === 'bills' && screenId.value === '3-02A') billStore.reset()
})
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell service-route-device">
      <header class="app-header">
        <RouterLink
          aria-label="이전 화면"
          class="app-header-button service-route-back"
          :to="backRoute"
          @click.prevent="goBack"
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
          v-if="screen && isBillSourceSelection"
          class="service-route-screen-content screen-content bill-source-selection"
          :data-variant="screen.variant"
        >
          <div class="content">
            <section class="hero">
              <div
                aria-hidden="true"
                class="hero-icon"
              >
                ✓
              </div>
              <div>
                <strong>고지서를 화면 안에 맞춰 주세요</strong>
                <p>빛 반사를 피하면 더 정확해요.</p>
              </div>
            </section>
            <div
              aria-label="고지서 사진 선택"
              class="choices"
              role="group"
            >
              <button
                class="choice"
                :disabled="isBusy"
                type="button"
                @click="go(primaryRoute)"
              >
                카메라 촬영
              </button>
              <button
                class="choice"
                :disabled="isBusy"
                type="button"
                @click="uploadBill('gallery')"
              >
                앨범에서 선택
              </button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isBillCameraScreen"
          class="service-route-screen-content screen-content bill-camera-capture"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div class="viewfinder bill-camera-viewfinder">
              <video
                v-show="billCameraReady && !billCameraPreviewUrl"
                ref="billCameraVideo"
                aria-label="고지서 촬영 미리보기"
                autoplay
                muted
                playsinline
              ></video>
              <div
                v-if="billCameraPreviewUrl"
                aria-live="polite"
                class="bill-camera-preview"
              >
                <img
                  alt="촬영한 고지서 미리보기"
                  :src="billCameraPreviewUrl"
                />
                <p
                  v-if="actionBusy"
                  class="bill-camera-status"
                  role="status"
                >
                  사진을 확인하고 있어요.
                </p>
              </div>
              <div
                v-else-if="!billCameraReady"
                aria-live="polite"
                class="bill-camera-placeholder"
              >
                <span
                  aria-hidden="true"
                  class="bill-camera-placeholder-icon"
                ></span>
                <p
                  class="bill-camera-status"
                  role="status"
                >
                  카메라를 준비하고 있어요.
                </p>
              </div>
              <div
                aria-hidden="true"
                class="vf-corner tl"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner tr"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner bl"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner br"
              ></div>
            </div>
          </div>
        </section>

        <section
          v-if="
            screen?.contentHtml &&
            !(service === 'transfer' && screenId === '2-08') &&
            !hideScreenActions &&
            !isBillSourceSelection &&
            !isBillCameraScreen &&
            !isMobileBranchScreen &&
            !isReminderScreen &&
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

        <section
          v-if="screen && isMobileBranchScreen"
          aria-label="이동점포 정보"
          class="service-route-screen-content screen-content mobile-branch-content"
          :data-variant="screen.variant"
        >
          <div
            v-if="isMobileBranchListScreen && mobileBranchLocationError"
            class="mobile-branch-state mobile-branch-state-error"
            role="alert"
          >
            <strong>현재 위치를 확인할 수 없어요</strong>
            <p>{{ mobileBranchLocationError }}</p>
            <Button
              :disabled="isBusy"
              variant="secondary"
              @click="loadMobileBranchData"
            >
              다시 찾기
            </Button>
          </div>
          <div
            v-else-if="
              isMobileBranchListScreen &&
              (mobileBranchLocationLoading || serviceData.loading.mobileBranches)
            "
            aria-live="polite"
            class="mobile-branch-state"
            role="status"
          >
            <strong>현재 위치와 주변 이동점포를 확인하고 있어요</strong>
            <p>잠시만 기다려 주세요.</p>
          </div>
          <div
            v-else-if="isMobileBranchListScreen && serviceData.errors.mobileBranches"
            class="mobile-branch-state mobile-branch-state-error"
            role="alert"
          >
            <strong>이동점포 정보를 불러오지 못했어요</strong>
            <p>{{ serviceData.errors.mobileBranches.message }}</p>
            <Button
              :disabled="isBusy"
              variant="secondary"
              @click="loadMobileBranchData"
            >
              다시 찾기
            </Button>
          </div>
          <p
            v-else-if="!mobileBranchViewItems.length"
            class="mobile-branch-state"
          >
            {{
              isMobileBranchDetailScreen
                ? '목록에서 이동점포를 먼저 선택해 주세요.'
                : '주변에 예정된 이동점포가 없어요.'
            }}
          </p>
          <div
            v-else
            class="mobile-branch-list"
          >
            <article
              v-for="branch in mobileBranchViewItems"
              :key="mobileBranchId(branch)"
              class="mobile-branch-card"
              :class="{ 'is-selected': isSelectedMobileBranch(branch) }"
            >
              <button
                v-if="isMobileBranchListScreen"
                class="mobile-branch-select"
                :aria-label="`${mobileBranchName(branch)} ${isSelectedMobileBranch(branch) ? '선택됨' : '선택'}`"
                :aria-pressed="isSelectedMobileBranch(branch)"
                type="button"
                @click="selectMobileBranch(branch)"
              >
                <span
                  aria-hidden="true"
                  class="mobile-branch-select-indicator"
                >
                  {{ isSelectedMobileBranch(branch) ? '✓' : '' }}
                </span>
                <span>{{ isSelectedMobileBranch(branch) ? '선택됨' : '이동점포 선택' }}</span>
              </button>
              <div class="mobile-branch-card-body">
                <div class="mobile-branch-card-header">
                  <strong>{{ mobileBranchName(branch) }}</strong>
                  <span>{{ mobileBranchDistance(branch) }}</span>
                </div>
                <p class="mobile-branch-address">{{ mobileBranchAddress(branch) }}</p>
                <dl class="mobile-branch-details">
                  <div>
                    <dt>방문 시간</dt>
                    <dd>{{ mobileBranchSchedule(branch) }}</dd>
                  </div>
                  <div>
                    <dt>가능 업무</dt>
                    <dd>
                      <ul
                        v-if="mobileBranchServices(branch).length"
                        class="mobile-branch-tags"
                      >
                        <li
                          v-for="serviceName in mobileBranchServices(branch)"
                          :key="serviceName"
                        >
                          {{ serviceName }}
                        </li>
                      </ul>
                      <span v-else>안내 없음</span>
                    </dd>
                  </div>
                  <div>
                    <dt>준비물</dt>
                    <dd>
                      <ul
                        v-if="mobileBranchDocuments(branch).length"
                        class="mobile-branch-tags"
                      >
                        <li
                          v-for="document in mobileBranchDocuments(branch)"
                          :key="document"
                        >
                          {{ document }}
                        </li>
                      </ul>
                      <span v-else>안내 없음</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="screen && isReminderListScreen"
          aria-label="리마인더 목록"
          class="service-route-screen-content screen-content reminder-list-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 불러오고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else-if="serviceData.errors.reminders"
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>잠시 후 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
            <p
              v-else-if="!serviceData.reminders.length"
              class="reminder-state"
            >
              등록된 리마인더가 없어요. 아래 버튼으로 새 알림을 만들어 보세요.
            </p>
            <div
              v-else
              class="reminder-list"
            >
              <Button
                v-for="reminder in serviceData.reminders"
                :key="reminderIdentifier(reminder)"
                :aria-label="`${reminder.title || '리마인더'} ${formatReminderDateTime(reminder.scheduledAt)} ${reminderStatusLabel(reminder.status)} 수정 또는 취소`"
                :disabled="isBusy || !reminderIdentifier(reminder)"
                class="reminder-list-item"
                variant="secondary"
                @click="openReminder(reminder)"
              >
                <span class="reminder-list-copy">
                  <strong>{{ reminder.title || '제목 없는 리마인더' }}</strong>
                  <span>{{ formatReminderDateTime(reminder.scheduledAt) }}</span>
                </span>
                <span class="reminder-list-status">
                  {{ reminderStatusLabel(reminder.status) }}
                </span>
              </Button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderEmptyScreen"
          aria-label="리마인더 없음"
          class="service-route-screen-content screen-content reminder-state-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 확인하고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else-if="serviceData.errors.reminders"
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>잠시 후 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
            <div
              v-else
              class="reminder-state"
            >
              <strong>등록된 리마인더가 없어요</strong>
              <p>납부일이나 중요한 일정을 놓치지 않도록 알림을 만들어 보세요.</p>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderErrorScreen"
          aria-label="리마인더 조회 오류"
          class="service-route-screen-content screen-content reminder-state-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 다시 확인하고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>통신 상태를 확인한 뒤 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderFormScreen"
          aria-label="리마인더 입력"
          class="service-route-screen-content screen-content reminder-form-content"
          :data-variant="screen.variant"
        >
          <form
            class="content reminder-form"
            @submit.prevent="handlePrimary"
          >
            <label class="service-route-input-field">
              <span>알림 제목</span>
              <input
                v-model="reminderTitle"
                autocomplete="off"
                maxlength="100"
                placeholder="예: 병원 예약"
                required
                type="text"
                @input="actionError = ''"
              />
            </label>
            <label class="service-route-input-field">
              <span>날짜</span>
              <input
                v-model="reminderDate"
                :min="reminderMinDate"
                required
                type="date"
                @input="actionError = ''"
              />
            </label>
            <label class="service-route-input-field">
              <span>시간</span>
              <input
                v-model="reminderTime"
                required
                step="60"
                type="time"
                @input="actionError = ''"
              />
            </label>
            <p
              aria-live="polite"
              class="reminder-form-hint"
            >
              현재보다 이후인 날짜와 시간을 선택해 주세요.
            </p>
          </form>
        </section>

        <div
          v-if="showReminderCancelConfirm && isReminderEditScreen"
          ref="reminderCancelDialog"
          aria-describedby="reminder-cancel-description"
          aria-labelledby="reminder-cancel-title"
          aria-modal="true"
          class="reminder-cancel-dialog"
          role="dialog"
          tabindex="-1"
          @keydown.esc.stop="showReminderCancelConfirm = false"
        >
          <div class="reminder-cancel-dialog-card">
            <h2 id="reminder-cancel-title">알림을 취소할까요?</h2>
            <p id="reminder-cancel-description">
              {{ selectedReminder?.title || '이 알림' }}을 취소하면 목록에서 사라져요.
            </p>
            <div class="reminder-cancel-actions">
              <Button
                ref="reminderCancelButton"
                variant="secondary"
                @click="showReminderCancelConfirm = false"
              >
                취소하지 않기
              </Button>
              <Button
                variant="destructive"
                @click="confirmReminderCancel"
              >
                알림 취소
              </Button>
            </div>
          </div>
        </div>

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
          v-if="service === 'transfer' && screenId === '2-11' && guardianPending"
          class="service-route-input-field"
        >
          <span>보호자에게 온 인증번호</span>
          <input
            v-model="guardianCode"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="12"
            placeholder="받으신 번호를 그대로 적어주세요"
            type="text"
          />
        </label>

        <label
          v-if="service === 'transfer' && screenId === '2-11' && !guardianPending"
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

        <RouterLink
          v-if="showTransferPinHelp"
          class="service-route-pin-link"
          :to="{ name: 'transfer-pin', query: { from: 'transfer' } }"
        >
          비밀번호를 아직 정하지 않으셨나요? 비밀번호 만들기
        </RouterLink>

        <section
          v-if="service === 'transfer' && screenId === '2-10' && guardianPending"
          aria-label="보호자 확인 안내"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>보호자에게 확인 요청을 보냈어요</strong>
          </div>
          <p class="service-route-live-row">
            보호자가 알려주는 번호를 아래에서 입력하시면 계속 보낼 수 있어요.
          </p>
          <RouterLink
            class="service-route-pin-link"
            :to="{ name: 'transfer-screen', params: { screenId: '2-11' } }"
          >
            인증번호 입력하기
          </RouterLink>
        </section>

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
        <section
          v-if="unfinishedTransferRows.length"
          aria-label="하시던 송금"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>여기까지 하셨어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in unfinishedTransferRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="remainingBalanceRows.length"
          aria-label="남은 잔액"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>계좌에서 빠져나간 금액이 없어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in remainingBalanceRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="service === 'transfer' && screenId === '2-27'"
          aria-label="정해둔 보낼 돈"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>정해두신 보낼 돈</strong>
          </div>
          <p
            v-if="!planRows.length"
            class="service-route-live-empty"
          >
            아직 정해두신 것이 없어요. 아래에서 추가하실 수 있어요.
          </p>
          <div
            v-else
            class="service-route-live-rows"
          >
            <RouterLink
              v-for="row in planRows"
              :key="row.id"
              class="service-route-live-row"
              :to="{
                name: 'transfer-screen',
                params: { screenId: '2-31' },
                query: { planId: row.id },
              }"
            >
              <span>{{ row.label }}{{ row.sent ? ' · 이번 달 보냄' : '' }}</span>
              <b>{{ row.value }}</b>
            </RouterLink>
          </div>
        </section>

        <section
          v-if="duePlanRows.length"
          aria-label="오늘 보낼 돈"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>오늘 보내실 것</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in duePlanRows"
              :key="row.id"
              class="service-route-live-row"
            >
              <span>{{ row.label }}{{ row.sent ? ' · 이번 달 보냄' : '' }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="sentPlanRows.length"
          aria-label="이미 보낸 약속"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>이번 달에 이미 보내셨어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in sentPlanRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <template v-if="isPlanFormScreen">
          <label class="service-route-input-field">
            <span>무엇을 보내는 돈인가요</span>
            <input
              v-model="planLabel"
              maxlength="30"
              placeholder="예: 월세, 손주 용돈"
              type="text"
            />
          </label>
          <label class="service-route-input-field">
            <span>보낼 금액</span>
            <input
              v-model="planAmount"
              inputmode="numeric"
              maxlength="12"
              placeholder="예: 400000"
              type="text"
            />
          </label>
          <label class="service-route-input-field">
            <span>보낼 날짜 (1~31일)</span>
            <input
              v-model="planDay"
              inputmode="numeric"
              maxlength="2"
              placeholder="예: 25"
              type="text"
            />
          </label>
          <fieldset class="service-route-input-field">
            <legend>얼마나 자주 보낼까요</legend>
            <Button
              class="w-full"
              :variant="planRepeat === 'MONTHLY' ? 'default' : 'secondary'"
              @click="planRepeat = 'MONTHLY'"
            >
              매달 반복
            </Button>
            <Button
              class="w-full"
              :variant="planRepeat === 'ONCE' ? 'default' : 'secondary'"
              @click="planRepeat = 'ONCE'"
            >
              이번 한 번만
            </Button>
          </fieldset>
        </template>

        <section
          v-if="billPaymentRows.length || billDuplicateRows.length"
          :aria-label="billDuplicateRows.length ? '이미 처리된 납부' : '납부 진행'"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>
              {{ billDuplicateRows.length ? '처음 완료된 결과예요' : '은행에 보내고 있어요' }}
            </strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in billDuplicateRows.length ? billDuplicateRows : billPaymentRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
          <p
            v-if="billDuplicateRows.length"
            class="service-route-live-empty"
          >
            돈이 두 번 빠져나가지 않았어요.
          </p>
        </section>

        <section
          v-if="service === 'bills' && screenId === '3-16' && billSpokenText"
          aria-label="읽고 있는 내용"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>읽고 있는 내용</strong>
          </div>
          <p class="service-route-live-row">{{ billSpokenText }}</p>
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
        <footer
          v-if="
            screen &&
            !hideScreenActions &&
            !isBillSourceSelection &&
            (screen.primaryLabel || screen.secondaryLabel)
          "
          class="app-actions service-route-actions"
        >
          <Button
            v-if="screen.primaryLabel"
            class="service-route-primary"
            :disabled="isBusy || mobileBranchPrimaryDisabled"
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
      </main>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items service-route-bottom-nav"
      >
        <RouterLink
          replace
          :to="{ name: 'transfer-home' }"
          >홈</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'bills-home' }"
          >고지서</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'living-home' }"
          >생활금융</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'my-page' }"
          >마이페이지</RouterLink
        >
      </nav>
    </article>
  </div>
</template>
