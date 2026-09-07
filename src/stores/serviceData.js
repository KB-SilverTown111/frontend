import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { accountsApi } from '../api/accounts.js'
import { billsApi } from '../api/bills.js'
import { mobileBranchesApi } from '../api/mobileBranches.js'
import { remindersApi } from '../api/reminders.js'
import { normalizeApiError } from '../api/errors.js'

export const useServiceDataStore = defineStore('service-data', () => {
  const accounts = ref([])
  const bills = ref([])
  const monthlySummary = ref(null)
  const reminders = ref([])
  const mobileBranches = ref([])
  const loading = reactive({
    accounts: false,
    bills: false,
    monthlySummary: false,
    reminders: false,
    mobileBranches: false,
  })
  const errors = reactive({
    accounts: null,
    bills: null,
    monthlySummary: null,
    reminders: null,
    mobileBranches: null,
  })
  let resetVersion = 0

  function responseItems(value) {
    if (Array.isArray(value)) return value
    return Array.isArray(value?.items) ? value.items : []
  }

  async function runResource(key, request, assign) {
    const requestVersion = resetVersion
    loading[key] = true
    errors[key] = null
    try {
      const value = await request()
      if (requestVersion === resetVersion) assign(value)
      return value
    } catch (error) {
      const normalizedError = normalizeApiError(error)
      if (requestVersion === resetVersion) errors[key] = normalizedError
      throw normalizedError
    } finally {
      if (requestVersion === resetVersion) loading[key] = false
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
      'monthlySummary',
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

  function loadMobileBranches(params) {
    return loadResource(
      'mobileBranches',
      () => mobileBranchesApi.nearby(params),
      (value) => {
        mobileBranches.value = responseItems(value)
          .slice()
          .sort((left, right) => {
            return mobileBranchDistanceRank(left) - mobileBranchDistanceRank(right)
          })
      },
    )
  }

  function mobileBranchDistanceRank(branch) {
    const rawDistance = branch?.distanceMeters
    if (rawDistance == null || (typeof rawDistance === 'string' && !rawDistance.trim())) {
      return Number.POSITIVE_INFINITY
    }

    const distance = Number(rawDistance)
    return Number.isFinite(distance) && distance >= 0 ? distance : Number.POSITIVE_INFINITY
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

  function reset() {
    resetVersion += 1
    accounts.value = []
    bills.value = []
    monthlySummary.value = null
    reminders.value = []
    mobileBranches.value = []
    Object.assign(loading, {
      accounts: false,
      bills: false,
      monthlySummary: false,
      reminders: false,
      mobileBranches: false,
    })
    Object.assign(errors, {
      accounts: null,
      bills: null,
      monthlySummary: null,
      reminders: null,
      mobileBranches: null,
    })
  }

  return {
    accounts,
    bills,
    monthlySummary,
    reminders,
    mobileBranches,
    loading,
    errors,
    loadAccounts,
    loadBills,
    loadMonthlySummary,
    loadReminders,
    loadMobileBranches,
    createReminder,
    reset,
  }
})
