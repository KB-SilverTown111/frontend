import { authApi } from './auth.js'
import { mockAuthApi } from './mockAuth.js'

const runtimeEnvironment = import.meta.env || {}
export function selectOnboardingApi(environment = runtimeEnvironment) {
  const useMockApi = environment.VITE_USE_MOCK_API === 'true'
  const useRealApi = !useMockApi && (Boolean(environment.VITE_API_BASE_URL) || environment.PROD)

  return useRealApi ? authApi : mockAuthApi
}

export const onboardingApi = selectOnboardingApi()
