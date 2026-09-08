import { apiClient } from '../../../shared/api/client.js'

import { withIdempotencyKey } from '../../../shared/api/request.js'

export const profileApi = {
  async get() {
    const { data } = await apiClient.get('/users/me')
    return data
  },

  async update(request, options = {}) {
    const { data } = await apiClient.put(
      '/users/me',
      request,
      withIdempotencyKey(options, options.idempotencyKey),
    )
    return data
  },

  async getConsents() {
    const { data } = await apiClient.get('/users/me/consents')
    return data
  },

  async updateConsents(request, options = {}) {
    const { data } = await apiClient.put(
      '/users/me/consents',
      request,
      withIdempotencyKey(options, options.idempotencyKey),
    )
    return data
  },
}
