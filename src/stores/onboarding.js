import { defineStore } from 'pinia'

import { normalizeApiError } from '../api/errors.js'
import { onboardingApi } from '../api/onboarding.js'
import {
  buildLoginRequest,
  buildSignUpRequest,
  buildVoiceSettingsRequest,
  createOnboardingDraft,
  validateStep,
} from '../features/onboarding/contract.js'

const REQUIRED_DATA_STEPS = ['consents', 'account', 'identity', 'contact', 'finance', 'voice']

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    draft: createOnboardingDraft(),
    fieldErrors: {},
    status: 'idle',
    submitError: null,
    voiceWarning: null,
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

      try {
        const authResult = await onboardingApi.signup(buildSignUpRequest(this.draft))
        this.authResult = authResult

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

      try {
        this.authResult = await onboardingApi.login(buildLoginRequest(this.draft))
        this.status = 'success'
        return { ok: true }
      } catch (error) {
        this.submitError = normalizeApiError(error)
        this.status = 'error'
        return { ok: false, stepId: null }
      }
    },

    finishUiFlow() {
      this.draft = createOnboardingDraft()
      this.fieldErrors = {}
      this.submitError = null
      this.voiceWarning = null
      this.status = 'ready'
    },

    reset() {
      this.draft = createOnboardingDraft()
      this.fieldErrors = {}
      this.status = 'idle'
      this.submitError = null
      this.voiceWarning = null
      this.authResult = null
      this.voiceResult = null
    },
  },
})
