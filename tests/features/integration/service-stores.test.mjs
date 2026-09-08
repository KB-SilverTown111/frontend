import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinia, setActivePinia } from 'pinia'

import { accountsApi } from '../../../src/features/transfer/api/accounts.js'
import { billsApi } from '../../../src/features/bills/api/bills.js'
import { mobileBranchesApi } from '../../../src/features/living/api/mobileBranches.js'
import { remindersApi } from '../../../src/features/living/api/reminders.js'
import { transfersApi } from '../../../src/features/transfer/api/transfers.js'
import { useBillStore } from '../../../src/features/bills/stores/bill.js'
import { useServiceDataStore } from '../../../src/features/living/stores/serviceData.js'
import { useTransferStore } from '../../../src/features/transfer/stores/transfer.js'

function setup() {
  setActivePinia(createPinia())
}

test('service data store loads account, bill summary, and reminder collections', async () => {
  setup()
  const originalList = accountsApi.list
  const originalReminders = remindersApi.list
  const originalSummary = billsApi.monthlySummary
  accountsApi.list = async () => [{ accountId: 'a-1', balance: 125000 }]
  remindersApi.list = async () => [{ reminderId: 'r-1', title: '전기요금' }]
  billsApi.monthlySummary = async () => ({ totalAmount: 48200, totalCount: 1 })

  try {
    const store = useServiceDataStore()
    await store.loadAccounts()
    await store.loadReminders({ status: 'SCHEDULED' })
    await store.loadMonthlySummary()

    assert.deepEqual(store.accounts, [{ accountId: 'a-1', balance: 125000 }])
    assert.deepEqual(store.reminders, [{ reminderId: 'r-1', title: '전기요금' }])
    assert.equal(store.loading.accounts, false)
    assert.equal(store.errors.accounts, null)
    assert.deepEqual(store.monthlySummary, { totalAmount: 48200, totalCount: 1 })
  } finally {
    accountsApi.list = originalList
    remindersApi.list = originalReminders
    billsApi.monthlySummary = originalSummary
  }
})

test('service data store creates, updates, and cancels reminders with retry-safe keys', async () => {
  setup()
  const originals = {
    create: remindersApi.create,
    update: remindersApi.update,
    cancel: remindersApi.cancel,
  }
  const createKeys = []
  const updateKeys = []
  const cancelKeys = []
  let createAttempts = 0
  let updateAttempts = 0
  let cancelAttempts = 0
  const createdReminder = {
    reminderId: 'r-1',
    title: '병원 예약',
    billId: null,
    scheduledAt: '2026-09-10T09:00:00+09:00',
    status: 'SCHEDULED',
  }
  const updatedReminder = {
    ...createdReminder,
    title: '병원 예약 변경',
    scheduledAt: '2026-09-11T10:30:00+09:00',
  }
  remindersApi.create = async (_request, options) => {
    createAttempts += 1
    createKeys.push(options.idempotencyKey)
    if (createAttempts === 1) throw new Error('temporary create failure')
    return createdReminder
  }
  remindersApi.update = async (_reminderId, _request, options) => {
    updateAttempts += 1
    updateKeys.push(options.idempotencyKey)
    if (updateAttempts === 1) throw new Error('temporary update failure')
    return updatedReminder
  }
  remindersApi.cancel = async (_reminderId, options) => {
    cancelAttempts += 1
    cancelKeys.push(options.idempotencyKey)
    if (cancelAttempts === 1) throw new Error('temporary cancel failure')
  }

  try {
    const store = useServiceDataStore()
    const request = { title: '병원 예약', scheduledAt: createdReminder.scheduledAt }

    await assert.rejects(() => store.createReminder(request))
    assert.deepEqual(store.reminders, [])
    await store.createReminder(request)
    assert.deepEqual(store.reminders, [createdReminder])
    assert.equal(createKeys[0], createKeys[1])

    await assert.rejects(() =>
      store.updateReminder('r-1', {
        title: updatedReminder.title,
        scheduledAt: updatedReminder.scheduledAt,
      }),
    )
    assert.deepEqual(store.reminders, [createdReminder])
    await store.updateReminder('r-1', {
      title: updatedReminder.title,
      scheduledAt: updatedReminder.scheduledAt,
    })
    assert.deepEqual(store.reminders, [updatedReminder])
    assert.equal(updateKeys[0], updateKeys[1])

    await assert.rejects(() => store.cancelReminder('r-1'))
    assert.deepEqual(store.reminders, [updatedReminder])
    await store.cancelReminder('r-1')
    assert.deepEqual(store.reminders, [])
    assert.equal(cancelKeys.length, 2)
    assert.ok(cancelKeys[0])
    assert.equal(cancelKeys[0], cancelKeys[1])
    assert.equal(store.loading.reminders, false)
    assert.equal(store.errors.reminders, null)
  } finally {
    Object.assign(remindersApi, originals)
  }
})

