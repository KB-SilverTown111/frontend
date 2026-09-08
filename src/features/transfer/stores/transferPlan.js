import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  PLAN_REPEAT,
  clearTransferPlans,
  isDueToday,
  isSentThisMonth,
  loadTransferPlans,
  normalizePlan,
  saveTransferPlans,
} from '../services/transferPlanStorage.js'

/**
 * 정기 송금 약속. 서버 엔드포인트가 없어 브라우저 저장소만 사용한다.
 * 약속은 알림 용도이며 여기에서 송금을 실행하지 않는다.
 */
export const useTransferPlanStore = defineStore('transferPlan', () => {
  const plans = ref([])
  const loaded = ref(false)
  const error = ref(null)

  const sortedPlans = computed(() =>
    [...plans.value].sort((left, right) => left.dayOfMonth - right.dayOfMonth),
  )
  const duePlans = computed(() => sortedPlans.value.filter((plan) => isDueToday(plan)))
  const hasPlans = computed(() => plans.value.length > 0)

  function load() {
    plans.value = loadTransferPlans()
    loaded.value = true
    return plans.value
  }

  function ensureLoaded() {
    if (!loaded.value) load()
    return plans.value
  }

  function findPlan(planId) {
    const id = String(planId ?? '')
    if (!id) return null
    return ensureLoaded().find((plan) => plan.id === id) ?? null
  }

  function alreadySentThisMonth(planId) {
    const plan = findPlan(planId)
    return plan ? isSentThisMonth(plan) : false
  }

  /** 저장에 실패하면 메모리에만 남는다. 호출하는 쪽이 그걸 알아야 한다. */
  function persist() {
    const { plans: saved, saved: stored } = saveTransferPlans(plans.value)
    plans.value = saved
    return stored
  }

  /** 저장할 수 없는 값이면 화면에 그대로 보여줄 문구를 남긴다. */
  function validate(input) {
    const normalized = normalizePlan({ ...input, id: input?.id || undefined })
    if (!normalized) {
      error.value = '받는 분, 금액, 날짜를 다시 확인해 주세요.'
      return null
    }
    error.value = null
    return normalized
  }

  function addPlan(input) {
    ensureLoaded()
    const plan = validate(input)
    if (!plan) return null

    plans.value = [...plans.value, plan]
    if (!persist()) {
      error.value = '기록을 저장하지 못했어요. 잠시 후 다시 확인해 주세요.'
      return null
    }
    return plan
  }

  function updatePlan(planId, input) {
    ensureLoaded()
    const current = findPlan(planId)
    if (!current) {
      error.value = '고칠 약속을 찾지 못했어요.'
      return null
    }

    const plan = validate({ ...current, ...input, id: current.id })
    if (!plan) return null

    plans.value = plans.value.map((item) => (item.id === plan.id ? plan : item))
    if (!persist()) {
      error.value = '기록을 저장하지 못했어요. 잠시 후 다시 확인해 주세요.'
      return null
    }
    return plan
  }

  function removePlan(planId) {
    ensureLoaded()
    const id = String(planId ?? '')
    plans.value = plans.value.filter((plan) => plan.id !== id)
    persist()
    error.value = null
  }

  /** 실제 송금이 끝난 뒤에만 기록한다. 이 값으로 이번 달 중복을 가린다. */
  function markSent(planId, sentAt = new Date().toISOString()) {
    return updatePlan(planId, { lastSentAt: sentAt })
  }

  function reset() {
    clearTransferPlans()
    plans.value = []
    loaded.value = false
    error.value = null
  }

  return {
    plans,
    loaded,
    error,
    sortedPlans,
    duePlans,
    hasPlans,
    PLAN_REPEAT,
    load,
    ensureLoaded,
    findPlan,
    alreadySentThisMonth,
    addPlan,
    updatePlan,
    removePlan,
    markSent,
    reset,
  }
})
