import { apiClient } from '../../../shared/api/client.js'

import { withIdempotencyKey } from '../../../shared/api/request.js'

export const remindersApi = {
  async list(params) {
    const { data } = await apiClient.get('/reminders', { params })
    return data
  },

  async create(request, options = {}) {
    const { data } = await apiClient.post(
      '/reminders',
      request,
      withIdempotencyKey(options, options.idempotencyKey),
    )
    return data
  },

  async update(reminderId, request, options = {}) {
    const { data } = await apiClient.put(
      `/reminders/${reminderId}`,
      request,
      withIdempotencyKey(options, options.idempotencyKey),
    )
    return data
  },

  async cancel(reminderId, options = {}) {
    await apiClient.delete(
      `/reminders/${reminderId}`,
      withIdempotencyKey(options, options.idempotencyKey),
    )
  },

  async snooze(reminderId, request, options = {}) {
    const { data } = await apiClient.post(
      `/reminders/${reminderId}/snooze`,
      request,
      withIdempotencyKey(options, options.idempotencyKey),
    )
    return data
  },
}
