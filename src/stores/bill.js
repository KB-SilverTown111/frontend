import { ref } from 'vue'
import { defineStore } from 'pinia'

import { billsApi } from '../api/bills.js'
import { normalizeApiError } from '../api/errors.js'

export const useBillStore = defineStore('bill', () => {
  const billId = ref('')
  const bill = ref(null)
  const confirmationToken = ref('')
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

  async function upload(request) {
    const response = await run(() => billsApi.ocr(request))
    bill.value = response
    billId.value = response?.billId ?? ''
    return response
  }

  async function load(id = billId.value) {
    const response = await run(() => billsApi.get(id))
    bill.value = response
    billId.value = response?.billId ?? id
    return response
  }

  async function confirm(request) {
    const response = await run(() => billsApi.confirm(billId.value, request))
    confirmationToken.value = response?.confirmationToken ?? ''
    bill.value = { ...bill.value, ...response }
    return response
  }

  async function execute(request = {}, options = {}) {
    const response = await run(() =>
      billsApi.execute(
        billId.value,
        { confirmationToken: confirmationToken.value, ...request },
        options,
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
    error.value = null
    busy.value = false
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
