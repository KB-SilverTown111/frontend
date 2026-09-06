const numberedScreens = (prefix, start, end) =>
  Array.from({ length: end - start + 1 }, (_, offset) => {
    const number = String(start + offset).padStart(2, '0')
    return `${prefix}-${number}`
  })

const screenIds = {
  transfer: numberedScreens('2', 2, 31),
  bills: ['3-02', '3-02A', ...numberedScreens('3', 3, 22)],
  living: numberedScreens('4', 2, 26),
  voice: numberedScreens('5', 1, 8),
}

const serviceLabels = {
  transfer: '송금',
  bills: '고지서',
  living: '생활금융',
  voice: '공통 음성',
}

const referenceScreenLoaders = {
  transfer: () => import('../prototype/data/transfer.js'),
  bills: () => import('../prototype/data/bills.js'),
  living: () => import('../prototype/data/living.js'),
  voice: () => import('../prototype/data/voice.js'),
}

export const productionServiceScreens = Object.fromEntries(
  Object.entries(screenIds).map(([service, ids]) => [
    service,
    ids.map((screenId) => ({
      service,
      screenId,
      serviceLabel: serviceLabels[service],
    })),
  ]),
)

const screenRoute = (service, screenId) => ({
  name: `${service}-screen`,
  params: { screenId },
})

const homeRoute = (service) => ({
  name: service === 'voice' ? 'voice-home' : `${service}-home`,
})

const actionRoutes = {
  transfer: {
    '2-02': { secondary: '2-05' },
    '2-03': { secondary: homeRoute('transfer') },
    '2-04': { primary: '2-02' },
    '2-05': { primary: '2-07' },
    '2-06': { primary: '2-05', secondary: homeRoute('transfer') },
    '2-08': { primary: '2-22' },
    '2-09': { primary: '2-10' },
    '2-10': { secondary: homeRoute('transfer') },
    '2-11': { primary: '2-13' },
    '2-12': { primary: '2-11', secondary: homeRoute('transfer') },
    '2-13': { primary: '2-11', secondary: homeRoute('transfer') },
    '2-14': { primary: homeRoute('transfer') },
    '2-15': { primary: '2-02', secondary: '2-18' },
    '2-16': { primary: '2-02', secondary: '2-18' },
    '2-17': { primary: '2-18', secondary: homeRoute('transfer') },
    '2-18': { primary: '2-07', secondary: '2-05' },
    '2-19': { primary: '2-18', secondary: homeRoute('transfer') },
    '2-20': { primary: homeRoute('transfer'), secondary: '2-02' },
    '2-21': { primary: '2-02', secondary: homeRoute('transfer') },
    '2-22': { secondary: null },
    '2-23': { primary: '2-22', secondary: homeRoute('transfer') },
    '2-24': { primary: '2-24', secondary: '2-26' },
    '2-25': { primary: '2-02', secondary: '2-02' },
    '2-26': { primary: homeRoute('transfer'), secondary: '2-02' },
    '2-27': { primary: '2-28', secondary: '2-27' },
    '2-28': { primary: '2-27', secondary: '2-27' },
    '2-29': { primary: '2-24', secondary: '2-27' },
    '2-30': { primary: '2-27', secondary: '2-22' },
    '2-31': { primary: '2-27', secondary: '2-27' },
  },
  bills: {
    '3-02': { primary: '3-02A' },
    '3-02A': { primary: '3-03', secondary: '3-03' },
    '3-03': { secondary: homeRoute('bills') },
    '3-04': { primary: '3-06' },
    '3-06': { primary: '3-21' },
    '3-07': { primary: homeRoute('bills') },
    '3-08': { primary: '3-02A', secondary: '3-02' },
    '3-09': { primary: '3-02' },
    '3-10': { primary: '3-02A', secondary: '3-02' },
    '3-11': { primary: '3-04' },
    '3-12': { primary: homeRoute('bills') },
    '3-13': { primary: '3-07' },
    '3-14': { primary: '3-06', secondary: '3-05' },
    '3-15': { primary: '3-05', secondary: '3-06' },
    '3-16': { primary: '3-16', secondary: '3-04' },
    '3-17': { primary: '3-02A', secondary: '3-14' },
    '3-18': { primary: '3-02', secondary: '3-02A' },
    '3-19': { primary: '3-02A', secondary: '3-02' },
    '3-20': { primary: '3-20', secondary: homeRoute('bills') },
    '3-21': { secondary: null },
    '3-22': { primary: '3-21', secondary: homeRoute('bills') },
  },
  living: {
    '4-02': { primary: homeRoute('living') },
    '4-03': { primary: '4-02' },
    '4-04': { primary: '4-02' },
    '4-05': {
      primary: { name: 'onboarding', params: { stepId: 'login' } },
      secondary: homeRoute('living'),
    },
    '4-06': { primary: '4-07' },
    '4-07': { primary: '4-06' },
    '4-08': { primary: '4-06', secondary: '4-06' },
    '4-09': { primary: '4-23' },
    '4-10': { primary: '4-11' },
    '4-11': { primary: '4-10' },
    '4-12': { primary: '4-10', secondary: '4-10' },
    '4-13': {
      primary: { name: 'voice-screen', params: { screenId: '5-02' } },
      secondary: homeRoute('living'),
    },
    '4-14': { primary: homeRoute('living'), secondary: homeRoute('living') },
    '4-15': { primary: homeRoute('living'), secondary: homeRoute('living') },
    '4-16': { primary: homeRoute('living'), secondary: homeRoute('living') },
    '4-17': { primary: '4-07', secondary: homeRoute('living') },
    '4-18': { primary: '4-06', secondary: homeRoute('living') },
    '4-19': { primary: homeRoute('living'), secondary: homeRoute('living') },
    '4-20': { primary: '4-10', secondary: homeRoute('living') },
    '4-21': { primary: '4-10', secondary: homeRoute('living') },
    '4-22': {
      primary: { name: 'voice-screen', params: { screenId: '5-02' } },
      secondary: homeRoute('living'),
    },
    '4-23': { primary: { name: 'voice-screen', params: { screenId: '5-07' } }, secondary: '4-06' },
    '4-24': { primary: '4-24', secondary: '4-06' },
    '4-25': { primary: homeRoute('living'), secondary: homeRoute('living') },
    '4-26': { primary: { name: 'voice-screen', params: { screenId: '5-07' } }, secondary: '4-06' },
  },
  voice: {
    '5-01': { primary: '5-02', secondary: '5-01' },
    '5-02': { primary: homeRoute('living'), secondary: '5-01' },
    '5-03': { primary: '5-03', secondary: '5-04' },
    '5-04': { primary: homeRoute('living'), secondary: '5-01' },
    '5-05': {
      primary: { name: 'transfer-screen', params: { screenId: '2-02' } },
      secondary: '5-01',
    },
    '5-06': { primary: '5-01', secondary: homeRoute('transfer') },
    '5-07': { primary: '5-07', secondary: homeRoute('bills') },
    '5-08': {
      primary: { name: 'transfer-screen', params: { screenId: '2-02' } },
      secondary: homeRoute('transfer'),
    },
  },
}

