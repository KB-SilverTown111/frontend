import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import { goBackOrReplace } from '@/shared/lib/navigation.js'
import { withAppLoading } from '@/shared/services/appLoading.js'
import {
  getProductionActionRoutes,
  getProductionHomeRoute,
  loadProductionScreen,
} from '@/features/service-screen/services/productionServiceScreens.js'
import {
  captureVideoFrame,
  CONTACTS_PERMISSION_DENIED,
  getContactCandidates,
  getCurrentLocation,
  photoToBlob,
  takeBillPhoto,
} from '@/shared/native/nativeCapabilities.js'
import { mobileBranchId } from '@/features/living/mobile-branch/presentation.js'
import { useBillStore } from '@/features/bills/stores/bill.js'
import { useServiceDataStore } from '@/features/living/stores/serviceData.js'
import { useTransferPlanStore } from '@/features/transfer/stores/transferPlan.js'
import { useTransferStore } from '@/features/transfer/stores/transfer.js'
import { useVoiceStore } from '@/features/voice/stores/voice.js'

export function useServiceScreen() {
  const route = useRoute()
  const router = useRouter()
  const serviceData = useServiceDataStore()
  const transferStore = useTransferStore()
  const transferPlanStore = useTransferPlanStore()
  const billStore = useBillStore()
  const voiceStore = useVoiceStore()

  const service = computed(() => String(route.meta.service || '').trim())
  const screenKey = computed(() => String(route.params.screenKey || ''))
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
  const PLAN_SCREENS = [
    'transfer-scheduled-list',
    'transfer-scheduled-create',
    'transfer-scheduled-due',
    'transfer-scheduled-complete',
    'transfer-scheduled-edit',
  ]
  const isPlanScreen = computed(
    () => service.value === 'transfer' && PLAN_SCREENS.includes(screenKey.value),
  )
  const isPlanFormScreen = computed(
    () =>
      service.value === 'transfer' &&
      ['transfer-scheduled-create', 'transfer-scheduled-edit'].includes(screenKey.value),
  )
  const editingPlan = computed(() => transferPlanStore.findPlan(planTargetId.value))

  const actionRoutes = computed(() => getProductionActionRoutes(service.value, screenKey.value))
  const homeRoute = computed(() => getProductionHomeRoute(service.value))
  const isMyPageDetail = computed(
    () =>
      (service.value === 'living' &&
        ['living-profile-edit', 'living-emergency-contact-edit', 'living-consents'].includes(
          screenKey.value,
        )) ||
      Boolean(route.meta?.myPageVoice),
  )
  const backRoute = computed(() => (isMyPageDetail.value ? { name: 'my-page' } : homeRoute.value))
  const primaryRoute = computed(() => actionRoutes.value.primary)
  const secondaryRoute = computed(() => actionRoutes.value.secondary)
  const VOICE_CONVERSATION_SCREENS = {
    transfer: [
      'transfer-listening',
      'transfer-processing',
      'transfer-speaking',
      'transfer-voice-recognition-failed',
      'transfer-replay',
      'transfer-misheard',
      'transfer-conversation-ended',
    ],
    voice: ['voice-enabled'],
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
    (VOICE_CONVERSATION_SCREENS[service.value] ?? []).includes(screenKey.value),
  )
  const isBillSourceSelection = computed(
    () => service.value === 'bills' && screenKey.value === 'bill-source-select',
  )
  const isBillCameraScreen = computed(
    () => service.value === 'bills' && screenKey.value === 'bill-camera',
  )
  const isBillSuccessScreen = computed(
    () => service.value === 'bills' && screenKey.value === 'bill-complete',
  )
  const isReminderListScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-reminders',
  )
  const isReminderCreateScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-reminder-create',
  )
  const isReminderEditScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-reminder-edit',
  )
  const isReminderEmptyScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-reminders-empty',
  )
  const isReminderErrorScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-reminders-error',
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
    () => service.value === 'living' && screenKey.value === 'living-branches',
  )
  const isMobileBranchDetailScreen = computed(
    () => service.value === 'living' && screenKey.value === 'living-branch-detail',
  )
  const isMobileBranchScreen = computed(
    () => isMobileBranchListScreen.value || isMobileBranchDetailScreen.value,
  )
  const mobileBranchLocationError = ref('')
  const mobileBranchLocationLoading = ref(false)
  const selectedMobileBranchId = ref('')
  let mobileBranchRequestId = 0

  /**
   * transfer-listening만 패널의 키보드 입력과 화면 버튼 라벨이 겹친다.
   * 나머지 음성 화면은 취소·다시 말하기 같은 이동 경로가 화면 버튼에만 있으므로 유지한다.
   */
  const hideScreenActions = computed(
    () => service.value === 'transfer' && screenKey.value === 'transfer-listening',
  )
  const TRANSFER_FLOW_SCREENS = [
    'transfer-recipient-select',
    'transfer-amount-confirm',
    'transfer-confirm',
    'transfer-complete',
    'transfer-recipient-confirm',
    'transfer-account-select',
    'transfer-failed',
  ]
  const showTransferFlow = computed(
    () => service.value === 'transfer' && TRANSFER_FLOW_SCREENS.includes(screenKey.value),
  )
  /** PIN을 아직 정하지 않아 transfer-guardian-confirm 인증이 막힌 사용자에게 등록 화면 경로를 준다. */
  const TRANSFER_PIN_HELP_SCREENS = ['transfer-guardian-confirm', 'transfer-authentication-expired']
  const showTransferPinHelp = computed(
    () => service.value === 'transfer' && TRANSFER_PIN_HELP_SCREENS.includes(screenKey.value),
  )
  /**
   * transfer-guardian-confirm은 화면 문구부터 "인증값 입력"으로 일반화돼 있다.
   * 보호자 확인이 진행 중이면 인증번호를, 아니면 거래 승인 PIN을 받는다.
   */
  const guardianPending = computed(
    () => service.value === 'transfer' && Boolean(transferStore.guardianVerification),
  )
  const showRecipientSearch = computed(
    () =>
      service.value === 'transfer' &&
      ['transfer-recipient-select', 'transfer-recipient-not-found'].includes(screenKey.value),
  )
  const liveKind = computed(() => {
    if (service.value === 'living') {
      if (
        ['living-accounts', 'living-accounts-empty', 'living-accounts-error'].includes(
          screenKey.value,
        )
      )
        return 'accounts'
    }
    if (
      service.value === 'bills' &&
      billStore.bill &&
      [
        'bill-ocr-processing',
        'bill-review',
        'bill-low-confidence',
        'bill-confirm',
        'bill-complete',
        'bill-expired',
        'bill-payment-number',
        'bill-read-accuracy',
      ].includes(screenKey.value)
    ) {
      return 'bill'
    }
    return ''
  })

  const liveTitle = computed(() => {
    if (isBillSuccessScreen.value) return '납부 결과'

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
    if (liveKind.value === 'bill' && isBillSuccessScreen.value && billStore.result) {
      const paymentId = String(billStore.result?.paymentId ?? '').trim()
      const amount = Number(billStore.result?.amount)
      const paidAt = billStore.result?.paidAt

      return [
        paymentId ? { label: '결제 번호', value: paymentId } : null,
        Number.isFinite(amount) ? { label: '납부 금액', value: formatCurrency(amount) } : null,
        paidAt ? { label: '처리 시각', value: formatDateTime(paidAt) } : null,
      ].filter(Boolean)
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
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-confirm') return []

    const recipient = transferStore.recipient || {}
    const account = transferStore.selectedAccount || {}
    return [
      {
        label: '받는 분',
        value:
          recipient.name ||
          recipient.displayName ||
          recipient.accountHolderName ||
          '받는 분 확인 중',
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
  /** transfer-existing-plan는 어디까지 하셨는지 실제 초안 내용으로 보여준다. */
  const unfinishedTransferRows = computed(() => {
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-existing-plan') return []

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

  /** transfer-not-sent은 돈이 나가지 않았음을 남은 잔액으로 확인시켜 준다. */
  const remainingBalanceRows = computed(() => {
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-not-sent') return []

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

  /** transfer-scheduled-list은 정해둔 약속을 날짜순으로 보여준다. */
  const planRows = computed(() => {
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-scheduled-list') return []

    return transferPlanStore.sortedPlans.map((plan) => ({
      id: plan.id,
      label: `${plan.label} · ${planScheduleLabel(plan)}`,
      value: formatCurrency(plan.amount),
      sent: transferPlanStore.alreadySentThisMonth(plan.id),
    }))
  })

  /** transfer-scheduled-due는 오늘 보낼 약속만 보여준다. */
  const duePlanRows = computed(() => {
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-scheduled-due') return []

    return transferPlanStore.duePlans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      value: formatCurrency(plan.amount),
      sent: transferPlanStore.alreadySentThisMonth(plan.id),
    }))
  })

  /** transfer-scheduled-complete은 이번 달에 이미 보낸 약속을 확인시켜 준다. */
  const sentPlanRows = computed(() => {
    if (service.value !== 'transfer' || screenKey.value !== 'transfer-scheduled-complete') return []

    const plan = editingPlan.value
    if (!plan) return []

    return [
      { label: '보낼 돈', value: plan.label },
      { label: '금액', value: formatCurrency(plan.amount) },
      { label: '보낸 날', value: formatDate(plan.lastSentAt) },
    ]
  })

  /** bill-paying은 실제 납부 금액을 보여준다. */
  const billPaymentRows = computed(() => {
    if (service.value !== 'bills' || screenKey.value !== 'bill-paying') return []
    if (!billStore.bill) return []

    return [
      { label: '납부처', value: billStore.bill.payee || '확인 중' },
      { label: '납부 금액', value: formatCurrency(billStore.bill.amount) },
    ]
  })

  /** bill-duplicate-request은 최초 납부 결과를 그대로 다시 보여준다. */
  const billDuplicateRows = computed(() => {
    if (service.value !== 'bills' || screenKey.value !== 'bill-duplicate-request') return []

    const paid = billStore.result
    if (!paid && !billStore.bill) return []

    const rows = [
      {
        label: '상태',
        value: paid?.status === 'PAID' || billStore.alreadyPaid ? '완료' : '확인 중',
      },
      { label: '납부 금액', value: formatCurrency(paid?.amount ?? billStore.bill?.amount) },
    ]

    // 결제 번호와 납부 시각은 납부 응답에만 담겨 온다. 조회로는 받을 수 없으므로
    // 이전에 끝난 납부는 값을 비워 두고 아래 안내 문구로 대신한다.
    if (billStore.paymentId) rows.push({ label: '결제 번호', value: billStore.paymentId })
    if (paid?.paidAt) rows.push({ label: '납부한 날', value: formatDate(paid.paidAt) })
    return rows
  })

  /** 결제 번호를 모르는 경우에도 두 번 빠져나가지 않았다는 것은 분명히 알린다. */
  const billDuplicateNote = computed(() =>
    billStore.paymentId
      ? '돈이 두 번 빠져나가지 않았어요.'
      : '이전에 납부가 끝난 고지서예요. 돈이 두 번 빠져나가지 않았어요.',
  )

  /** bill-read-aloud에서 읽어줄 문장. 금액과 기한을 사람이 듣기 쉬운 순서로 붙인다. */
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

  function formatDateTime(value) {
    if (!value) return '처리 시각 확인 중'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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

    if (
      currentService === 'bills' &&
      currentScreenId === 'bill-complete' &&
      billStore.result?.status !== 'SUCCESS'
    ) {
      await go({ name: 'bills-home' })
      return { redirected: true }
    }

    if (currentService === 'living') {
      if (
        ['living-accounts', 'living-accounts-empty', 'living-accounts-error'].includes(
          currentScreenId,
        )
      ) {
        await serviceData.loadAccounts({ active: true }).catch(() => {})
      }
      if (
        [
          'living-reminders',
          'living-reminder-edit',
          'living-reminders-empty',
          'living-reminders-error',
        ].includes(currentScreenId)
      ) {
        await serviceData.loadReminders({ status: 'SCHEDULED' }).catch(() => {})

        if (currentScreenId === 'living-reminders') {
          if (serviceData.errors.reminders) {
            await go({ name: 'living-screen', params: { screenKey: 'living-reminders-error' } })
            return { redirected: true }
          }
          if (!serviceData.reminders.length) {
            await go({ name: 'living-screen', params: { screenKey: 'living-reminders-empty' } })
            return { redirected: true }
          }
        }

        if (currentScreenId === 'living-reminders-empty' && !serviceData.errors.reminders) {
          if (serviceData.reminders.length) {
            await go({ name: 'living-screen', params: { screenKey: 'living-reminders' } })
            return { redirected: true }
          }
        }

        if (currentScreenId === 'living-reminders-error' && !serviceData.errors.reminders) {
          await go({
            name: 'living-screen',
            params: {
              screenKey: serviceData.reminders.length
                ? 'living-reminders'
                : 'living-reminders-empty',
            },
          })
          return { redirected: true }
        }

        if (currentScreenId === 'living-reminder-edit') {
          if (serviceData.errors.reminders || !reminderTargetId.value || !selectedReminder.value) {
            await go({ name: 'living-screen', params: { screenKey: 'living-reminders' } })
            return { redirected: true }
          }
          fillReminderForm(selectedReminder.value)
        }
      }
      if (currentScreenId === 'living-branches') await loadMobileBranchData()
    }

    if (
      currentService === 'transfer' &&
      ['transfer-confirm', 'transfer-account-select'].includes(currentScreenId)
    ) {
      await serviceData.loadAccounts({ active: true }).catch(() => {})
    }

    if (currentService === 'transfer' && currentScreenId === 'transfer-listening') {
      transferStore.reset()
      // 비운 뒤에 심어야 한다. 약속에서 시작한 송금만 이 값을 갖는다.
      if (planTargetId.value) {
        transferStore.setPlanId(planTargetId.value)
        // 쿼리를 지워야 새로고침이나 뒤로 가기로 예약 ID가 되살아나지 않는다.
        const planQuery = { ...route.query }
        delete planQuery.planId
        await router.replace({ query: planQuery })
      }
      recipientKeyword.value = ''
      transferAmountInput.value = ''
    }

    if (
      currentService === 'transfer' &&
      currentScreenId === 'transfer-amount-confirm' &&
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
        nextScreen = await loadProductionScreen(service.value, screenKey.value)
      } catch {
        if (sequence !== loadSequence) return
        actionError.value = '화면을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      }
      if (sequence !== loadSequence) return

      if (
        service.value === 'living' &&
        screenKey.value === 'living-branch-detail' &&
        !serviceData.mobileBranches.length
      ) {
        await go({ name: 'living-screen', params: { screenKey: 'living-branches' } })
        return
      }

      screen.value = nextScreen
      loading.value = false
      const context = await loadContext(service.value, screenKey.value)
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
      await go({ name: 'bills-screen', params: { screenKey: 'bill-review' } })
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
          await go({
            name: 'transfer-screen',
            params: { screenKey: 'transfer-contacts-permission' },
          })
          return
        }
      }

      const found = await transferStore.findRecipients({
        keyword,
        contacts: contacts.slice(0, 200),
      })
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
    await go({ name: 'transfer-screen', params: { screenKey: 'transfer-account-select' } })
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
      params: { screenKey: 'living-reminder-edit' },
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
          params: {
            screenKey: serviceData.reminders.length ? 'living-reminders' : 'living-reminders-empty',
          },
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
      await go({ name: 'living-screen', params: { screenKey: 'living-reminders' } })
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
      await go({ name: 'living-screen', params: { screenKey: 'living-reminders' } })
    } catch (error) {
      showReminderCancelConfirm.value = false
      actionError.value = reminderMutationMessage('cancel', error)
    } finally {
      actionBusy.value = false
    }
  }

  async function confirmBill() {
    try {
      const response = await billStore.confirm({
        approved: true,
        confirmedPayee: billStore.bill?.payee,
        confirmedAmount: billStore.bill?.amount,
        confirmedDueDate: billStore.bill?.dueDate,
      })
      if (
        response?.status === 'RECONFIRM' ||
        response?.status !== 'CONFIRMED' ||
        response?.executable !== true ||
        !response?.confirmationToken
      ) {
        if (screenKey.value !== 'bill-low-confidence') {
          await go({ name: 'bills-screen', params: { screenKey: 'bill-low-confidence' } })
          return
        }

        actionError.value = '입력한 고지서 정보를 다시 확인해 주세요.'
        return
      }

      await go({ name: 'bills-screen', params: { screenKey: 'bill-confirm' } })
    } catch (error) {
      actionError.value = error?.message || '고지서 정보를 확인하지 못했어요. 다시 시도해 주세요.'
    }
  }

  async function handlePrimary() {
    if (!screen.value || isBusy.value) return
    actionError.value = ''

    if (isMobileBranchListScreen.value && mobileBranchPrimaryDisabled.value) return

    if (isReminderErrorScreen.value) return reloadReminders()
    if (isReminderCreateScreen.value || isReminderEditScreen.value) return saveReminder()

    if (service.value === 'bills' && screenKey.value === 'bill-camera') return captureBillFrame()
    if (
      service.value === 'bills' &&
      ['bill-review', 'bill-low-confidence'].includes(screenKey.value) &&
      billStore.billId
    ) {
      await confirmBill()
      return
    }
    if (service.value === 'bills' && screenKey.value === 'bill-confirm' && billStore.billId) {
      // 이미 낸 고지서는 다시 실행하지 않고 최초 결과를 보여준다.
      if (billStore.alreadyPaid) {
        return go({ name: 'bills-screen', params: { screenKey: 'bill-duplicate-request' } })
      }
      // 실행은 진행 화면에서 돈다. 여기서 기다리면 bill-paying을 볼 수 없다.
      return go({ name: 'bills-screen', params: { screenKey: 'bill-paying' } })
    }
    if (service.value === 'bills' && screenKey.value === 'bill-read-aloud') {
      await speakBill()
      return
    }
    if (
      service.value === 'transfer' &&
      ['transfer-recipient-select', 'transfer-recipient-confirm'].includes(screenKey.value)
    ) {
      if (!transferStore.candidates.length) return loadRecipients()
      if (!transferStore.selectedRecipient) {
        actionError.value = '받는 분을 직접 선택해 주세요.'
        return
      }
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-account-select' } })
    }
    if (service.value === 'transfer' && screenKey.value === 'transfer-account-select') {
      if (!transferStore.fromAccount) {
        actionError.value = '출금할 계좌를 직접 선택해 주세요.'
        return
      }
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-amount-confirm' } })
    }
    if (service.value === 'transfer' && screenKey.value === 'transfer-amount-confirm') {
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
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-confirm' } })
      } catch (error) {
        actionError.value = error.message
      }
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-confirm' &&
      !transferStore.transferId
    ) {
      actionError.value = '송금 정보를 다시 확인해 주세요.'
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-confirm' &&
      transferStore.transferId
    ) {
      try {
        if (!transferStore.riskCleared) {
          const risk = await transferStore.assessRisk()
          if (transferStore.isRiskHeld(risk)) {
            await go({ name: 'transfer-screen', params: { screenKey: 'transfer-pending' } })
            return
          }
          if (needsAdditionalRiskCheck(risk)) {
            await go({ name: 'transfer-screen', params: { screenKey: 'transfer-risk-confirm' } })
            return
          }
        }
        const confirmed = await transferStore.confirm({ approved: true })
        if (!confirmed?.executable || !transferStore.executable) {
          actionError.value = '지금은 송금을 진행할 수 없어요.'
          return
        }
        // 실행 전에 거래 승인 비밀번호를 확인한다.
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-guardian-confirm' } })
      } catch (error) {
        actionError.value = error.message
      }
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-risk-confirm' &&
      !transferStore.transferId
    ) {
      actionError.value = '송금 정보를 다시 확인해 주세요.'
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-risk-confirm' &&
      transferStore.transferId
    ) {
      try {
        const risk = await transferStore.checkRisk({
          purposeAnswer: riskPurpose.value.trim() || null,
        })
        if (transferStore.isRiskHeld(risk)) {
          await go({ name: 'transfer-screen', params: { screenKey: 'transfer-pending' } })
        } else if (needsAdditionalRiskCheck(risk)) {
          actionError.value = riskWarning(risk)
        } else {
          await go({ name: 'transfer-screen', params: { screenKey: 'transfer-confirm' } })
        }
      } catch (error) {
        actionError.value = error.message
      }
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-guardian-confirm' &&
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
          await go({
            name: 'transfer-screen',
            params: { screenKey: 'transfer-authentication-expired' },
          })
          return
        }
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-confirm' } })
      } catch (error) {
        guardianCode.value = ''
        actionError.value = error.message
        await go({
          name: 'transfer-screen',
          params: { screenKey: 'transfer-authentication-expired' },
        })
      }
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-guardian-confirm' &&
      transferStore.transferId
    ) {
      const pin = transferPin.value.trim()
      if (!/^\d{6}$/.test(pin)) {
        actionError.value = '송금 PIN 6자리를 입력해 주세요.'
        return
      }
      try {
        const authenticated = await transferStore.authenticate({ pin })
        transferPin.value = ''
        if (!authenticated?.authenticated || !transferStore.authenticationCompleted) {
          await go({
            name: 'transfer-screen',
            params: { screenKey: 'transfer-authentication-expired' },
          })
          return
        }
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-executing' } })
      } catch (error) {
        transferPin.value = ''
        actionError.value = error.message
        await go({
          name: 'transfer-screen',
          params: { screenKey: 'transfer-authentication-expired' },
        })
      }
      return
    }
    if (
      service.value === 'transfer' &&
      ['transfer-scheduled-create', 'transfer-scheduled-edit'].includes(screenKey.value)
    ) {
      const input = {
        label: planLabel.value.trim(),
        recipientName: planLabel.value.trim(),
        amount: Number(planAmount.value.replace(/[^0-9]/g, '')),
        dayOfMonth: Number(planDay.value),
        repeat: planRepeat.value,
      }
      const saved =
        screenKey.value === 'transfer-scheduled-edit'
          ? transferPlanStore.updatePlan(planTargetId.value, input)
          : transferPlanStore.addPlan(input)

      if (!saved) {
        actionError.value = transferPlanStore.error || '약속을 저장하지 못했어요.'
        return
      }
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-scheduled-list' } })
    }
    if (service.value === 'transfer' && screenKey.value === 'transfer-scheduled-due') {
      const due = transferPlanStore.duePlans[0]
      if (!due)
        return go({ name: 'transfer-screen', params: { screenKey: 'transfer-scheduled-list' } })
      if (transferPlanStore.alreadySentThisMonth(due.id)) {
        return go({
          name: 'transfer-screen',
          params: { screenKey: 'transfer-scheduled-complete' },
          query: { planId: due.id },
        })
      }
      // 약속은 알림까지만 한다. 실제 송금은 사용자가 평소 흐름으로 직접 진행한다.
      // transfer-listening는 진입할 때 송금 상태를 비우므로 예약 ID는 화면 이동으로 넘긴다.
      return go({
        name: 'transfer-screen',
        params: { screenKey: 'transfer-listening' },
        query: { planId: due.id },
      })
    }
    if (service.value === 'transfer' && screenKey.value === 'transfer-existing-plan') {
      if (!transferStore.transferId) {
        transferStore.discardDraft()
        return go(homeRoute.value)
      }
      // 초안이 이미 있으므로 계좌·금액을 다시 고르지 않고 최종 확인으로 간다.
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-confirm' } })
    }
    if (service.value === 'transfer' && screenKey.value === 'transfer-expired') {
      transferStore.reset()
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-listening' } })
    }
    if (
      service.value === 'transfer' &&
      ['transfer-guardian-message-failed', 'transfer-authentication-expired'].includes(
        screenKey.value,
      ) &&
      transferStore.transferId
    ) {
      try {
        const started = await transferStore.startGuardianVerification()
        guardianCode.value = ''
        if (started?.deliveryFailureCode) {
          actionError.value = '아직 보호자에게 메시지를 보내지 못했어요. 잠시 후 다시 해주세요.'
          return
        }
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-guardian-confirm' } })
      } catch (error) {
        actionError.value = error.message
      }
      return
    }
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-executing' &&
      transferStore.transferId
    ) {
      if (!transferStore.confirmationCompleted || !transferStore.authenticationCompleted) {
        actionError.value = '확인 절차가 끝나지 않았어요. 다시 확인해 주세요.'
        return
      }
      try {
        const executed = await transferStore.execute()
        // 실제로 보내진 경우에만 약속에 기록한다. 실패하면 다시 보낼 수 있어야 한다.
        if (executed?.status === 'SUCCESS' && transferStore.planId) {
          // 저장까지 성공한 경우에만 정리한다. 실패하면 다음 기회에 다시 기록한다.
          if (transferPlanStore.markSent(transferStore.planId)) {
            transferStore.clearPlanId()
          }
        }
        await go({
          name: 'transfer-screen',
          params: {
            screenKey: executed?.status === 'SUCCESS' ? 'transfer-complete' : 'transfer-failed',
          },
        })
      } catch (error) {
        actionError.value = error.message
        await go({ name: 'transfer-screen', params: { screenKey: 'transfer-failed' } })
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
        params: { screenKey: 'living-branch-detail' },
        query: { branchId: String(branchId) },
      })
      return
    }
    if (isMobileBranchDetailScreen.value) {
      await go({ name: 'living-screen', params: { screenKey: 'living-branches' } })
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

    if (service.value === 'bills' && screenKey.value === 'bill-read-aloud') voiceStore.silence()
    if (service.value === 'bills' && screenKey.value === 'bill-camera') return uploadBill('gallery')
    if (service.value === 'bills' && screenKey.value === 'bill-ocr-processing') billStore.reset()
    if (isReminderEditScreen.value) {
      showReminderCancelConfirm.value = true
      return
    }
    // transfer-scheduled-edit의 두 번째 단추는 약속 삭제다. 되돌릴 수 없어 확인 문구를 남긴다.
    if (
      service.value === 'transfer' &&
      screenKey.value === 'transfer-scheduled-edit' &&
      planTargetId.value
    ) {
      const removed = transferPlanStore.removePlan(planTargetId.value)
      if (!removed) {
        actionError.value = transferPlanStore.error || '약속을 삭제하지 못했어요.'
        return
      }
      return go({ name: 'transfer-screen', params: { screenKey: 'transfer-scheduled-list' } })
    }
    // "없던 일로 하기"는 화면만 넘기지 않고 남아 있던 초안을 실제로 되돌린다.
    if (service.value === 'transfer' && screenKey.value === 'transfer-existing-plan') {
      if (transferStore.transferId) await transferStore.cancel().catch(() => {})
      transferStore.discardDraft()
    }
    // 보호자 확인 화면의 취소는 화면 이동만이 아니라 거래도 되돌린다.
    if (
      service.value === 'transfer' &&
      ['transfer-guardian-message-failed', 'transfer-authentication-expired'].includes(
        screenKey.value,
      ) &&
      transferStore.transferId
    ) {
      guardianCode.value = ''
      await transferStore.cancel().catch(() => {})
    }
    return go(secondaryRoute.value)
  }

  function openVoice() {
    window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-assist'))
    router.push({ name: 'voice-screen', params: { screenKey: 'voice-enabled' } })
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

    // 고지서 읽어주기는 음성 서비스가 아니라 아래 조건에 걸리지 않는다.
    // 화면을 벗어난 뒤에도 금액이 계속 들리지 않도록 여기서 먼저 끊는다.
    if (service.value === 'bills' && screenKey.value === 'bill-read-aloud') voiceStore.silence()

    if (!VOICE_SERVICES.includes(service.value)) return
    if (to.meta?.service === service.value || to.name === `${service.value}-home`) return

    voiceStore.silence()
    if (voiceStore.sessionId) voiceStore.closeSession().catch(() => {})
    voiceStore.transcript = ''
  })

  watch([service, screenKey, reminderTargetId], loadScreen, { immediate: true })

  /** bill-paying에 들어오면 납부를 실행한다. 결과에 따라 완료·실패 화면으로 보낸다. */
  watch(
    // billId를 함께 본다. ?billId=로 바로 들어오면 고지서를 읽기 전에 한 번 돌기 때문이다.
    [service, screenKey, () => billStore.billId],
    async () => {
      if (service.value !== 'bills' || screenKey.value !== 'bill-paying') return
      if (!billStore.billId || billStore.busy) return
      if (billStore.alreadyPaid) {
        await go({ name: 'bills-screen', params: { screenKey: 'bill-duplicate-request' } })
        return
      }
      if (billStore.result) {
        await go({
          name: 'bills-screen',
          params: {
            screenKey:
              billStore.result.status === 'SUCCESS' ? 'bill-complete' : 'bill-payment-failed',
          },
        })
        return
      }

      const context = await loadContext(service.value, screenKey.value)
      if (context?.redirected) return
      if (
        billStore.bill?.status !== 'CONFIRMED' ||
        billStore.bill?.executable !== true ||
        !String(billStore.confirmationToken || '').trim()
      ) {
        await go({ name: 'bills-screen', params: { screenKey: 'bill-low-confidence' } })
        return
      }

      try {
        const response = await billStore.execute()
        await go({
          name: 'bills-screen',
          params: {
            screenKey: response?.status === 'SUCCESS' ? 'bill-complete' : 'bill-payment-failed',
          },
        })
      } catch (error) {
        actionError.value = error?.message || '납부하지 못했어요. 다시 시도해 주세요.'
        await go({ name: 'bills-screen', params: { screenKey: 'bill-payment-failed' } })
      }
    },
    { immediate: true },
  )

  /** bill-read-aloud에 들어오면 바로 읽어준다. */
  watch(
    [service, screenKey],
    () => {
      if (service.value !== 'bills' || screenKey.value !== 'bill-read-aloud') return
      speakBill()
    },
    { immediate: true },
  )

  /** 약속 화면에 들어올 때 저장소를 읽고, 고치기 화면이면 입력칸을 채운다. */
  watch(
    [service, screenKey, planTargetId],
    () => {
      if (!isPlanScreen.value) return
      transferPlanStore.ensureLoaded()

      const plan = editingPlan.value
      if (screenKey.value === 'transfer-scheduled-edit' && plan) {
        planLabel.value = plan.label
        planAmount.value = String(plan.amount)
        planDay.value = String(plan.dayOfMonth)
        planRepeat.value = plan.repeat
        return
      }
      if (screenKey.value === 'transfer-scheduled-create') {
        planLabel.value = ''
        planAmount.value = ''
        planDay.value = ''
        planRepeat.value = 'MONTHLY'
      }
    },
    { immediate: true },
  )
  /** transfer-not-sent에서 보여줄 잔액이 없으면 계좌를 불러온다. */
  watch(
    [service, screenKey],
    () => {
      if (service.value !== 'transfer' || screenKey.value !== 'transfer-not-sent') return
      if (serviceData.accounts.length || serviceData.loading.accounts) return
      serviceData.loadAccounts({ active: true }).catch(() => {})
    },
    { immediate: true },
  )
  /** transfer-pending에 들어오면 보호자에게 확인 요청을 보낸다. 발송 실패는 transfer-guardian-message-failed에서 안내한다. */
  watch(
    [service, screenKey],
    async () => {
      if (service.value !== 'transfer' || screenKey.value !== 'transfer-pending') return
      if (!transferStore.transferId || transferStore.guardianVerification) return

      try {
        const started = await transferStore.startGuardianVerification()
        if (started?.deliveryFailureCode) {
          await go({
            name: 'transfer-screen',
            params: { screenKey: 'transfer-guardian-message-failed' },
          })
        }
      } catch (error) {
        actionError.value = error?.message || '보호자에게 확인 요청을 보내지 못했어요.'
        await go({
          name: 'transfer-screen',
          params: { screenKey: 'transfer-guardian-message-failed' },
        })
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(cleanupBillCamera)

  onMounted(() => {
    if (service.value === 'bills' && screenKey.value === 'bill-camera') billStore.reset()
  })

  return {
    route,
    router,
    serviceData,
    transferStore,
    transferPlanStore,
    billStore,
    voiceStore,
    service,
    screenKey,
    reminderTargetId,
    screen,
    loading,
    actionBusy,
    actionError,
    reminderTitle,
    reminderDate,
    reminderTime,
    showReminderCancelConfirm,
    reminderCancelDialog,
    billCameraVideo,
    billCameraReady,
    billCameraPreviewUrl,
    riskPurpose,
    transferPin,
    guardianCode,
    recipientSearch,
    recipientKeyword,
    transferAmountInput,
    planLabel,
    planAmount,
    planDay,
    planRepeat,
    planTargetId,
    PLAN_SCREENS,
    isPlanScreen,
    isPlanFormScreen,
    editingPlan,
    actionRoutes,
    homeRoute,
    isMyPageDetail,
    backRoute,
    primaryRoute,
    secondaryRoute,
    VOICE_CONVERSATION_SCREENS,
    VOICE_SERVICES,
    REPLACE_TARGETS,
    showVoiceControl,
    isBillSourceSelection,
    isBillCameraScreen,
    isBillSuccessScreen,
    isReminderListScreen,
    isReminderCreateScreen,
    isReminderEditScreen,
    isReminderEmptyScreen,
    isReminderErrorScreen,
    isReminderFormScreen,
    isReminderScreen,
    selectedReminder,
    reminderMinDate,
    isMobileBranchListScreen,
    isMobileBranchDetailScreen,
    isMobileBranchScreen,
    mobileBranchLocationError,
    mobileBranchLocationLoading,
    selectedMobileBranchId,
    hideScreenActions,
    TRANSFER_FLOW_SCREENS,
    showTransferFlow,
    TRANSFER_PIN_HELP_SCREENS,
    showTransferPinHelp,
    guardianPending,
    showRecipientSearch,
    liveKind,
    liveTitle,
    liveLoading,
    liveError,
    liveRows,
    selectedMobileBranch,
    mobileBranchViewItems,
    mobileBranchPrimaryDisabled,
    transferSummaryRows,
    isBusy,
    unfinishedTransferRows,
    remainingBalanceRows,
    planScheduleLabel,
    planRows,
    duePlanRows,
    sentPlanRows,
    billPaymentRows,
    billDuplicateRows,
    billDuplicateNote,
    billSpokenText,
    formatCurrency,
    formatDate,
    formatDateTime,
    reminderIdentifier,
    formatReminderDateTime,
    reminderStatusLabel,
    reminderInputValues,
    buildReminderScheduledAt,
    reminderMutationMessage,
    resetReminderForm,
    fillReminderForm,
    isSelectedMobileBranch,
    selectMobileBranch,
    stopBillCamera,
    clearBillCameraPreview,
    setBillCameraPreview,
    cleanupBillCamera,
    startBillCamera,
    normalizeTransferAmount,
    parsedTransferAmount,
    loadContext,
    mobileBranchLocationMessage,
    loadMobileBranchData,
    loadScreen,
    go,
    uploadBill,
    captureBillFrame,
    loadRecipients,
    selectRecipient,
    clearRecipientCandidates,
    reloadTransferAccounts,
    selectAccount,
    needsAdditionalRiskCheck,
    riskWarning,
    openReminder,
    reloadReminders,
    validateReminderForm,
    saveReminder,
    confirmReminderCancel,
    handlePrimary,
    speakBill,
    handleSecondary,
    openVoice,
    goBack,
  }
}
