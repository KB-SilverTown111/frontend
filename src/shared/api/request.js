export function createIdempotencyKey() {
  const randomUUID = globalThis.crypto?.randomUUID
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto)

  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function withIdempotencyKey(config = {}, key = createIdempotencyKey()) {
  const requestConfig = { ...config }
  delete requestConfig.idempotencyKey

  return {
    ...requestConfig,
    headers: {
      ...(requestConfig.headers ?? {}),
      'Idempotency-Key': key,
    },
  }
}