export function resolveProductionScreen(service, screenId) {
  return productionServiceScreens[service]?.find(({ screenId: id }) => id === screenId) ?? null
}

export async function loadProductionScreen(service, screenId) {
  const productionScreen = resolveProductionScreen(service, screenId)
  if (!productionScreen) return null

  const module = await referenceScreenLoaders[service]?.()
  const referenceScreen = module?.default?.find(({ id }) => id === screenId)

  if (!referenceScreen) return productionScreen

  return {
    ...productionScreen,
    title: referenceScreen.title,
    description: referenceScreen.description,
    contentHtml: referenceScreen.contentHtml,
    primaryLabel: referenceScreen.primaryLabel,
    secondaryLabel: referenceScreen.secondaryLabel,
    variant: referenceScreen.variant,
    showTabs: referenceScreen.showTabs,
  }
}

export function getProductionScreenNavigation(service, screenId) {
  const screens = productionServiceScreens[service] ?? []
  const index = screens.findIndex(({ screenId: id }) => id === screenId)

  if (index === -1) return { previous: null, next: null }

  return {
    previous: screens[index - 1] ?? null,
    next: screens[index + 1] ?? null,
  }
}

function resolveActionRoute(service, target) {
  if (!target) return null
  if (typeof target === 'object') return target
  return screenRoute(service, target)
}

export function getProductionActionRoutes(service, screenId) {
  const navigation = getProductionScreenNavigation(service, screenId)
  const configured = actionRoutes[service]?.[screenId] ?? {}
  const primaryTarget = Object.prototype.hasOwnProperty.call(configured, 'primary')
    ? configured.primary
    : navigation.next?.screenId
  const secondaryTarget = Object.prototype.hasOwnProperty.call(configured, 'secondary')
    ? configured.secondary
    : navigation.previous?.screenId

  return {
    primary: resolveActionRoute(service, primaryTarget),
    secondary: resolveActionRoute(service, secondaryTarget),
  }
}

export function getProductionHomeRoute(service) {
  return homeRoute(service)
}
