import { computed, ref } from 'vue'
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

  /** 이미 납부가 끝난 고지서다. 다시 내려 하면 화면 3-13으로 안내한다. */
  const alreadyPaid = computed(() => bill.value?.status === 'PAID')
  /** 납부 결과의 결제 번호. 서버 응답의 paymentId를 그대로 쓴다. */
  const paymentId = computed(() => result.value?.paymentId ?? '')

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
    alreadyPaid,
    paymentId,
    error,
    busy,
    upload,
    load,
    confirm,
    execute,
    reset,
  }
})
