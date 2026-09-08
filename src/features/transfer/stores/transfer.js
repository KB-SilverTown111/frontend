import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { normalizeApiError } from '../../../shared/api/errors.js'
import { createIdempotencyKey } from '../../../shared/api/request.js'
import { transfersApi } from '../api/transfers.js'
import { voiceApi } from '../../voice/api/voice.js'
import {
  clearTransferDraft,
  loadTransferDraft,
  saveTransferDraft,
} from '../services/transferDraft.js'

export const useTransferStore = defineStore('transfer', () => {
  const sessionId = ref('')
  const transferId = ref('')
  const candidates = ref([])
  const selectedRecipient = ref(null)
  const fromAccount = ref(null)
  const draftAmount = ref(null)
  const amount = ref(null)
  const prepared = ref(null)
  const confirmation = ref(null)
  const authentication = ref(null)
  const validation = ref(null)
  const guardianVerification = ref(null)
  /**
   * 이 송금이 어느 정기 약속에서 시작했는지.
   * 실행이 끝난 뒤 그 약속에 보낸 날짜를 기록하는 데만 쓴다.
   */
  const planId = ref('')
  const result = ref(null)
  const riskCleared = ref(false)
  const confirmationCompleted = ref(false)
  const authenticationCompleted = ref(false)
  const executeIdempotencyKey = ref('')
  const error = ref(null)
  const busy = ref(false)

  // These aliases keep older service-route integrations source-compatible while
  // the canonical flow uses selectedRecipient/fromAccount/candidates.
  const recipient = computed({
    get: () => selectedRecipient.value,
    set: (value) => {
      selectedRecipient.value = value ?? null
    },
  })
  const selectedAccount = computed({
    get: () => fromAccount.value,
    set: (value) => {
      fromAccount.value = value ?? null
    },
  })
  const recipientCandidates = computed(() => candidates.value)
  const recipientName = computed(
    () => selectedRecipient.value?.displayName || selectedRecipient.value?.name || '',
  )
  const executable = computed(() => Boolean(confirmation.value?.executable))
  const authenticated = computed(() => Boolean(authentication.value?.authenticated))
  const guardianVerified = computed(() => Boolean(guardianVerification.value?.verified))
  /** 서버가 보호자에게 메시지를 보내지 못한 경우다. 화면 2-12로 보낸다. */
  const guardianDeliveryFailed = computed(() =>
    Boolean(guardianVerification.value?.deliveryFailureCode),
  )
  /** 유효시간이 지난 인증이다. 화면 2-13에서 불일치와 구분해 안내한다. */
  const guardianExpired = computed(() => {
    if (guardianVerified.value) return false

    const expiresAt = Date.parse(guardianVerification.value?.expiresAt ?? '')
    return Number.isFinite(expiresAt) && expiresAt <= Date.now()
  })
  const amountReconfirmRequired = computed(() =>
    Boolean(validation.value?.amountReconfirmRequired ?? prepared.value?.amountReconfirmRequired),
  )

  function recipientIdOf(value) {
    return value?.recipientId ?? value?.id ?? ''
  }

  function accountIdOf(value) {
    const candidate = value?.accountId ?? value?.id ?? value
    return typeof candidate === 'string' || typeof candidate === 'number' ? candidate : ''
  }

  const readyToPrepare = computed(() =>
    Boolean(
      recipientIdOf(selectedRecipient.value) &&
      accountIdOf(fromAccount.value) &&
      Number(draftAmount.value) > 0,
    ),
  )

  async function run(request) {
    busy.value = true
    error.value = null
    try {
      return await request()
    } catch (requestError) {
      error.value = normalizeApiError(requestError)
      throw error.value
    } finally {
      busy.value = false
    }
  }

  async function startSession() {
    const response = await run(() => voiceApi.createSession({ entryPoint: 'TRANSFER' }))
    sessionId.value = response?.sessionId ?? ''
    return response
  }

  function candidatesOf(response) {
    if (Array.isArray(response)) return response
    if (Array.isArray(response?.candidates)) return response.candidates
    if (Array.isArray(response?.items)) return response.items
    return []
  }

  /** 후보를 자동 확정하지 않는다. 사용자가 직접 고른 뒤에만 다음 단계로 간다. */
  async function findRecipients(request) {
    const response = await run(() => transfersApi.candidates(request))
    candidates.value = candidatesOf(response)
    selectedRecipient.value = null
    return candidates.value
  }

  function clearRecipientSelection() {
    selectedRecipient.value = null
    candidates.value = []
  }

  function selectRecipient(candidate) {
    if (!recipientIdOf(candidate)) throw new Error('받는 분 정보를 다시 선택해 주세요.')
    selectedRecipient.value = candidate
  }

  function selectAccount(account) {
    if (!accountIdOf(account)) throw new Error('출금 계좌를 다시 선택해 주세요.')
    fromAccount.value = account
  }

  function setAmount(value) {
    const parsed = Number(String(value ?? '').replace(/[^0-9]/g, ''))
    draftAmount.value = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
    return draftAmount.value
  }

  async function validateAmount(request) {
    const payload = request ?? {
      recognizedAmount: draftAmount.value,
      amountCandidates: draftAmount.value ? [draftAmount.value] : [],
    }
    const response = await run(() => transfersApi.validateAmount(payload))
    validation.value = response
    if (response?.confirmedAmount) {
      draftAmount.value = response.confirmedAmount
      amount.value = response.confirmedAmount
    }
    return response
  }

  function resetFinancialExecutionState() {
    guardianVerification.value = null
    riskCleared.value = false
    confirmationCompleted.value = false
    authenticationCompleted.value = false
    executeIdempotencyKey.value = ''
    confirmation.value = null
    authentication.value = null
  }

  /** 선택한 수취인·계좌·금액으로 송금 초안을 만든다. */
  async function prepare(request) {
    const fromAccountId = accountIdOf(request?.fromAccountId ?? fromAccount.value)
    const recipientId = request?.recipientId ?? recipientIdOf(selectedRecipient.value)
    const transferAmount = Number(request?.amount ?? draftAmount.value ?? amount.value)
    if (!fromAccountId) throw new Error('출금 계좌를 선택해 주세요.')
    if (!recipientId) throw new Error('받는 분을 선택해 주세요.')
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      throw new Error('보낼 금액을 확인해 주세요.')
    }

    const payload = { fromAccountId, recipientId, amount: transferAmount }
    if (request?.voiceSessionId) payload.voiceSessionId = request.voiceSessionId
    else if (sessionId.value) payload.voiceSessionId = sessionId.value

    const response = await run(() => transfersApi.prepare(payload))
    resetFinancialExecutionState()
    prepared.value = response
    transferId.value = response?.transferId ?? ''
    // 화면을 벗어나도 이어서 보낼 수 있게 조회할 id만 남긴다.
    saveTransferDraft(transferId.value, response?.preparedAt)
    amount.value = response?.amount ?? transferAmount
    draftAmount.value = amount.value
    executeIdempotencyKey.value = createIdempotencyKey()
    return response
  }

  async function load(transfer = transferId.value) {
    const response = await run(() => transfersApi.get(transfer))
    resetFinancialExecutionState()
    prepared.value = response
    transferId.value = response?.transferId ?? transfer
    amount.value = response?.amount ?? amount.value
    draftAmount.value = amount.value
    executeIdempotencyKey.value = createIdempotencyKey()
    return response
  }

  /** 승인하면 서버가 executable을 내려준다. */
  async function confirm(request = { approved: true }) {
    const response = await run(() => transfersApi.confirm(transferId.value, request))
    confirmation.value = response
    confirmationCompleted.value = Boolean(response?.executable)
    authentication.value = null
    authenticationCompleted.value = false
    prepared.value = { ...prepared.value, ...response }
    return response
  }

  /** 거래 승인 PIN 인증. PIN 값은 보관하지 않고 결과만 남긴다. */
  async function authenticate(request) {
    const response = await run(() => transfersApi.authenticate(transferId.value, request))
    authentication.value = response
    authenticationCompleted.value = Boolean(response?.authenticated)
    return response
  }

  /** 거래 승인 PIN 등록·변경. 입력값은 요청에만 쓰고 상태에 남기지 않는다. */
  async function registerPin(pin) {
    const value = String(pin ?? '')
    if (!/^\d{6}$/.test(value)) throw new Error('PIN 6자리를 숫자로 입력해 주세요.')
    return run(() => transfersApi.setPin({ pin: value }))
  }

  /**
   * 보호자에게 인증번호 발송을 요청한다.
   * 발송 실패는 예외가 아니라 응답의 deliveryFailureCode로 온다.
   */
  async function startGuardianVerification() {
    if (!transferId.value) throw new Error('송금 정보를 다시 확인해 주세요.')

    const response = await run(() => transfersApi.startGuardianVerification(transferId.value))
    guardianVerification.value = response
    return response
  }

  /** 보호자 인증번호 확인. 입력값은 보관하지 않고 결과만 남긴다. */
  async function verifyGuardian(code) {
    const value = String(code ?? '').trim()
    if (!value) throw new Error('보호자에게 온 번호를 입력해 주세요.')

    const verificationId = guardianVerification.value?.verificationId
    if (!verificationId) throw new Error('먼저 보호자에게 인증 요청을 보내주세요.')

    const response = await run(() =>
      transfersApi.verifyGuardian(transferId.value, verificationId, { code: value }),
    )
    guardianVerification.value = { ...guardianVerification.value, ...response }
    return response
  }

  /** 정기 약속에서 시작한 송금임을 표시한다. 일반 송금은 부르지 않는다. */
  function setPlanId(value) {
    planId.value = String(value ?? '')
  }

  function clearPlanId() {
    planId.value = ''
  }

  function localError(code, message) {
    return normalizeApiError({ response: { data: { code, message } } })
  }

  /** 서버 승인과 PIN 인증이 모두 끝난 경우에만 실행한다. */
  async function execute(request = {}, options = {}) {
    if (!executable.value) {
      error.value = localError(
        'TRANSFER_NOT_CONFIRMED',
        '확인 절차가 끝나지 않았어요. 다시 확인해 주세요.',
      )
      throw error.value
    }
    if (!authenticated.value) {
      error.value = localError('TRANSFER_NOT_AUTHENTICATED', '비밀번호 확인이 필요해요.')
      throw error.value
    }
    // 보호자 확인을 시작한 송금은 확인이 끝나기 전에 실행하지 않는다.
    if (guardianVerification.value && !guardianVerified.value) {
      error.value = localError('TRANSFER_GUARDIAN_NOT_VERIFIED', '보호자 확인이 끝나지 않았어요.')
      throw error.value
    }
    if (!executeIdempotencyKey.value) {
      executeIdempotencyKey.value = options.idempotencyKey || createIdempotencyKey()
    }

    const response = await run(() =>
      transfersApi.execute(transferId.value, request, {
        ...options,
        idempotencyKey: executeIdempotencyKey.value,
      }),
    )
    result.value = response
    clearTransferDraft()
    return response
  }

  /** 저장해 둔 초안을 서버에서 다시 읽는다. 없거나 읽지 못하면 기록을 지운다. */
  async function restoreDraft() {
    const draft = loadTransferDraft()
    if (!draft) return null

    try {
      await load(draft.transferId)
      return draft
    } catch {
      clearTransferDraft()
      return null
    }
  }

  function discardDraft() {
    clearTransferDraft()
  }

  async function cancel() {
    clearPlanId()
    const response = await run(() => transfersApi.cancel(transferId.value))
    prepared.value = response
    clearTransferDraft()
    resetFinancialExecutionState()
    return response
  }

  async function assessRisk() {
    if (riskCleared.value) return { cleared: true }
    const response = await run(() => transfersApi.riskScore({ transferId: transferId.value }))
    riskCleared.value = !isRiskHeld(response) && !needsAdditionalRiskCheck(response)
    return response
  }

  async function checkRisk(request = {}) {
    const response = await run(() =>
      transfersApi.riskCheck({ transferId: transferId.value, ...request }),
    )
    riskCleared.value = !isRiskHeld(response) && !needsAdditionalRiskCheck(response)
    return response
  }

  function isRiskHeld(response) {
    return (
      response?.hold === true ||
      response?.recommendedAction === 'HOLD' ||
      response?.action === 'HOLD'
    )
  }

  function needsAdditionalRiskCheck(response) {
    return Boolean(
      response?.additionalCheckRequired ||
      response?.requiresAdditionalCheck ||
      response?.verificationRequired ||
      response?.requiresVerification,
    )
  }

  function reset() {
    clearTransferDraft()
    clearPlanId()
    sessionId.value = ''
    transferId.value = ''
    candidates.value = []
    selectedRecipient.value = null
    fromAccount.value = null
    draftAmount.value = null
    amount.value = null
    prepared.value = null
    confirmation.value = null
    authentication.value = null
    validation.value = null
    guardianVerification.value = null
    result.value = null
    resetFinancialExecutionState()
    error.value = null
    busy.value = false
  }

  return {
    sessionId,
    transferId,
    candidates,
    selectedRecipient,
    fromAccount,
    draftAmount,
    amount,
    prepared,
    confirmation,
    authentication,
    validation,
    guardianVerification,
    planId,
    result,
    riskCleared,
    confirmationCompleted,
    authenticationCompleted,
    executeIdempotencyKey,
    error,
    busy,
    recipient,
    selectedAccount,
    recipientCandidates,
    recipientName,
    executable,
    authenticated,
    amountReconfirmRequired,
    guardianVerified,
    guardianDeliveryFailed,
    guardianExpired,
    readyToPrepare,
    startSession,
    findRecipients,
    clearRecipientSelection,
    selectRecipient,
    selectAccount,
    setAmount,
    validateAmount,
    prepare,
    load,
    confirm,
    authenticate,
    registerPin,
    setPlanId,
    clearPlanId,
    startGuardianVerification,
    verifyGuardian,
    execute,
    restoreDraft,
    discardDraft,
    cancel,
    assessRisk,
    checkRisk,
    isRiskHeld,
    needsAdditionalRiskCheck,
    reset,
  }
})
