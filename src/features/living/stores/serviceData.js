import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { accountsApi } from '../../transfer/api/accounts.js'
import { billsApi } from '../../bills/api/bills.js'
import { mobileBranchesApi } from '../api/mobileBranches.js'
import { remindersApi } from '../api/reminders.js'
import { normalizeApiError } from '../../../shared/api/errors.js'
import { createIdempotencyKey } from '../../../shared/api/request.js'

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
  const reminderMutationKeys = new Map()

  function responseItems(value) {
    if (Array.isArray(value)) return value
    return Array.isArray(value?.items) ? value.items : []
  }

  async function runResource(key, request, assign, normalizeError = normalizeApiError) {
    const requestVersion = resetVersion
    loading[key] = true
    errors[key] = null
    try {
      const value = await request()
      if (requestVersion === resetVersion) assign(value)
      return value
    } catch (error) {
      const normalizedError = normalizeError(error)
      if (requestVersion === resetVersion) errors[key] = normalizedError
      throw normalizedError
    } finally {
      if (requestVersion === resetVersion) loading[key] = false
    }
  }

  const loadResource = runResource

  function reminderRequestFingerprint(request) {
    try {
      return JSON.stringify(request ?? {})
    } catch {
      return String(request)
    }
  }

  function reminderMutationKey(operation, identifier, request, options = {}) {
    const cacheKey = `${operation}:${identifier || 'new'}`
    const fingerprint = reminderRequestFingerprint(request)
    const requestedKey = options?.idempotencyKey
    if (requestedKey) {
      reminderMutationKeys.set(cacheKey, { fingerprint, key: requestedKey })
      return requestedKey
    }

    const previous = reminderMutationKeys.get(cacheKey)
    if (previous?.fingerprint === fingerprint) return previous.key

    const key = createIdempotencyKey()
    reminderMutationKeys.set(cacheKey, { fingerprint, key })
    return key
  }

  function clearReminderMutationKey(operation, identifier, request) {
    const cacheKey = `${operation}:${identifier || 'new'}`
    const previous = reminderMutationKeys.get(cacheKey)
    if (previous?.fingerprint === reminderRequestFingerprint(request)) {
      reminderMutationKeys.delete(cacheKey)
    }
  }

  function normalizeReminderError(error, operation) {
    const normalized = normalizeApiError(error)
    const messages = {
      list: '알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      create: '알림을 저장하지 못했어요. 다시 시도해 주세요.',
      update: '알림을 변경하지 못했어요. 다시 시도해 주세요.',
      cancel: '알림을 취소하지 못했어요. 다시 시도해 주세요.',
    }
    const message =
      normalized.status === 404 && operation !== 'list'
        ? '알림을 찾지 못했어요. 목록을 다시 확인해 주세요.'
        : messages[operation] || '알림 요청을 처리하지 못했어요. 다시 시도해 주세요.'
    return { ...normalized, message }
  }

  function invalidReminderId(operation) {
    const error = normalizeReminderError(
      { response: { data: { code: 'REMINDER_ID_REQUIRED', message: '알림을 선택해 주세요.' } } },
      operation,
    )
    errors.reminders = error
    return error
  }

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
      (error) => normalizeReminderError(error, 'list'),
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

  async function createReminder(request, options = {}) {
    const normalizedOptions = options ?? {}
    const idempotencyKey = reminderMutationKey('create', null, request, normalizedOptions)
    return runResource(
      'reminders',
      () =>
        remindersApi.create(request, {
          ...normalizedOptions,
          idempotencyKey,
        }),
      (value) => {
        reminders.value = [value, ...reminders.value]
        clearReminderMutationKey('create', null, request)
      },
      (error) => normalizeReminderError(error, 'create'),
    )
  }

  async function updateReminder(reminderId, request, options = {}) {
    const normalizedReminderId = String(reminderId ?? '').trim()
    if (!normalizedReminderId) throw invalidReminderId('update')

    const normalizedOptions = options ?? {}
    const idempotencyKey = reminderMutationKey(
      'update',
      normalizedReminderId,
      request,
      normalizedOptions,
    )
    return runResource(
      'reminders',
      () =>
        remindersApi.update(normalizedReminderId, request, {
          ...normalizedOptions,
          idempotencyKey,
        }),
      (value) => {
        const serverReminder =
          value?.reminder && typeof value.reminder === 'object' ? value.reminder : value
        const updatedReminder =
          serverReminder && typeof serverReminder === 'object' ? serverReminder : request
        reminders.value = reminders.value.map((reminder) => {
          const currentId = String(reminder?.reminderId ?? reminder?.id ?? '')
          if (currentId !== normalizedReminderId) return reminder
          return {
            ...reminder,
            ...updatedReminder,
            reminderId: updatedReminder?.reminderId ?? reminder.reminderId ?? normalizedReminderId,
          }
        })
        clearReminderMutationKey('update', normalizedReminderId, request)
      },
      (error) => normalizeReminderError(error, 'update'),
    )
  }

  async function cancelReminder(reminderId, options = {}) {
    const normalizedReminderId = String(reminderId ?? '').trim()
    if (!normalizedReminderId) throw invalidReminderId('cancel')

    const normalizedOptions = options ?? {}
    const request = {}
    const idempotencyKey = reminderMutationKey(
      'cancel',
      normalizedReminderId,
      request,
      normalizedOptions,
    )
    return runResource(
      'reminders',
      () =>
        remindersApi.cancel(normalizedReminderId, {
          ...normalizedOptions,
          idempotencyKey,
        }),
      () => {
        reminders.value = reminders.value.filter(
          (reminder) => String(reminder?.reminderId ?? reminder?.id ?? '') !== normalizedReminderId,
        )
        clearReminderMutationKey('cancel', normalizedReminderId, request)
      },
      (error) => normalizeReminderError(error, 'cancel'),
    )
  }

  function reset() {
    resetVersion += 1
    accounts.value = []
    bills.value = []
    monthlySummary.value = null
    reminders.value = []
    mobileBranches.value = []
    reminderMutationKeys.clear()
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
    updateReminder,
    cancelReminder,
    reset,
  }
})
