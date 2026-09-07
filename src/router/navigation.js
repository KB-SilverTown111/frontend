function getHistoryState(router) {
  return router.options?.history?.state ?? globalThis.history?.state ?? null
}

export function goBackOrReplace(router, fallback) {
  if (getHistoryState(router)?.back) return router.back()
  return router.replace(fallback)
}
