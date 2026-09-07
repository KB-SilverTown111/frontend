import { apiClient } from './client.js'

export const mobileBranchesApi = {
  async nearby(params) {
    const { data } = await apiClient.get('/mobile-branches/nearby', { params })
    return data
  },

  async list(params) {
    const { data } = await apiClient.get('/mobile-branches', { params })
    return data
  },

  async get(branchId) {
    const { data } = await apiClient.get(`/mobile-branches/${branchId}`)
    return data
  },
}
