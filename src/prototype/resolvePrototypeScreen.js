import { loadFlow } from './prototypeFlows.js'

export async function resolvePrototypeScreen(flowKey, screenId) {
  const screens = await loadFlow(flowKey)

  if (!screens) return null

  const index = screens.findIndex(({ id }) => id === screenId)
  if (index === -1) return null

  return { index, screen: screens[index], screens }
}

export function buildPrototypeNavigation(flowKey, screens, index) {
  const screenRoute = (screen) => ({
    name: 'prototype-screen',
    params: { flow: flowKey, screenId: screen.id },
  })

  return {
    previous: index > 0 ? screenRoute(screens[index - 1]) : { name: 'prototype-index' },
    next:
      index < screens.length - 1 ? screenRoute(screens[index + 1]) : { name: 'prototype-index' },
  }
}
