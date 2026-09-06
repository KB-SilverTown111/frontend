import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { clearAuthSession, loadAuthSession, saveAuthSession } from '../api/authStorage.js'
import { onboardingApi } from '../api/onboarding.js'
import {
  buildLoginRequest,
  buildSignUpRequest,
  buildVoiceSettingsRequest,
  createOnboardingDraft,
  validateStep,
} from '../features/onboarding/contract.js'

const REQUIRED_DATA_STEPS = ['consents', 'account', 'identity', 'contact', 'finance', 'voice']
const AUTH_STORAGE_WARNING =
  '로그인 상태를 안전하게 저장하지 못했어요. 앱을 종료하면 다시 로그인해야 해요.'

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
        await this.persistAuthSession(authResult)

        try {
          this.voiceResult = await onboardingApi.saveVoiceSettings(
            buildVoiceSettingsRequest(this.draft),
            authResult.accessToken,
          )
        } catch {
          this.voiceWarning = '음성 설정은 가입 후 다시 저장할 수 있어요.'
        }

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
        await this.persistAuthSession(await onboardingApi.login(buildLoginRequest(this.draft)))
        this.status = 'success'
        return { ok: true }
      } catch (error) {
        this.submitError = normalizeApiError(error)
        this.status = 'error'
        return { ok: false, stepId: null }
      }
    },

    async persistAuthSession(authResult) {
      try {
        this.authResult = await saveAuthSession(authResult)
        this.authStorageWarning = null
      } catch {
        this.authResult = authResult
        this.authStorageWarning = AUTH_STORAGE_WARNING
      }
    },

    async restoreAuthSession() {
      try {
        this.authResult = await loadAuthSession()
        if (this.authResult) this.authStorageWarning = null
      } catch {
        this.authResult = null
        this.authStorageWarning = AUTH_STORAGE_WARNING
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
      await clearAuthSession().catch(() => {})
      this.draft = createOnboardingDraft()
      this.fieldErrors = {}
      this.status = 'idle'
      this.submitError = null
      this.voiceWarning = null
      this.authStorageWarning = null
      this.authResult = null
      this.voiceResult = null
    },
  },
})
