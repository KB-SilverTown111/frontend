import { loadFlow } from './prototypeFlows.js'

export async function resolvePrototypeScreen(flowKey, screenId) {
  const screens = await loadFlow(flowKey)

  if (!screens) return null

  const index = screens.findIndex(({ id }) => id === screenId)
  if (index === -1) return null

  return { index, screen: screens[index], screens }
}
