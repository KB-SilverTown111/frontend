import { apiClient } from './client.js'

import { withIdempotencyKey } from './request.js'

export const transfersApi = {
  async listAccounts(params) {
    const { data } = await apiClient.get('/accounts', { params })
    return data
  },

  async candidates(request) {
    const { data } = await apiClient.post('/recipients/candidates', request)
    return data
  },

  async prepare(request) {
    const { data } = await apiClient.post('/transfers/prepare', request)
    return data
  },

  async get(transferId) {
    const { data } = await apiClient.get(`/transfers/${transferId}`)
    return data
  },

  async confirm(transferId, request) {
    const { data } = await apiClient.post(`/transfers/${transferId}/confirm`, request)
    return data
  },

  async setPin(request) {
    const { data } = await apiClient.put('/transfers/pin', request)
    return data
  },

  async authenticate(transferId, request) {
    const { data } = await apiClient.post(`/transfers/${transferId}/authenticate`, request)
    return data
  },

  async execute(transferId, request = {}, options = {}) {
    const { idempotencyKey, ...body } = request
    const config = withIdempotencyKey(options, options.idempotencyKey ?? idempotencyKey)
    const payload = Object.keys(body).length ? body : undefined
    const { data } = await apiClient.post(`/transfers/${transferId}/execute`, payload, config)
    return data
  },

  async cancel(transferId) {
    const { data } = await apiClient.delete(`/transfers/${transferId}`)
    return data
  },

  async riskScore(request) {
    const { data } = await apiClient.post('/transfers/risk-score', request)
    return data
  },

  async riskCheck(request) {
    const { data } = await apiClient.post('/transfers/risk-check', request)
    return data
  },

  async validateAmount(request) {
    const { data } = await apiClient.post('/transfers/validate-amount', request)
    return data
  },
}