test('service data store preserves reminders when update or cancel fails', async () => {
  setup()
  const originals = {
    update: remindersApi.update,
    cancel: remindersApi.cancel,
  }
  const existingReminder = {
    reminderId: 'r-2',
    title: '복약 시간',
    billId: 'b-2',
    scheduledAt: '2026-09-12T08:00:00+09:00',
    status: 'SCHEDULED',
  }
  remindersApi.update = async () => {
    throw new Error('temporary update failure')
  }
  remindersApi.cancel = async () => {
    throw new Error('temporary cancel failure')
  }

  try {
    const store = useServiceDataStore()
    store.reminders = [existingReminder]

    await assert.rejects(() => store.updateReminder('r-2', { title: '복약 시간 변경' }))
    assert.deepEqual(store.reminders, [existingReminder])
    assert.equal(store.loading.reminders, false)
    assert.match(store.errors.reminders.message, /알림을 변경하지 못했어요/)

    await assert.rejects(() => store.cancelReminder('r-2'))
    assert.deepEqual(store.reminders, [existingReminder])
    assert.equal(store.loading.reminders, false)
    assert.match(store.errors.reminders.message, /알림을 취소하지 못했어요/)
  } finally {
    Object.assign(remindersApi, originals)
  }
})

test('service data store loads nearby mobile branches with location coordinates', async () => {
  setup()
  const originalNearby = mobileBranchesApi.nearby
  const request = { latitude: 37.5001, longitude: 127.0369 }
  const response = {
    items: [
      {
        branchId: 'mobile-2',
        name: 'KB 이동점포 송파 데모 2호',
        distanceMeters: 2400,
      },
      {
        branchId: 'mobile-1',
        name: 'KB 이동점포 강남 데모 1호',
        distanceMeters: 820,
      },
      {
        branchId: 'mobile-unknown',
        name: '거리 미확인 이동점포',
        distanceMeters: null,
      },
    ],
  }
  let captured
  mobileBranchesApi.nearby = async (params) => {
    captured = params
    return response
  }

  try {
    const store = useServiceDataStore()
    await store.loadMobileBranches(request)

    assert.deepEqual(captured, request)
    assert.deepEqual(
      store.mobileBranches.map(({ branchId }) => branchId),
      ['mobile-1', 'mobile-2', 'mobile-unknown'],
    )
    assert.equal(store.loading.mobileBranches, false)
    assert.equal(store.errors.mobileBranches, null)
  } finally {
    mobileBranchesApi.nearby = originalNearby
  }
})

test('service data reset clears user data and ignores an in-flight response from the old session', async () => {
  setup()
  const originalList = accountsApi.list
  let resolveAccounts
  accountsApi.list = () =>
    new Promise((resolve) => {
      resolveAccounts = resolve
    })

  try {
    const store = useServiceDataStore()
    const pending = store.loadAccounts()
    store.accounts = [{ accountId: 'old-account' }]
    store.monthlySummary = { totalAmount: 100000 }
    store.reset()
    resolveAccounts([{ accountId: 'old-account' }])
    await pending

    assert.deepEqual(store.accounts, [])
    assert.equal(store.monthlySummary, null)
    assert.equal(store.loading.accounts, false)
  } finally {
    accountsApi.list = originalList
  }
})

