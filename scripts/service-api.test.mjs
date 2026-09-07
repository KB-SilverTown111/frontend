import assert from 'node:assert/strict'
import test from 'node:test'

import { apiClient } from '../src/api/client.js'
import { accountsApi } from '../src/api/accounts.js'
import { billsApi } from '../src/api/bills.js'
import { mobileBranchesApi } from '../src/api/mobileBranches.js'
import { remindersApi } from '../src/api/reminders.js'
import { transfersApi } from '../src/api/transfers.js'

function useAdapter(handler) {
  const originalAdapter = apiClient.defaults.adapter
  apiClient.defaults.adapter = async (config) => {
    handler(config)
    return {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  return () => {
    apiClient.defaults.adapter = originalAdapter
  }
}

test('accounts API keeps the documented list path and query', async () => {
  let captured
  const restore = useAdapter((config) => {
    captured = config
  })

  try {
    await accountsApi.list({ active: true })
    assert.equal(captured.method, 'get')
    assert.equal(captured.url, '/accounts')
    assert.deepEqual(captured.params, { active: true })
  } finally {
    restore()
  }
})

test('transfer API uses supported preparation, verification, and idempotent execution paths', async () => {
  const requests = []
  const restore = useAdapter((config) => {
    requests.push(config)
  })

  try {
    await transfersApi.candidates({ keyword: '김영희' })
    await transfersApi.prepare({ fromAccountId: 'a-1', recipientId: 'r-1', amount: 30000 })
    await transfersApi.validateAmount({ recognizedAmount: null, amountCandidates: [30000, 40000] })
    await transfersApi.riskScore({ transferId: 'transfer-1' })
    await transfersApi.riskCheck({ transferId: 'transfer-1' })
    await transfersApi.confirm('transfer-1', { approved: true })
    await transfersApi.authenticate('transfer-1', { pin: '123456' })
    await transfersApi.execute('transfer-1', { idempotencyKey: 'transfer-key' })

    assert.deepEqual(
      requests.map(({ method, url }) => `${method}:${url}`),
      [
        'post:/recipients/candidates',
        'post:/transfers/prepare',
        'post:/transfers/validate-amount',
        'post:/transfers/risk-score',
        'post:/transfers/risk-check',
        'post:/transfers/transfer-1/confirm',
        'post:/transfers/transfer-1/authenticate',
        'post:/transfers/transfer-1/execute',
      ],
    )
    assert.deepEqual(JSON.parse(requests[2].data), {
      recognizedAmount: null,
      amountCandidates: [30000, 40000],
    })
    assert.equal(requests[7].headers['Idempotency-Key'], 'transfer-key')
  } finally {
    restore()
  }
})

test('bill OCR uses multipart image and voice session fields', async () => {
  let captured
  const restore = useAdapter((config) => {
    captured = config
  })

  try {
    const image = new Blob(['bill-image'], { type: 'image/jpeg' })
    await billsApi.ocr({ image, voiceSessionId: 'session-1' })

    assert.equal(captured.method, 'post')
    assert.equal(captured.url, '/bills/ocr')
    assert.ok(captured.data instanceof FormData)
    assert.equal(captured.data.get('voiceSessionId'), 'session-1')
    assert.equal(captured.data.get('image').type, 'image/jpeg')
  } finally {
    restore()
  }
})

test('reminder API exposes only list and create paths', async () => {
  const requests = []
  const restore = useAdapter((config) => {
    requests.push(config)
  })

  try {
    await remindersApi.list({ status: 'SCHEDULED' })
    await remindersApi.create({ title: '전기요금', scheduledAt: '2026-09-10T09:00:00+09:00' })
    assert.deepEqual(
      requests.map(({ method, url }) => `${method}:${url}`),
      ['get:/reminders', 'post:/reminders'],
    )
    assert.deepEqual(requests[0].params, { status: 'SCHEDULED' })
    assert.equal(requests[1].headers['Idempotency-Key'].length > 0, true)
  } finally {
    restore()
  }
})

test('mobile branch nearby API sends the current location to the nearby path', async () => {
  let captured
  const restore = useAdapter((config) => {
    captured = config
  })

  try {
    await mobileBranchesApi.nearby({ latitude: 37.5001, longitude: 127.0369 })

    assert.equal(captured.method, 'get')
    assert.equal(captured.url, '/mobile-branches/nearby')
    assert.deepEqual(captured.params, { latitude: 37.5001, longitude: 127.0369 })
  } finally {
    restore()
  }
})
