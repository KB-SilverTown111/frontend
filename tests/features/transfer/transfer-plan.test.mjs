import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import {
  TRANSFER_PLAN_KEY,
  isDueToday,
  isSentThisMonth,
  loadTransferPlans,
  normalizePlan,
  saveTransferPlans,
} from '../../../src/features/transfer/services/transferPlanStorage.js'
import { useTransferPlanStore } from '../../../src/features/transfer/stores/transferPlan.js'

/** 노드에는 localStorage가 없다. 시험할 동안만 심어둔다. */
function useFakeStorage({ failOnWrite = false } = {}) {
  const values = new Map()

  globalThis.localStorage = {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      if (failOnWrite) throw new Error('QuotaExceededError')
      values.set(key, String(value))
    },
    removeItem: (key) => values.delete(key),
  }

  return {
    values,
    restore: () => delete globalThis.localStorage,
  }
}

function setup(options) {
  setActivePinia(createPinia())
  return useFakeStorage(options)
}

const plan = { label: '월세', amount: 400000, dayOfMonth: 25 }

test('약속 값 검증은 금액과 날짜를 모두 본다', () => {
  assert.equal(normalizePlan({ ...plan, amount: 0 }), null)
  assert.equal(normalizePlan({ ...plan, amount: -1000 }), null)
  assert.equal(normalizePlan({ ...plan, dayOfMonth: 0 }), null)
  assert.equal(normalizePlan({ ...plan, dayOfMonth: 32 }), null)
  assert.equal(normalizePlan({ amount: 1000, dayOfMonth: 1 }), null)

  const normalized = normalizePlan(plan)
  assert.equal(normalized.repeat, 'MONTHLY')
  assert.equal(normalized.amount, 400000)
  assert.ok(normalized.id)
})

test('저장한 약속을 다시 읽을 수 있다', () => {
  const storage = setup()

  try {
    const { plans, saved } = saveTransferPlans([plan])
    assert.equal(saved, true)
    assert.equal(plans.length, 1)
    assert.equal(loadTransferPlans().length, 1)
  } finally {
    storage.restore()
  }
})

test('저장소를 쓸 수 없으면 저장 실패를 알린다', () => {
  const storage = setup({ failOnWrite: true })

  try {
    const { plans, saved } = saveTransferPlans([plan])
    // 화면은 계속 쓸 수 있어야 하므로 목록 자체는 돌려준다.
    assert.equal(plans.length, 1)
    assert.equal(saved, false)
  } finally {
    storage.restore()
  }
})

test('저장소가 아예 없으면 빈 목록으로 시작한다', () => {
  setActivePinia(createPinia())

  assert.deepEqual(loadTransferPlans(), [])
  assert.equal(saveTransferPlans([plan]).saved, false)
})

test('저장된 값이 깨졌으면 버리고 빈 목록을 준다', () => {
  const storage = setup()

  try {
    storage.values.set(TRANSFER_PLAN_KEY, '{깨진값')
    assert.deepEqual(loadTransferPlans(), [])
  } finally {
    storage.restore()
  }
})

test('오늘 보낼 약속을 날짜로 가려낸다', () => {
  const september25 = new Date(2026, 8, 25)
  assert.equal(isDueToday({ dayOfMonth: 25 }, september25), true)
  assert.equal(isDueToday({ dayOfMonth: 24 }, september25), false)

  // 9월은 30일까지다. 31일 약속이 영영 안 뜨면 안 된다.
  assert.equal(isDueToday({ dayOfMonth: 31 }, new Date(2026, 8, 30)), true)
})

test('이번 달에 보냈는지 달 단위로 본다', () => {
  const september25 = new Date(2026, 8, 25)
  assert.equal(isSentThisMonth({ lastSentAt: '2026-09-01T00:00:00Z' }, september25), true)
  assert.equal(isSentThisMonth({ lastSentAt: '2026-08-31T00:00:00Z' }, september25), false)
  assert.equal(isSentThisMonth({ lastSentAt: '' }, september25), false)
  assert.equal(isSentThisMonth({}, september25), false)
})

test('없는 약속에 보낸 기록을 남기려 하면 실패를 알린다', () => {
  const storage = setup()

  try {
    const store = useTransferPlanStore()
    store.load()

    assert.equal(store.markSent('없는-약속-아이디'), null)
    assert.equal(store.error, '고칠 약속을 찾지 못했어요.')
  } finally {
    storage.restore()
  }
})

test('저장에 실패하면 보낸 기록을 남겼다고 하지 않는다', () => {
  const storage = setup()

  try {
    const store = useTransferPlanStore()
    const created = store.addPlan(plan)
    assert.ok(created)

    // 기록하는 시점에만 저장소가 막힌 상황을 만든다.
    storage.restore()
    useFakeStorage({ failOnWrite: true })

    assert.equal(store.markSent(created.id), null)
    assert.equal(store.error, '기록을 저장하지 못했어요. 잠시 후 다시 확인해 주세요.')
  } finally {
    delete globalThis.localStorage
  }
})

test('약속 변경은 저장 성공 뒤에만 메모리 목록에 반영된다', () => {
  const storage = setup()

  try {
    const store = useTransferPlanStore()
    const created = store.addPlan(plan)
    const original = store.plans.map((item) => ({ ...item }))

    storage.restore()
    useFakeStorage({ failOnWrite: true })

    assert.equal(store.addPlan({ label: '새 약속', amount: 1000, dayOfMonth: 1 }), null)
    assert.deepEqual(store.plans, original)

    assert.equal(store.updatePlan(created.id, { amount: 500000 }), null)
    assert.deepEqual(store.plans, original)

    assert.equal(store.removePlan(created.id), false)
    assert.deepEqual(store.plans, original)
    assert.equal(store.error, '기록을 저장하지 못했어요. 잠시 후 다시 확인해 주세요.')
  } finally {
    delete globalThis.localStorage
  }
})

test('보낸 기록이 남으면 이번 달 중복으로 잡힌다', () => {
  const storage = setup()

  try {
    const store = useTransferPlanStore()
    const created = store.addPlan(plan)

    assert.equal(store.alreadySentThisMonth(created.id), false)
    assert.ok(store.markSent(created.id))
    assert.equal(store.alreadySentThisMonth(created.id), true)
  } finally {
    storage.restore()
  }
})
