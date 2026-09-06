export const prototypeFlows = [
  {
    key: 'onboarding',
    label: '온보딩',
    count: 21,
    firstScreenId: '1-01',
    load: () => import('./data/onboarding.js'),
  },
  {
    key: 'transfer',
    label: '송금',
    count: 31,
    firstScreenId: '2-01',
    load: () => import('./data/transfer.js'),
  },
  {
    key: 'bills',
    label: '고지서',
    count: 23,
    firstScreenId: '3-01',
    load: () => import('./data/bills.js'),
  },
  {
    key: 'living',
    label: '생활금융',
    count: 26,
    firstScreenId: '4-01',
    load: () => import('./data/living.js'),
  },
  {
    key: 'voice',
    label: '공통 음성',
    count: 8,
    firstScreenId: '5-01',
    load: () => import('./data/voice.js'),
  },
]

export async function loadFlow(flowKey) {
  const flow = prototypeFlows.find(({ key }) => key === flowKey)

  if (!flow) return null

  const module = await flow.load()
  return module.default
}

export function getPrototypeStartRoute(flowKey) {
  const flow = prototypeFlows.find(({ key }) => key === flowKey)

  if (!flow) return { name: 'prototype-index' }

  return {
    name: 'prototype-screen',
    params: { flow: flow.key, screenId: flow.firstScreenId },
  }
}
