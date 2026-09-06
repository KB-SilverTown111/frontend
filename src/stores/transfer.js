import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { createIdempotencyKey } from '../api/request.js'
import { transfersApi } from '../api/transfers.js'
import { voiceApi } from '../api/voice.js'

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
  const validation = ref(null)
  const result = ref(null)
  const error = ref(null)
  const busy = ref(false)

  /**
   * 실행 재시도에 같은 키를 써야 거래가 중복 생성되지 않는다.
   * 초안이 새로 만들어질 때만 새 키를 발급한다.
   */
  let executionKey = ''

  const recipientName = computed(() => selectedRecipient.value?.displayName ?? '')
  const confirmationToken = computed(() => confirmation.value?.confirmationToken ?? '')
  const executable = computed(() =>
    Boolean(confirmation.value?.executable && confirmationToken.value),
  )
  const amountReconfirmRequired = computed(() =>
    Boolean(validation.value?.amountReconfirmRequired ?? prepared.value?.amountReconfirmRequired),
  )
  const readyToPrepare = computed(() =>
    Boolean(
      selectedRecipient.value?.recipientId && fromAccount.value?.accountId && draftAmount.value > 0,
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

  /** 후보를 자동 확정하지 않는다. 사용자가 직접 고른다. */
  async function findRecipients(request) {
    const response = await run(() => transfersApi.candidates(request))
    candidates.value = Array.isArray(response) ? response : []
    selectedRecipient.value = null
    return candidates.value
  }

  function selectRecipient(candidate) {
    selectedRecipient.value = candidate ?? null
  }

  function selectAccount(account) {
    fromAccount.value = account ?? null
  }

  function setAmount(value) {
    const parsed = Number(String(value ?? '').replace(/[^0-9]/g, ''))
    draftAmount.value = Number.isFinite(parsed) && parsed > 0 ? parsed : null
    return draftAmount.value
  }

  /** 유사 발음 금액 검증. 후보가 여럿이면 서버가 재확인을 요구한다. */
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

  /** 선택한 수취인·계좌·금액으로 송금 초안을 만든다. */
  async function prepare(request) {
    const payload = request ?? {
      fromAccountId: fromAccount.value?.accountId,
      recipientId: selectedRecipient.value?.recipientId,
      amount: draftAmount.value,
    }
    if (sessionId.value) payload.voiceSessionId = sessionId.value

    const response = await run(() => transfersApi.prepare(payload))
    prepared.value = response
    confirmation.value = null
    transferId.value = response?.transferId ?? ''
    amount.value = response?.amount ?? payload.amount ?? amount.value
    executionKey = createIdempotencyKey()
    return response
  }

  async function load(transfer = transferId.value) {
    const response = await run(() => transfersApi.get(transfer))
    prepared.value = response
    transferId.value = response?.transferId ?? transfer
    amount.value = response?.amount ?? amount.value
    return response
  }

  /** 승인하면 서버가 일회용 confirmationToken을 발급한다. */
  async function confirm(request = { approved: true }) {
    const response = await run(() => transfersApi.confirm(transferId.value, request))
    confirmation.value = response
    prepared.value = { ...prepared.value, ...response }
    return response
  }

  async function authenticate(request) {
    return run(() => transfersApi.authenticate(transferId.value, request))
  }

  /** 서버가 발급한 토큰이 준비된 경우에만 실행한다. */
  async function execute(request = {}, options = {}) {
    const payload = {
      confirmationToken: request.confirmationToken ?? confirmationToken.value,
      authProof: request.authProof ?? 'mock-auth-ok',
    }
    if (!payload.confirmationToken) {
      error.value = normalizeApiError({
        response: {
          data: {
            code: 'TRANSFER_NOT_CONFIRMED',
            message: '확인 절차가 끝나지 않았어요. 다시 확인해 주세요.',
          },
        },
      })
      throw error.value
    }

    const response = await run(() =>
      transfersApi.execute(transferId.value, payload, {
        ...options,
        idempotencyKey: options.idempotencyKey ?? executionKey,
      }),
    )
    result.value = response
    return response
  }

  async function cancel() {
    const response = await run(() => transfersApi.cancel(transferId.value))
    prepared.value = response
    confirmation.value = null
    return response
  }

  async function assessRisk() {
    return run(() => transfersApi.riskScore({ transferId: transferId.value }))
  }

  async function checkRisk(request = {}) {
    return run(() => transfersApi.riskCheck({ transferId: transferId.value, ...request }))
  }

  function reset() {
    sessionId.value = ''
    transferId.value = ''
    candidates.value = []
    selectedRecipient.value = null
    fromAccount.value = null
    draftAmount.value = null
    amount.value = null
    prepared.value = null
    confirmation.value = null
    validation.value = null
    result.value = null
    error.value = null
    busy.value = false
    executionKey = ''
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
    validation,
    result,
    error,
    busy,
    recipientName,
    confirmationToken,
    executable,
    amountReconfirmRequired,
    readyToPrepare,
    startSession,
    findRecipients,
    selectRecipient,
    selectAccount,
    setAmount,
    validateAmount,
    prepare,
    load,
    confirm,
    authenticate,
    execute,
    cancel,
    assessRisk,
    checkRisk,
    reset,
  }
})
