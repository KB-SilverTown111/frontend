export function getRestoredSessionRoute(session, currentRoute) {
  if (session && currentRoute?.name === 'onboarding') {
    return { name: 'transfer-home' }
  }

  return null
}
