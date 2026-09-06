import { ref } from 'vue'
import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { transfersApi } from '../api/transfers.js'
import { voiceApi } from '../api/voice.js'

export const useTransferStore = defineStore('transfer', () => {
  const sessionId = ref('')
  const transferId = ref('')
  const selectedAccount = ref(null)
  const recipient = ref(null)
  const amount = ref(null)
  const prepared = ref(null)
  const validation = ref(null)
  const result = ref(null)
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

  async function startSession() {
    const response = await run(() => voiceApi.createSession({ entryPoint: 'TRANSFER' }))
    sessionId.value = response?.sessionId ?? ''
    return response
  }

  async function findRecipients(request) {
    const response = await run(() => transfersApi.candidates(request))
    recipient.value = response
    return response
  }

  async function prepare(request) {
    const response = await run(() => transfersApi.prepare(request))
    prepared.value = response
    transferId.value = response?.transferId ?? ''
    selectedAccount.value = request?.fromAccountId ?? selectedAccount.value
    amount.value = request?.amount ?? amount.value
    return response
  }

  async function load(transfer = transferId.value) {
    const response = await run(() => transfersApi.get(transfer))
    prepared.value = response
    transferId.value = response?.transferId ?? transfer
    return response
  }

  async function confirm(request = { approved: true }) {
    const response = await run(() => transfersApi.confirm(transferId.value, request))
    prepared.value = { ...prepared.value, ...response }
    return response
  }

  async function authenticate(request) {
    return run(() => transfersApi.authenticate(transferId.value, request))
  }

  async function execute(request = {}, options = {}) {
    const response = await run(() => transfersApi.execute(transferId.value, request, options))
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
    return run(() => transfersApi.riskScore({ transferId: transferId.value }))
  }

  async function checkRisk(request = {}) {
    return run(() => transfersApi.riskCheck({ transferId: transferId.value, ...request }))
  }

  async function requestGuardianVerification(request = { channel: 'MMS' }, options = {}) {
    return run(() => transfersApi.guardianVerification(transferId.value, request, options))
  }

  function reset() {
    sessionId.value = ''
    transferId.value = ''
    selectedAccount.value = null
    recipient.value = null
    amount.value = null
    prepared.value = null
    validation.value = null
    result.value = null
    error.value = null
    busy.value = false
  }

  return {
    sessionId,
    transferId,
    selectedAccount,
    recipient,
    amount,
    prepared,
    validation,
    result,
    error,
    busy,
    startSession,
    findRecipients,
    prepare,
    load,
    confirm,
    authenticate,
    execute,
    cancel,
    validateAmount,
    assessRisk,
    checkRisk,
    requestGuardianVerification,
    reset,
  }
})
