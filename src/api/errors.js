export function normalizeApiError(error) {
  const status = error?.response?.status ?? null
  const body = error?.response?.data

  if (body && typeof body === 'object') {
    return {
      status,
      code: typeof body.code === 'string' ? body.code : 'REQUEST_FAILED',
      message:
        typeof body.message === 'string'
          ? body.message
          : '요청을 처리하지 못했어요. 다시 시도해 주세요.',
      requestId: typeof body.requestId === 'string' ? body.requestId : null,
      fieldErrors: Array.isArray(body.fieldErrors) ? body.fieldErrors : [],
    }
  }

  return {
    status,
    code: 'NETWORK_ERROR',
    message: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    requestId: null,
    fieldErrors: [],
  }
}
