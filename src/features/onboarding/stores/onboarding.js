import { defineStore } from 'pinia'

import { normalizeApiError } from '../../../shared/api/errors.js'
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '../../../shared/services/authStorage.js'
import { onboardingApi } from '../api/onboarding.js'
import { resetAuthenticatedStores } from '../../auth/stores/session.js'
import {
  buildLoginRequest,
  buildSignUpRequest,
  createOnboardingDraft,
  validateStep,
} from '../model/contract.js'

const REQUIRED_DATA_STEPS = ['consents', 'account', 'identity', 'contact', 'finance', 'voice']
const AUTH_STORAGE_WARNING =
  '로그인 상태를 안전하게 저장하지 못했어요. 앱을 종료하면 다시 로그인해야 해요.'
const LOGOUT_AUTH_STORAGE_WARNING =
  '로그아웃 정보를 안전하게 삭제하지 못했어요. 앱을 종료하기 전에 다시 시도해 주세요.'

function isAccessTokenExpired(session) {
  const expiresAt = Date.parse(session?.expiresAt ?? '')
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now()
}

function shouldClearAuthSession(error) {
  const status = error?.response?.status
  return status === 401 || status === 403
}

function authUserId(value) {
  const userId = value?.userId
  return userId == null ? null : String(userId)
}

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    draft: createOnboardingDraft(),
    fieldErrors: {},
    status: 'idle',
    submitError: null,
    voiceWarning: null,
    authStorageWarning: null,
    authResult: null,
    voiceResult: null,
  }),

  actions: {
    validate(stepId) {
      this.fieldErrors = validateStep(stepId, this.draft)
      return Object.keys(this.fieldErrors).length === 0
    },

    validateAll() {
      for (const stepId of REQUIRED_DATA_STEPS) {
        if (!this.validate(stepId)) return { valid: false, stepId }
      }
      return { valid: true, stepId: null }
    },

    async submit() {
      const validation = this.validateAll()
      if (!validation.valid) return { ok: false, stepId: validation.stepId }

      this.status = 'loading'
      this.submitError = null
      this.voiceWarning = null
      this.authStorageWarning = null

      try {
        const authResult = await onboardingApi.signup(buildSignUpRequest(this.draft))
        resetAuthenticatedStores(this._p)
        await this.persistAuthSession(authResult)

        this.status = 'success'
        return { ok: true }
      } catch (error) {
        this.submitError = normalizeApiError(error)
        this.status = 'error'
        return { ok: false, stepId: null }
      }
    },

    async login() {
      if (!this.validate('login')) return { ok: false, stepId: 'login' }

      this.status = 'loading'
      this.submitError = null
      this.authStorageWarning = null

      try {
        const authResult = await onboardingApi.login(buildLoginRequest(this.draft))
        resetAuthenticatedStores(this._p)
        await this.persistAuthSession(authResult)
        this.status = 'success'
        return { ok: true }
      } catch (error) {
        this.submitError = normalizeApiError(error)
        this.status = 'error'
        return { ok: false, stepId: null }
      }
    },

    async logout() {
      try {
        const session = this.authResult || (await loadAuthSession())
        if (session?.refreshToken) {
          await onboardingApi.logout({ refreshToken: session.refreshToken })
        }
      } catch {
        // Clear the local session even when the server cannot be reached.
      }

      const resetResult = await this.reset()
      resetAuthenticatedStores(this._p)
      if (!resetResult.authStorageCleared) {
        this.authStorageWarning = LOGOUT_AUTH_STORAGE_WARNING
      }
      return { ok: resetResult.authStorageCleared, ...resetResult }
    },

    async persistAuthSession(authResult) {
      const previousUserId = authUserId(this.authResult)
      try {
        const session = await saveAuthSession(authResult)
        if (previousUserId && previousUserId !== authUserId(session)) {
          resetAuthenticatedStores(this._p)
        }
        this.authResult = session
        this.authStorageWarning = null
      } catch {
        this.authResult = authResult
        this.authStorageWarning = AUTH_STORAGE_WARNING
      }
    },

    async restoreAuthSession() {
      let session
      try {
        session = await loadAuthSession({ allowExpired: true })
      } catch {
        this.authResult = null
        resetAuthenticatedStores(this._p)
        this.authStorageWarning = AUTH_STORAGE_WARNING
        return this.authResult
      }

      if (!session) {
        this.authResult = null
        resetAuthenticatedStores(this._p)
        return this.authResult
      }

      try {
        if (isAccessTokenExpired(session)) {
          const refreshedSession = await onboardingApi.refresh({
            refreshToken: session.refreshToken,
          })
          await this.persistAuthSession(refreshedSession)
        } else {
          this.authResult = session
          this.authStorageWarning = null
        }
      } catch (error) {
        this.authResult = null
        resetAuthenticatedStores(this._p)
        if (shouldClearAuthSession(error)) {
          await clearAuthSession().catch(() => {})
        }
      }

      return this.authResult
    },

    finishUiFlow() {
      this.draft = createOnboardingDraft()
      this.fieldErrors = {}
      this.submitError = null
      this.voiceWarning = null
      this.status = 'ready'
    },

    async reset() {
      let authStorageCleared = true
      try {
        await clearAuthSession()
      } catch {
        authStorageCleared = false
      }
      this.draft = createOnboardingDraft()
      this.fieldErrors = {}
      this.status = 'idle'
      this.submitError = null
      this.voiceWarning = null
      this.authStorageWarning = null
      this.authResult = null
      this.voiceResult = null
      return { authStorageCleared }
    },
  },
})