test('transfer store requires explicit recipient selection and authenticated execution', async () => {
  setup()
  const originals = {
    candidates: transfersApi.candidates,
    prepare: transfersApi.prepare,
    validateAmount: transfersApi.validateAmount,
    confirm: transfersApi.confirm,
    authenticate: transfersApi.authenticate,
    execute: transfersApi.execute,
  }
  transfersApi.candidates = async () => ({ candidates: [{ recipientId: 'r-1', name: '김영희' }] })
  let executeOptions = null
  transfersApi.prepare = async (request) => ({ transferId: 't-1', status: 'DRAFT', ...request })
  transfersApi.validateAmount = async (request) => ({ ...request, confirmedAmount: 50000 })
  transfersApi.confirm = async () => ({ transferId: 't-1', status: 'CONFIRMED', executable: true })
  transfersApi.authenticate = async () => ({ authenticated: true })
  transfersApi.execute = async (transferId, request, options) => {
    executeOptions = { transferId, request, options }
    return { transactionId: 'x-1', transferId, status: 'SUCCESS', amount: 50000 }
  }

  try {
    const store = useTransferStore()
    await store.findRecipients({ keyword: '김영희' })
    assert.equal(store.recipient, null)
    assert.equal(store.recipientCandidates[0].recipientId, 'r-1')
    store.selectRecipient(store.recipientCandidates[0])
    store.clearRecipientSelection()
    assert.equal(store.recipient, null)
    assert.deepEqual(store.recipientCandidates, [])
    await store.findRecipients({ keyword: '김영희' })
    store.selectRecipient(store.recipientCandidates[0])
    store.selectAccount({ accountId: 'a-1' })
    await assert.rejects(() =>
      store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 0 }),
    )
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    const validation = await store.validateAmount({ recognizedAmount: 50000, amountCandidates: [] })
    await store.confirm({ approved: true })
    await store.authenticate({ pin: '123456' })
    const result = await store.execute()

    assert.equal(store.transferId, 't-1')
    assert.equal(validation.confirmedAmount, 50000)
    assert.equal(store.executable, true)
    assert.equal(store.authenticated, true)
    assert.equal(result.status, 'SUCCESS')
    assert.equal(store.result.transactionId, 'x-1')
    assert.ok(executeOptions.options.idempotencyKey)
    store.reset()
    assert.equal(store.transferId, '')
    assert.equal(store.recipient, null)
    assert.deepEqual(store.recipientCandidates, [])
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

    await assert.rejects(() => store.execute())

    await store.confirm({ approved: true })
    await assert.rejects(() => store.execute())

    assert.equal(executed, false)
  } finally {
    Object.assign(transfersApi, originals)
  }
})

test('transfer store rejects account objects without a usable identifier', () => {
  setup()
  const store = useTransferStore()

  assert.throws(
    () => store.selectAccount({ accountName: '식별자 없는 계좌' }),
    /출금 계좌를 다시 선택해 주세요\./,
  )
  assert.doesNotThrow(() => store.selectAccount({ accountId: 'a-1' }))
})

test('bill store uploads OCR data and confirms then executes a bill', async () => {
  setup()
  const originals = {
    ocr: billsApi.ocr,
    confirm: billsApi.confirm,
    execute: billsApi.execute,
  }
  billsApi.ocr = async () => ({
    billId: 'b-1',
    payee: '한국전력',
    amount: 48200,
    dueDate: '2026-09-10',
  })
  billsApi.confirm = async () => ({
    billId: 'b-1',
    status: 'CONFIRMED',
    confirmationToken: 'token-1',
    executable: true,
  })
  billsApi.execute = async () => ({
    paymentId: 'p-1',
    billId: 'b-1',
    status: 'SUCCESS',
    amount: 48200,
    paidAt: '2026-09-08T15:12:00+09:00',
  })

  try {
    const store = useBillStore()
    await store.upload({ image: new Blob(['bill'], { type: 'image/jpeg' }) })
    await store.confirm({
      approved: true,
      confirmedPayee: '한국전력',
      confirmedAmount: 48200,
      confirmedDueDate: '2026-09-10',
    })
    const result = await store.execute()

    assert.equal(store.billId, 'b-1')
    assert.equal(store.confirmationToken, 'token-1')
    assert.equal(result.status, 'SUCCESS')
    assert.equal(store.result.paymentId, 'p-1')
  } finally {
    Object.assign(billsApi, originals)
  }
})

