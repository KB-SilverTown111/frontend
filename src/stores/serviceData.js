import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { accountsApi } from '../api/accounts.js'
import { billsApi } from '../api/bills.js'
import { mobileBranchesApi } from '../api/mobileBranches.js'
import { profileApi } from '../api/profile.js'
import { remindersApi } from '../api/reminders.js'
import { normalizeApiError } from '../api/errors.js'
import { voiceApi } from '../api/voice.js'

export const useServiceDataStore = defineStore('service-data', () => {
  const accounts = ref([])
  const bills = ref([])
  const monthlySummary = ref(null)
  const reminders = ref([])
  const branches = ref([])
  const profile = ref(null)
  const consents = ref(null)
  const voiceSettings = ref(null)
  const loading = reactive({
    accounts: false,
    bills: false,
    reminders: false,
    branches: false,
    profile: false,
    consents: false,
    voiceSettings: false,
  })
  const errors = reactive({
    accounts: null,
    bills: null,
    reminders: null,
    branches: null,
    profile: null,
    consents: null,
    voiceSettings: null,
  })

  function responseItems(value) {
    if (Array.isArray(value)) return value
    return Array.isArray(value?.items) ? value.items : []
  }

  function reminderIdOf(reminder) {
    return reminder?.reminderId ?? reminder?.id
  }

  async function runResource(key, request, assign) {
    loading[key] = true
    errors[key] = null
    try {
      const value = await request()
      assign(value)
      return value
    } catch (error) {
      errors[key] = normalizeApiError(error)
      throw errors[key]
    } finally {
      loading[key] = false
    }
  }

  const loadResource = runResource

  function loadAccounts(params) {
    return loadResource(
      'accounts',
      () => accountsApi.list(params),
      (value) => {
        accounts.value = Array.isArray(value) ? value : []
      },
    )
  }

  function loadBills(params) {
    return loadResource(
      'bills',
      () => billsApi.list(params),
      (value) => {
        bills.value = responseItems(value)
      },
    )
  }

  function loadMonthlySummary(params) {
    return loadResource(
      'bills',
      () => billsApi.monthlySummary(params),
      (value) => {
        monthlySummary.value = value
      },
    )
  }

  function loadReminders(params) {
    return loadResource(
      'reminders',
      () => remindersApi.list(params),
      (value) => {
        reminders.value = responseItems(value)
      },
    )
  }

  function loadBranches(params) {
    return loadResource(
      'branches',
      () => mobileBranchesApi.list(params),
      (value) => {
        branches.value = Array.isArray(value) ? value : []
      },
    )
  }

  function loadProfile() {
    return loadResource(
      'profile',
      () => profileApi.get(),
      (value) => {
        profile.value = value
      },
    )
  }

  function loadConsents() {
    return loadResource(
      'consents',
      () => profileApi.getConsents(),
      (value) => {
        consents.value = value
      },
    )
  }

  function loadVoiceSettings() {
    return loadResource(
      'voiceSettings',
      () => voiceApi.getSettings(),
      (value) => {
        voiceSettings.value = value
      },
    )
  }

  async function createReminder(request, options) {
    return runResource(
      'reminders',
      () => remindersApi.create(request, options),
      (value) => {
        reminders.value = [value, ...reminders.value]
      },
    )
  }

  async function updateReminder(reminderId, request, options) {
    return runResource(
      'reminders',
      () => remindersApi.update(reminderId, request, options),
      (value) => {
        reminders.value = reminders.value.map((reminder) =>
          reminderIdOf(reminder) === reminderId ? value : reminder,
        )
      },
    )
  }

  async function cancelReminder(reminderId, options) {
    await runResource(
      'reminders',
      () => remindersApi.cancel(reminderId, options),
      () => {
        reminders.value = reminders.value.filter(
          (reminder) => reminderIdOf(reminder) !== reminderId,
        )
      },
    )
  }

  async function snoozeReminder(reminderId, request, options) {
    return runResource(
      'reminders',
      () => remindersApi.snooze(reminderId, request, options),
      (value) => {
        reminders.value = reminders.value.map((reminder) =>
          reminderIdOf(reminder) === reminderId ? value : reminder,
        )
      },
    )
  }

  async function saveProfile(request, options) {
    return runResource(
      'profile',
      () => profileApi.update(request, options),
      (value) => {
        profile.value = value
      },
    )
  }

  async function saveConsents(request, options) {
    return runResource(
      'consents',
      () => profileApi.updateConsents(request, options),
      (value) => {
        consents.value = value
      },
    )
  }

  return {
    accounts,
    bills,
    monthlySummary,
    reminders,
    branches,
    profile,
    consents,
    voiceSettings,
    loading,
    errors,
    loadAccounts,
    loadBills,
    loadMonthlySummary,
    loadReminders,
    loadBranches,
    loadProfile,
    loadConsents,
    loadVoiceSettings,
    createReminder,
    updateReminder,
    cancelReminder,
    snoozeReminder,
    saveProfile,
    saveConsents,
  }
})
