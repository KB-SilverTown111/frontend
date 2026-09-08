/**
 * 정기 송금 약속을 브라우저에 저장한다.
 *
 * 서버에 정기·예약 송금 엔드포인트가 없어 약속 정보가 클라이언트에만 있다.
 * 화면 안내대로 정한 날에 알리기만 하고 저절로 실행하지는 않는다.
 * 서버 API가 생기면 이 파일만 교체하면 된다.
 *
 * 계좌번호와 토큰은 저장하지 않고 화면에 보여줄 값만 둔다.
 */

export const TRANSFER_PLAN_KEY = 'gwipyeonhan.transfer-plans.v1'

export const PLAN_REPEAT = {
  MONTHLY: 'MONTHLY',
  ONCE: 'ONCE',
}

function storage() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readStoredItem(store, key) {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

function createPlanId() {
  const randomUUID = globalThis.crypto?.randomUUID
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto)
  return `plan-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

/** 화면에서 다루는 값만 남기고 나머지는 버린다. */
export function normalizePlan(value) {
  const amount = Number(value?.amount)
  const dayOfMonth = Number(value?.dayOfMonth)
  const label = String(value?.label ?? '').trim()
  const recipientName = String(value?.recipientName ?? '').trim()

  if (!label && !recipientName) return null
  if (!Number.isSafeInteger(amount) || amount <= 0) return null
  if (!Number.isSafeInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null

  return {
    id: String(value?.id ?? '') || createPlanId(),
    label: label || recipientName,
    recipientName: recipientName || label,
    recipientId: String(value?.recipientId ?? ''),
    amount,
    dayOfMonth,
    repeat: value?.repeat === PLAN_REPEAT.ONCE ? PLAN_REPEAT.ONCE : PLAN_REPEAT.MONTHLY,
    lastSentAt: String(value?.lastSentAt ?? ''),
  }
}

export function loadTransferPlans() {
  const store = storage()
  if (!store) return []

  const stored = readStoredItem(store, TRANSFER_PLAN_KEY)
  if (stored === null) return []

  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizePlan).filter(Boolean)
  } catch {
    // 값이 깨졌으면 버리고 빈 목록으로 시작한다.
    clearTransferPlans()
    return []
  }
}

export function saveTransferPlans(plans) {
  const store = storage()
  const normalized = (Array.isArray(plans) ? plans : []).map(normalizePlan).filter(Boolean)

  let saved = false
  try {
    store?.setItem(TRANSFER_PLAN_KEY, JSON.stringify(normalized))
    saved = Boolean(store)
  } catch {
    // 저장소를 쓸 수 없어도 화면은 이어진다. 대신 저장 실패를 위로 알린다.
  }
  return { plans: normalized, saved }
}

export function clearTransferPlans() {
  const store = storage()
  try {
    store?.removeItem(TRANSFER_PLAN_KEY)
  } catch {
    // 지우지 못해도 다음 읽기에서 걸러진다.
  }
}

/** 이번 달에 이미 보낸 약속인지. 달이 바뀌면 다시 보낼 수 있다. */
export function isSentThisMonth(plan, now = new Date()) {
  const lastSentAt = new Date(plan?.lastSentAt ?? '')
  if (Number.isNaN(lastSentAt.getTime())) return false

  return lastSentAt.getFullYear() === now.getFullYear() && lastSentAt.getMonth() === now.getMonth()
}

/** 오늘 보낼 약속인지. 말일이 없는 달에는 그 달의 마지막 날에 알린다. */
export function isDueToday(plan, now = new Date()) {
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dueDay = Math.min(Number(plan?.dayOfMonth), lastDayOfMonth)
  return dueDay === now.getDate()
}