test('bill store validates and forwards the complete confirmation contract', async () => {
  setup()
  const originals = {
    ocr: billsApi.ocr,
    confirm: billsApi.confirm,
  }
  let capturedRequest
  billsApi.ocr = async () => ({
    billId: 'b-1',
    payee: '한국전력',
    amount: 48200,
    dueDate: '2026-09-10',
  })
  billsApi.confirm = async (_billId, request) => {
    capturedRequest = request
    return {
      billId: 'b-1',
      status: 'CONFIRMED',
      confirmationToken: 'token-1',
      executable: true,
    }
  }

  try {
    const store = useBillStore()
    const image = new Blob(['bill'], { type: 'image/jpeg' })
    await store.upload({ image })

    await assert.rejects(
      () =>
        store.confirm({
          approved: true,
          confirmedPayee: '',
          confirmedAmount: 0,
          confirmedDueDate: 'not-a-date',
        }),
      /납부처·금액·납부기한을 다시 확인해 주세요\./,
    )
    assert.equal(capturedRequest, undefined)

    await store.confirm({
      approved: true,
      confirmedPayee: '한국전력',
      confirmedAmount: 48200,
      confirmedDueDate: '2026-09-10',
    })
    assert.deepEqual(capturedRequest, {
      approved: true,
      confirmedPayee: '한국전력',
      confirmedAmount: 48200,
      confirmedDueDate: '2026-09-10',
    })
    assert.equal(store.bill.status, 'CONFIRMED')
    assert.equal(store.bill.executable, true)
  } finally {
    Object.assign(billsApi, originals)
  }
})

test('transfer risk clearance is scoped to a prepared transfer and execution retries reuse one key', async () => {
  setup()
  const originals = {
    prepare: transfersApi.prepare,
    riskScore: transfersApi.riskScore,
    riskCheck: transfersApi.riskCheck,
    confirm: transfersApi.confirm,
    authenticate: transfersApi.authenticate,
    execute: transfersApi.execute,
  }
  const executeKeys = []
  let riskScoreCalls = 0
  let executeCalls = 0
  transfersApi.prepare = async () => ({ transferId: 't-1', status: 'READY' })
  transfersApi.riskScore = async () => {
    riskScoreCalls += 1
    return { additionalCheckRequired: true }
  }
  transfersApi.riskCheck = async () => ({ hold: false, additionalCheckRequired: false })
  transfersApi.confirm = async () => ({ executable: true })
  transfersApi.authenticate = async () => ({ authenticated: true })
  transfersApi.execute = async (_transferId, _request, options) => {
    executeCalls += 1
    executeKeys.push(options.idempotencyKey)
    if (executeCalls === 1) throw new Error('temporary failure')
    return { status: 'SUCCESS' }
  }

  try {
    const store = useTransferStore()
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    await store.assessRisk()
    await store.checkRisk({ purposeAnswer: '생활비' })
    assert.equal(store.riskCleared, true)
    await store.assessRisk()
    assert.equal(riskScoreCalls, 1)
    await store.confirm({ approved: true })
    await store.authenticate({ pin: '123456' })
    await assert.rejects(() => store.execute())

    transfersApi.prepare = async () => {
      throw new Error('temporary prepare failure')
    }
    await assert.rejects(() =>
      store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 }),
    )
    assert.equal(store.confirmationCompleted, true)
    assert.equal(store.authenticationCompleted, true)
    await store.execute()
    assert.equal(executeKeys.length, 2)
    assert.equal(executeKeys[0], executeKeys[1])

    transfersApi.prepare = async () => ({ transferId: 't-1', status: 'READY' })
    transfersApi.riskScore = async () => {
      riskScoreCalls += 1
      return {}
    }
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    await store.assessRisk()
    assert.equal(store.riskCleared, true)
    await store.assessRisk()
    assert.equal(riskScoreCalls, 2)
    await store.confirm({ approved: true })
    await store.authenticate({ pin: '123456' })
    await store.execute()
    assert.notEqual(executeKeys[1], executeKeys[2])

    transfersApi.riskScore = async () => ({ recommendedAction: 'HOLD' })
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    const risk = await store.assessRisk()
    assert.equal(store.isRiskHeld(risk), true)
    assert.equal(store.riskCleared, false)
  } finally {
    Object.assign(transfersApi, originals)
  }
})

