import { apiClient } from '../../../shared/api/client.js'

export const accountsApi = {
  async list(params) {
    const { data } = await apiClient.get('/accounts', { params })
    return data
  },
}
