/**
 * 마무리하지 못한 송금 초안을 기억한다.
 *
 * 서버에 "진행 중 송금 목록" 엔드포인트가 없어 조회할 id를 화면 쪽에서 들고 있어야 한다.
 * 인증 세션과 같은 sessionStorage를 쓴다. 탭을 닫으면 함께 지워진다.
 * 수취인 이름·계좌번호·금액은 남기지 않고 조회에 필요한 값만 둔다.
 */

export const TRANSFER_DRAFT_KEY = 'gwipyeonhan.transfer-draft.v1'

/** 초안을 오래 열어두지 않는다. 이 시간을 넘기면 화면 2-21로 안내한다. */
export const TRANSFER_DRAFT_MAX_AGE_MS = 3 * 60 * 1000

function storage() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function parseDraft(value) {
  try {
    const draft = typeof value === 'string' ? JSON.parse(value) : value
    if (!draft?.transferId || typeof draft.transferId !== 'string') return null
    return { transferId: draft.transferId, preparedAt: draft.preparedAt ?? '' }
  } catch {
    return null
  }
}

export function saveTransferDraft(transferId, preparedAt) {
  const id = String(transferId ?? '').trim()
  if (!id) return null

  const draft = { transferId: id, preparedAt: preparedAt ?? new Date().toISOString() }
  const store = storage()
  try {
    store?.setItem(TRANSFER_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // 저장하지 못해도 이번 송금 진행에는 지장이 없다.
  }
  return draft
}

function readStoredItem(store, key) {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

export function loadTransferDraft() {
  const store = storage()
  if (!store) return null

  const stored = readStoredItem(store, TRANSFER_DRAFT_KEY)
  if (stored === null) return null

  const draft = parseDraft(stored)
  if (!draft) {
    clearTransferDraft()
    return null
  }
  return draft
}

export function clearTransferDraft() {
  const store = storage()
  try {
    store?.removeItem(TRANSFER_DRAFT_KEY)
  } catch {
    // 지우지 못해도 복원 조건에서 걸러진다.
  }
}

/** 초안을 만든 지 얼마나 지났는지. 시각을 알 수 없으면 0을 돌려준다. */
export function transferDraftAgeMs(draft, now = Date.now()) {
  const preparedAt = Date.parse(draft?.preparedAt ?? '')
  if (!Number.isFinite(preparedAt)) return 0
  return Math.max(0, now - preparedAt)
}

export function isTransferDraftExpired(draft, now = Date.now()) {
  return transferDraftAgeMs(draft, now) > TRANSFER_DRAFT_MAX_AGE_MS
}