test('bill execution retries reuse one key and a new bill receives a new key', async () => {
  setup()
  const originals = {
    ocr: billsApi.ocr,
    get: billsApi.get,
    execute: billsApi.execute,
  }
  const executeKeys = []
  let billNumber = 0
  let executeCalls = 0
  billsApi.ocr = async () => {
    billNumber += 1
    return { billId: `b-${billNumber}` }
  }
  billsApi.get = async () => ({ billId: 'b-loaded' })
  billsApi.execute = async (_billId, _request, options) => {
    executeCalls += 1
    executeKeys.push(options.idempotencyKey)
    if (executeCalls === 1) throw new Error('temporary failure')
    return { status: 'COMPLETED' }
  }

  try {
    const store = useBillStore()
    const image = new Blob(['bill'], { type: 'image/jpeg' })
    await store.upload({ image })
    await assert.rejects(() => store.execute())

    billsApi.ocr = async () => {
      throw new Error('temporary upload failure')
    }
    await assert.rejects(() => store.upload({ image }))
    await store.execute()
    assert.equal(executeKeys[0], executeKeys[1])

    billsApi.ocr = async () => {
      billNumber += 1
      return { billId: `b-${billNumber}` }
    }
    await store.upload({ image })
    await store.execute()
    assert.notEqual(executeKeys[1], executeKeys[2])

    billsApi.get = async () => {
      throw new Error('temporary load failure')
    }
    await assert.rejects(() => store.load('b-loaded'))
    await store.execute()
    assert.equal(executeKeys[2], executeKeys[3])

    billsApi.get = async () => ({ billId: 'b-loaded' })
    await store.load('b-loaded')
    await store.execute()
    assert.notEqual(executeKeys[3], executeKeys[4])

    store.reset()
    await store.upload({ image })
    await store.execute()
    assert.notEqual(executeKeys[4], executeKeys[5])
  } finally {
    Object.assign(billsApi, originals)
  }
})

test('transfer execution retry skips already completed confirmation and PIN authentication', async () => {
  setup()
  const originals = {
    prepare: transfersApi.prepare,
    riskScore: transfersApi.riskScore,
    confirm: transfersApi.confirm,
    authenticate: transfersApi.authenticate,
    execute: transfersApi.execute,
  }
  const executeKeys = []
  let riskScoreCalls = 0
  let confirmCalls = 0
  let authenticateCalls = 0
  let executeCalls = 0
  transfersApi.prepare = async () => ({ transferId: 't-1', status: 'READY' })
  transfersApi.riskScore = async () => {
    riskScoreCalls += 1
    return {}
  }
  transfersApi.confirm = async () => {
    confirmCalls += 1
    return { confirmed: true, executable: true }
  }
  transfersApi.authenticate = async () => {
    authenticateCalls += 1
    return { authenticated: true }
  }
  transfersApi.execute = async (_transferId, _request, options) => {
    executeCalls += 1
    executeKeys.push(options.idempotencyKey)
    if (executeCalls === 1) throw new Error('temporary execution failure')
    return { status: 'COMPLETED' }
  }

  try {
    const store = useTransferStore()
    await store.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 50000 })
    const runUiSequence = async () => {
      if (!store.riskCleared) await store.assessRisk()
      if (!store.confirmationCompleted) await store.confirm({ approved: true })
      if (!store.authenticationCompleted) await store.authenticate({ pin: '123456' })
      return store.execute()
    }

    await assert.rejects(() => runUiSequence())
    await runUiSequence()

    assert.equal(riskScoreCalls, 1)
    assert.equal(confirmCalls, 1)
    assert.equal(authenticateCalls, 1)
    assert.equal(executeKeys[0], executeKeys[1])
  } finally {
    Object.assign(transfersApi, originals)
  }
})
