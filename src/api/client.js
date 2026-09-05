import axios from 'axios'

const runtimeEnvironment = import.meta.env || {}

export const apiClient = axios.create({
  baseURL: runtimeEnvironment.VITE_API_BASE_URL || '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})
