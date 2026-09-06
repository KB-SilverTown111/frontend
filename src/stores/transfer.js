import { ref } from 'vue'
import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { createIdempotencyKey } from '../api/request.js'
import { transfersApi } from '../api/transfers.js'

export const useTransferStore = defineStore('transfer', () => {
  const transferId = ref('')
  const selectedAccount = ref(null)
  const recipient = ref(null)
  const recipientCandidates = ref([])
  const amount = ref(null)
  const prepared = ref(null)
  const validation = ref(null)
  const result = ref(null)
  const riskCleared = ref(false)
  const confirmationCompleted = ref(false)
  const authenticationCompleted = ref(false)
  const executeIdempotencyKey = ref('')
  const error = ref(null)
  const busy = ref(false)

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

  function candidatesOf(response) {
    if (Array.isArray(response)) return response
    if (Array.isArray(response?.candidates)) return response.candidates
    if (Array.isArray(response?.items)) return response.items
    return []
  }

  function recipientIdOf(value) {
    return value?.recipientId ?? value?.id ?? ''
  }

  function accountIdOf(value) {
    const candidate = value?.accountId ?? value?.id ?? value
    return typeof candidate === 'string' || typeof candidate === 'number' ? candidate : ''
  }

  async function findRecipients(request) {
    const response = await run(() => transfersApi.candidates(request))
    recipientCandidates.value = candidatesOf(response)
    recipient.value = recipientCandidates.value.length === 1 ? recipientCandidates.value[0] : null
    return response
  }

  function clearRecipientSelection() {
    recipient.value = null
    recipientCandidates.value = []
  }

  function selectRecipient(candidate) {
    if (!recipientIdOf(candidate)) throw new Error('받는 분 정보를 다시 선택해 주세요.')
    recipient.value = candidate
  }

  function selectAccount(account) {
    if (!accountIdOf(account)) throw new Error('출금 계좌를 다시 선택해 주세요.')
    selectedAccount.value = account
  }

  function resetFinancialExecutionState() {
    riskCleared.value = false
    confirmationCompleted.value = false
    authenticationCompleted.value = false
    executeIdempotencyKey.value = ''
  }

  async function prepare(request) {
    const fromAccountId = accountIdOf(request?.fromAccountId ?? selectedAccount.value)
    const recipientId = request?.recipientId ?? recipientIdOf(recipient.value)
    const transferAmount = Number(request?.amount ?? amount.value)
    if (!fromAccountId) throw new Error('출금 계좌를 선택해 주세요.')
    if (!recipientId) throw new Error('받는 분을 선택해 주세요.')
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      throw new Error('보낼 금액을 확인해 주세요.')
    }

    const payload = { fromAccountId, recipientId, amount: transferAmount }
    if (request?.voiceSessionId) payload.voiceSessionId = request.voiceSessionId
    const response = await run(() => transfersApi.prepare(payload))
    resetFinancialExecutionState()
    prepared.value = response
    transferId.value = response?.transferId ?? ''
    amount.value = transferAmount
    return response
  }

  async function load(transfer = transferId.value) {
    const response = await run(() => transfersApi.get(transfer))
    resetFinancialExecutionState()
    prepared.value = response
    transferId.value = response?.transferId ?? transfer
    return response
  }

  async function confirm(request = { approved: true }) {
    const response = await run(() => transfersApi.confirm(transferId.value, request))
    prepared.value = { ...prepared.value, ...response }
    confirmationCompleted.value = true
    return response
  }

  async function authenticate(request) {
    const response = await run(() => transfersApi.authenticate(transferId.value, request))
    authenticationCompleted.value = true
    return response
  }

  async function execute(request = {}, options = {}) {
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
    return response
  }

  async function cancel() {
    const response = await run(() => transfersApi.cancel(transferId.value))
    prepared.value = response
    return response
  }

  async function validateAmount(request) {
    const response = await run(() => transfersApi.validateAmount(request))
    validation.value = response
    amount.value = response?.confirmedAmount ?? amount.value
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
    transferId.value = ''
    selectedAccount.value = null
    clearRecipientSelection()
    amount.value = null
    prepared.value = null
    validation.value = null
    result.value = null
    resetFinancialExecutionState()
    error.value = null
    busy.value = false
  }

  return {
    transferId,
    selectedAccount,
    recipient,
    recipientCandidates,
    amount,
    prepared,
    validation,
    result,
    riskCleared,
    confirmationCompleted,
    authenticationCompleted,
    error,
    busy,
    findRecipients,
    clearRecipientSelection,
    selectRecipient,
    selectAccount,
    prepare,
    load,
    confirm,
    authenticate,
    execute,
    cancel,
    validateAmount,
    assessRisk,
    checkRisk,
    isRiskHeld,
    reset,
  }
})
