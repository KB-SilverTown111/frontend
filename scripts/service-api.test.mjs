import assert from 'node:assert/strict'
import test from 'node:test'

import { apiClient } from '../src/api/client.js'
import { accountsApi } from '../src/api/accounts.js'
import { billsApi } from '../src/api/bills.js'
import { mobileBranchesApi } from '../src/api/mobileBranches.js'
import { profileApi } from '../src/api/profile.js'
import { remindersApi } from '../src/api/reminders.js'
import { transfersApi } from '../src/api/transfers.js'
import { voiceApi } from '../src/api/voice.js'

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

test('transfer API sends amount validation and an idempotent execute request', async () => {
  const requests = []
  const restore = useAdapter((config) => {
    requests.push(config)
  })

  try {
    await transfersApi.validateAmount({ recognizedAmount: null, amountCandidates: [30000, 40000] })
    await transfersApi.execute('transfer-1', { idempotencyKey: 'transfer-key' })

    assert.equal(requests[0].url, '/transfers/validate-amount')
    assert.deepEqual(JSON.parse(requests[0].data), {
      recognizedAmount: null,
      amountCandidates: [30000, 40000],
    })
    assert.equal(requests[1].url, '/transfers/transfer-1/execute')
    assert.equal(requests[1].headers['Idempotency-Key'], 'transfer-key')
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

test('reminder and mobile branch APIs preserve paths, query, and idempotency', async () => {
  const requests = []
  const restore = useAdapter((config) => {
    requests.push(config)
  })

  try {
    await remindersApi.list({ status: 'PENDING' })
    await remindersApi.create({ title: '전기요금', scheduledAt: '2026-09-10T09:00:00+09:00' })
    await remindersApi.update('reminder-1', { title: '전기요금 알림' })
    await remindersApi.cancel('reminder-1')
    await remindersApi.snooze('reminder-1', { minutes: 30 })
    await mobileBranchesApi.list({ latitude: 37.5, longitude: 127.0, taskType: 'ACCOUNT' })
    await mobileBranchesApi.get('branch-1')

    assert.deepEqual(
      requests.map(({ method, url }) => `${method}:${url}`),
      [
        'get:/reminders',
        'post:/reminders',
        'put:/reminders/reminder-1',
        'delete:/reminders/reminder-1',
        'post:/reminders/reminder-1/snooze',
        'get:/mobile-branches',
        'get:/mobile-branches/branch-1',
      ],
    )
    assert.equal(requests[1].headers['Idempotency-Key'].length > 0, true)
    assert.deepEqual(requests[5].params, {
      latitude: 37.5,
      longitude: 127.0,
      taskType: 'ACCOUNT',
    })
  } finally {
    restore()
  }
})

test('voice and profile APIs use the documented request contracts', async () => {
  const requests = []
  const restore = useAdapter((config) => {
    requests.push(config)
  })

  try {
    await voiceApi.createSession({ entryPoint: 'TRANSFER' })
    await voiceApi.getSession('session-1')
    await voiceApi.sendTurn('session-1', {
      turnId: 'turn-1',
      transcript: '김영희에게 오만원 보내줘',
      sttConfidence: 0.98,
      inputType: 'VOICE',
    })
    await voiceApi.event('session-1', { eventType: 'REPLAY', turnId: 'turn-1' })
    await voiceApi.closeSession('session-1')
    await voiceApi.issueSpeechToken()
    await voiceApi.getSettings()
    await voiceApi.updateSettings({ ttsVoice: 'ko-KR-JiMinNeural' })
    await profileApi.get()
    await profileApi.update({ name: '김순자' })
    await profileApi.getConsents()
    await profileApi.updateConsents({ consents: [] })

    assert.deepEqual(
      requests.map(({ method, url }) => `${method}:${url}`),
      [
        'post:/voice/sessions',
        'get:/voice/sessions/session-1',
        'post:/voice/sessions/session-1/turns',
        'post:/voice/sessions/session-1/events',
        'post:/voice/sessions/session-1/close',
        'post:/voice/speech-token',
        'get:/users/me/voice-settings',
        'put:/users/me/voice-settings',
        'get:/users/me',
        'put:/users/me',
        'get:/users/me/consents',
        'put:/users/me/consents',
      ],
    )
    assert.equal(JSON.parse(requests[2].data).turnId, 'turn-1')
    assert.equal(requests[7].headers['Idempotency-Key'], undefined)
  } finally {
    restore()
  }
})
