import { apiClient } from '../../../shared/api/client.js'

import { withIdempotencyKey } from '../../../shared/api/request.js'

export const billsApi = {
  async list(params) {
    const { data } = await apiClient.get('/bills', { params })
    return data
  },

  async monthlySummary(params) {
    const { data } = await apiClient.get('/bills/monthly-summary', { params })
    return data
  },

  async ocr({ image, voiceSessionId } = {}) {
    if (!voiceSessionId) throw new Error('음성 세션을 준비한 뒤 고지서를 업로드해 주세요.')

    const formData = new FormData()
    if (image) formData.append('image', image, image.name ?? 'bill-image.jpg')
    if (voiceSessionId) formData.append('voiceSessionId', voiceSessionId)

    const { data } = await apiClient.post('/bills/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async get(billId) {
    const { data } = await apiClient.get(`/bills/${billId}`)
    return data
  },

  async confirm(billId, request) {
    const { data } = await apiClient.post(`/bills/${billId}/confirm`, request)
    return data
  },

  async execute(billId, request = {}, options = {}) {
    const config = withIdempotencyKey(options, options.idempotencyKey)
    const { data } = await apiClient.post(`/bills/${billId}/execute`, request, config)
    return data
  },
}
