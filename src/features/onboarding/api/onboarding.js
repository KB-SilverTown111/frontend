import { authApi } from '../../auth/api/auth.js'
import { mockAuthApi } from '../../auth/api/mockAuth.js'

const runtimeEnvironment = import.meta.env || {}
export function selectOnboardingApi(environment = runtimeEnvironment) {
  const useMockApi = environment.VITE_USE_MOCK_API === 'true'
  const useRealApi = !useMockApi && (Boolean(environment.VITE_API_BASE_URL) || environment.PROD)

  return useRealApi ? authApi : mockAuthApi
}

export const onboardingApi = selectOnboardingApi()
