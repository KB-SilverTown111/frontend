import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import { accountsApi } from '../src/api/accounts.js'
import { billsApi } from '../src/api/bills.js'
import { remindersApi } from '../src/api/reminders.js'
import { transfersApi } from '../src/api/transfers.js'
import { voiceApi } from '../src/api/voice.js'
import { useBillStore } from '../src/stores/bill.js'
import { useServiceDataStore } from '../src/stores/serviceData.js'
import { useTransferStore } from '../src/stores/transfer.js'
import { useVoiceStore } from '../src/stores/voice.js'

function setup() {
  setActivePinia(createPinia())
}

test('service data store loads API collections and exposes status', async () => {
  setup()
  const originalList = accountsApi.list
  const originalReminders = remindersApi.list
  accountsApi.list = async () => [{ accountId: 'a-1', balance: 125000 }]
  remindersApi.list = async () => [{ reminderId: 'r-1', title: '전기요금' }]

  try {
    const store = useServiceDataStore()
    await store.loadAccounts()
    await store.loadReminders({ status: 'PENDING' })

    assert.deepEqual(store.accounts, [{ accountId: 'a-1', balance: 125000 }])
    assert.deepEqual(store.reminders, [{ reminderId: 'r-1', title: '전기요금' }])
    assert.equal(store.loading.accounts, false)
    assert.equal(store.errors.accounts, null)
  } finally {
    accountsApi.list = originalList
    remindersApi.list = originalReminders
  }
})

test('transfer store keeps prepared transfer context and calls API actions', async () => {
  setup()
  const originals = {
    prepare: transfersApi.prepare,
    validateAmount: transfersApi.validateAmount,
    confirm: transfersApi.confirm,
    authenticate: transfersApi.authenticate,
    execute: transfersApi.execute,
  }
  let executeOptions = null
  transfersApi.prepare = async (request) => ({ transferId: 't-1', status: 'DRAFT', ...request })
  transfersApi.validateAmount = async (request) => ({ ...request, confirmedAmount: 50000 })
  transfersApi.confirm = async () => ({ transferId: 't-1', status: 'CONFIRMED', executable: true })
  transfersApi.authenticate = async () => ({ authenticated: true, expiresAt: '2026-09-07T00:00:00Z' })
  transfersApi.execute = async (transferId, request, options) => {
    executeOptions = options
    return { transactionId: 'x-1', transferId, status: 'SUCCESS', amount: 50000 }
  }

  try {
    const store = useTransferStore()
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    const validation = await store.validateAmount({ recognizedAmount: 50000, amountCandidates: [] })
    await store.confirm({ approved: true })
    await store.authenticate({ pin: '123456' })
    const result = await store.execute()

    assert.equal(store.transferId, 't-1')
    assert.equal(validation.confirmedAmount, 50000)
    assert.equal(store.executable, true)
    assert.equal(store.authenticated, true)
    assert.ok(executeOptions.idempotencyKey)
    assert.equal(result.status, 'SUCCESS')
    assert.equal(store.result.transactionId, 'x-1')
  } finally {
    Object.assign(transfersApi, originals)
  }
})

test('transfer store refuses to execute before confirmation and PIN authentication', async () => {
  setup()
  const originals = {
    prepare: transfersApi.prepare,
    confirm: transfersApi.confirm,
    execute: transfersApi.execute,
  }
  let executed = false
  transfersApi.prepare = async () => ({ transferId: 't-2', status: 'DRAFT' })
  transfersApi.confirm = async () => ({ transferId: 't-2', status: 'CONFIRMED', executable: true })
  transfersApi.execute = async () => {
    executed = true
    return { status: 'SUCCESS' }
  }

  try {
    const store = useTransferStore()
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })

    // 승인 전에는 실행하지 않는다.
    await assert.rejects(() => store.execute())

    // 승인만 하고 PIN 인증을 건너뛰어도 실행하지 않는다.
    await store.confirm({ approved: true })
    await assert.rejects(() => store.execute())

    assert.equal(executed, false)
  } finally {
    Object.assign(transfersApi, originals)
  }
})

test('bill store uploads OCR data and confirms then executes a bill', async () => {
  setup()
  const originals = {
    ocr: billsApi.ocr,
    confirm: billsApi.confirm,
    execute: billsApi.execute,
  }
  billsApi.ocr = async () => ({ billId: 'b-1', payee: '한국전력', amount: 48200 })
  billsApi.confirm = async () => ({ billId: 'b-1', confirmationToken: 'token-1', executable: true })
  billsApi.execute = async () => ({ paymentId: 'p-1', status: 'COMPLETED' })

  try {
    const store = useBillStore()
    await store.upload({ image: new Blob(['bill'], { type: 'image/jpeg' }) })
    await store.confirm({ approved: true })
    const result = await store.execute()

    assert.equal(store.billId, 'b-1')
    assert.equal(store.confirmationToken, 'token-1')
    assert.equal(result.status, 'COMPLETED')
  } finally {
    Object.assign(billsApi, originals)
  }
})

test('voice store creates a session and persists settings through API', async () => {
  setup()
  const originals = {
    createSession: voiceApi.createSession,
    updateSettings: voiceApi.updateSettings,
  }
  voiceApi.createSession = async () => ({ sessionId: 's-1', status: 'ACTIVE' })
  voiceApi.updateSettings = async (settings) => ({ ...settings, updatedAt: '2026-09-06T00:00:00Z' })

  try {
    const store = useVoiceStore()
    await store.startSession('TRANSFER')
    await store.saveSettings({ ttsVoice: 'ko-KR-JiMinNeural' })

    assert.equal(store.sessionId, 's-1')
    assert.equal(store.settings.ttsVoice, 'ko-KR-JiMinNeural')
  } finally {
    Object.assign(voiceApi, originals)
  }
})
