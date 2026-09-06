import { authApi } from './auth.js'
import { mockAuthApi } from './mockAuth.js'

const runtimeEnvironment = import.meta.env || {}
const useRealApi = runtimeEnvironment.PROD || runtimeEnvironment.VITE_USE_REAL_API === 'true'

export const onboardingApi = useRealApi ? authApi : mockAuthApi
