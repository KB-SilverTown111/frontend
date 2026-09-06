import { ref } from 'vue'
import { defineStore } from 'pinia'

import { billsApi } from '../api/bills.js'
import { normalizeApiError } from '../api/errors.js'
import { createIdempotencyKey } from '../api/request.js'

export const useBillStore = defineStore('bill', () => {
  const billId = ref('')
  const bill = ref(null)
  const confirmationToken = ref('')
  const result = ref(null)
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

  async function upload(request) {
    const response = await run(() => billsApi.ocr(request))
    resetExecutionKey()
    bill.value = response
    billId.value = response?.billId ?? ''
    confirmationToken.value = ''
    result.value = null
    return response
  }

  async function load(id = billId.value) {
    const response = await run(() => billsApi.get(id))
    resetExecutionKey()
    bill.value = response
    billId.value = response?.billId ?? id
    confirmationToken.value = ''
    result.value = null
    return response
  }

  async function confirm(request) {
    const response = await run(() => billsApi.confirm(billId.value, request))
    confirmationToken.value = response?.confirmationToken ?? ''
    bill.value = { ...bill.value, ...response }
    return response
  }

  async function execute(request = {}, options = {}) {
    if (!executeIdempotencyKey.value) {
      executeIdempotencyKey.value = options.idempotencyKey || createIdempotencyKey()
    }
    const response = await run(() =>
      billsApi.execute(
        billId.value,
        { confirmationToken: confirmationToken.value, ...request },
        { ...options, idempotencyKey: executeIdempotencyKey.value },
      ),
    )
    result.value = response
    return response
  }

  function reset() {
    billId.value = ''
    bill.value = null
    confirmationToken.value = ''
    result.value = null
    resetExecutionKey()
    error.value = null
    busy.value = false
  }

  function resetExecutionKey() {
    executeIdempotencyKey.value = ''
  }

  return {
    billId,
    bill,
    confirmationToken,
    result,
    error,
    busy,
    upload,
    load,
    confirm,
    execute,
    reset,
  }
})
