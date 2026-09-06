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
    execute: transfersApi.execute,
  }
  transfersApi.prepare = async () => ({ transferId: 't-1', status: 'READY' })
  transfersApi.validateAmount = async (request) => ({ ...request, confirmedAmount: 50000 })
  transfersApi.execute = async () => ({ paymentId: 'p-1', status: 'COMPLETED' })

  try {
    const store = useTransferStore()
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    const validation = await store.validateAmount({ recognizedAmount: 50000, amountCandidates: [] })
    const result = await store.execute()

    assert.equal(store.transferId, 't-1')
    assert.equal(validation.confirmedAmount, 50000)
    assert.equal(result.paymentId, 'p-1')
    assert.equal(store.result.status, 'COMPLETED')
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
