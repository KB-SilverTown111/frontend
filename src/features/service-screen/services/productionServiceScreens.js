import * as billsRegistry from '../../bills/screens/registry.js'
import * as livingRegistry from '../../living/screens/registry.js'
import * as transferRegistry from '../../transfer/screens/registry.js'
import * as voiceRegistry from '../../voice/screens/registry.js'

const serviceLabels = {
  transfer: '송금',
  bills: '고지서',
  living: '생활금융',
  voice: '공통 음성',
}

const registries = {
  transfer: transferRegistry,
  bills: billsRegistry,
  living: livingRegistry,
  voice: voiceRegistry,
}

const referenceScreenLoaders = {
  transfer: () => import('../../transfer/screens/reference.js'),
  bills: () => import('../../bills/screens/reference.js'),
  living: () => import('../../living/screens/reference.js'),
  voice: () => import('../../voice/screens/reference.js'),
}

export const productionServiceScreens = Object.fromEntries(
  Object.entries(registries).map(([service, registry]) => [
    service,
    registry.screens.map((screen) => ({
      ...screen,
      service,
      serviceLabel: serviceLabels[service],
    })),
  ]),
)

function resolveScreenDefinition(service, screenIdentifier) {
  const registry = registries[service]
  return (
    registry?.getScreen(screenIdentifier) ?? registry?.getScreenByDesignId(screenIdentifier) ?? null
  )
}

function toProductionScreen(service, screenIdentifier) {
  const screen = resolveScreenDefinition(service, screenIdentifier)
  if (!screen) return null

  return (
    productionServiceScreens[service]?.find(({ screenKey }) => screenKey === screen.key) ?? {
      ...screen,
      service,
      serviceLabel: serviceLabels[service],
    }
  )
}

const screenRoute = (service, screenIdentifier) => {
  const screen = toProductionScreen(service, screenIdentifier)
  if (!screen) return null

  return {
    name: screen.routeName ?? `${service}-screen`,
    params: { screenKey: screen.screenKey },
  }
}

const homeRoute = (service) => ({
  name: service === 'voice' ? 'voice-home' : `${service}-home`,
})

// 기능별 화면 키와 연결된 예외 이동은 서비스 화면 어댑터에서 관리한다.
const actionRoutesByScreenKey = {
  transfer: {
    'transfer-listening': { secondary: 'transfer-recipient-select' },
    'transfer-processing': { secondary: homeRoute('transfer') },
    'transfer-speaking': { primary: 'transfer-listening' },
    'transfer-recipient-select': { primary: 'transfer-amount-confirm' },
    'transfer-contacts-permission': {
      primary: 'transfer-recipient-select',
      secondary: homeRoute('transfer'),
    },
    'transfer-confirm': { primary: 'transfer-executing' },
    'transfer-risk-confirm': { primary: 'transfer-pending' },
    'transfer-pending': { secondary: homeRoute('transfer') },
    'transfer-guardian-confirm': { primary: 'transfer-authentication-expired' },
    'transfer-guardian-message-failed': {
      primary: 'transfer-guardian-confirm',
      secondary: homeRoute('transfer'),
    },
    'transfer-authentication-expired': {
      primary: 'transfer-guardian-confirm',
      secondary: homeRoute('transfer'),
    },
    'transfer-complete': { primary: homeRoute('transfer') },
    'transfer-voice-recognition-failed': {
      primary: 'transfer-listening',
      secondary: 'transfer-account-select',
    },
    'transfer-recipient-not-found': {
      primary: 'transfer-listening',
      secondary: 'transfer-account-select',
    },
    'transfer-recipient-confirm': {
      primary: 'transfer-account-select',
      secondary: homeRoute('transfer'),
    },
    'transfer-account-select': {
      primary: 'transfer-amount-confirm',
      secondary: 'transfer-recipient-select',
    },
    'transfer-existing-plan': {
      primary: 'transfer-account-select',
      secondary: homeRoute('transfer'),
    },
    'transfer-not-sent': { primary: homeRoute('transfer'), secondary: 'transfer-listening' },
    'transfer-expired': { primary: 'transfer-listening', secondary: homeRoute('transfer') },
    'transfer-executing': { secondary: null },
    'transfer-failed': { primary: 'transfer-executing', secondary: homeRoute('transfer') },
    'transfer-replay': { primary: 'transfer-replay', secondary: 'transfer-conversation-ended' },
    'transfer-misheard': { primary: 'transfer-listening', secondary: 'transfer-listening' },
    'transfer-conversation-ended': {
      primary: homeRoute('transfer'),
      secondary: 'transfer-listening',
    },
    'transfer-scheduled-list': {
      primary: 'transfer-scheduled-create',
      secondary: 'transfer-scheduled-list',
    },
    'transfer-scheduled-create': {
      primary: 'transfer-scheduled-list',
      secondary: 'transfer-scheduled-list',
    },
    'transfer-scheduled-due': { primary: 'transfer-replay', secondary: 'transfer-scheduled-list' },
    'transfer-scheduled-complete': {
      primary: 'transfer-scheduled-list',
      secondary: 'transfer-executing',
    },
    'transfer-scheduled-edit': {
      primary: 'transfer-scheduled-list',
      secondary: 'transfer-scheduled-list',
    },
  },
  bills: {
    'bill-source-select': { primary: 'bill-camera' },
    'bill-camera': { primary: 'bill-ocr-processing', secondary: 'bill-ocr-processing' },
    'bill-ocr-processing': { secondary: homeRoute('bills') },
    'bill-review': { primary: 'bill-confirm' },
    'bill-confirm': { primary: 'bill-paying' },
    'bill-complete': { primary: homeRoute('bills') },
    'bill-recognition-failed': { primary: 'bill-camera', secondary: 'bill-source-select' },
    'bill-unsupported-file': { primary: 'bill-source-select' },
    'bill-camera-permission': { primary: 'bill-camera', secondary: 'bill-source-select' },
    'bill-expired': { primary: 'bill-review' },
    'bill-cancelled': { primary: homeRoute('bills') },
    'bill-duplicate-request': { primary: 'bill-complete' },
    'bill-payment-number': { primary: 'bill-confirm', secondary: 'bill-low-confidence' },
    'bill-read-accuracy': { primary: 'bill-low-confidence', secondary: 'bill-confirm' },
    'bill-read-aloud': { primary: 'bill-read-aloud', secondary: 'bill-review' },
    'bill-retake': { primary: 'bill-camera', secondary: 'bill-payment-number' },
    'bill-unsupported-format': { primary: 'bill-source-select', secondary: 'bill-camera' },
    'bill-file-too-large': { primary: 'bill-camera', secondary: 'bill-source-select' },
    'bill-overdue': { primary: 'bill-overdue', secondary: homeRoute('bills') },
    'bill-paying': { secondary: null },
    'bill-payment-failed': { primary: 'bill-paying', secondary: homeRoute('bills') },
  },
  living: {
    'living-accounts': { primary: homeRoute('living') },
    'living-accounts-empty': { primary: 'living-accounts' },
    'living-accounts-error': { primary: 'living-accounts' },
    'living-session-expired': {
      primary: { name: 'onboarding', params: { stepId: 'login' } },
      secondary: homeRoute('living'),
    },
    'living-reminders': { primary: 'living-reminder-create' },
    'living-reminder-create': { primary: 'living-reminders' },
    'living-reminder-edit': { primary: 'living-reminders', secondary: 'living-reminders' },
    'living-reminder-arrived': { primary: 'living-reminder-notice' },
    'living-branches': { primary: 'living-branch-detail' },
    'living-branch-detail': { primary: 'living-branches' },
    'living-location-permission': { primary: 'living-branches', secondary: 'living-branches' },
    'living-voice-settings': {
      primary: { name: 'my-page' },
      secondary: homeRoute('living'),
    },
    'living-profile-edit': { primary: homeRoute('living'), secondary: homeRoute('living') },
    'living-emergency-contact-edit': {
      primary: homeRoute('living'),
      secondary: homeRoute('living'),
    },
    'living-consents': { primary: homeRoute('living'), secondary: homeRoute('living') },
    'living-reminders-empty': { primary: 'living-reminder-create', secondary: homeRoute('living') },
    'living-reminders-error': { primary: 'living-reminders', secondary: homeRoute('living') },
    'living-reminders-disabled': { primary: homeRoute('living'), secondary: homeRoute('living') },
    'living-branches-empty': { primary: 'living-branches', secondary: homeRoute('living') },
    'living-branches-error': { primary: 'living-branches', secondary: homeRoute('living') },
    'living-reminder-speak': {
      primary: { name: 'my-page' },
      secondary: homeRoute('living'),
    },
    'living-reminder-notice': {
      primary: { name: 'voice-screen', params: { screenKey: 'voice-bill-reading' } },
      secondary: 'living-reminders',
    },
    'living-reminder-reading': {
      primary: 'living-reminder-reading',
      secondary: 'living-reminders',
    },
    'living-reminder-quiet-hours': { primary: homeRoute('living'), secondary: homeRoute('living') },
    'living-reminder-missed': {
      primary: { name: 'voice-screen', params: { screenKey: 'voice-bill-reading' } },
      secondary: 'living-reminders',
    },
  },
  voice: {
    'voice-voice-select': { primary: 'voice-voice-preview', secondary: 'voice-voice-select' },
    'voice-voice-preview': { primary: { name: 'my-page' }, secondary: 'voice-voice-select' },
    'voice-replay': { primary: 'voice-replay', secondary: 'voice-ended' },
    'voice-ended': { primary: homeRoute('living'), secondary: { name: 'my-page' } },
    'voice-resume': {
      primary: { name: 'transfer-screen', params: { screenKey: 'transfer-listening' } },
      secondary: { name: 'my-page' },
    },
    'voice-expired': { primary: { name: 'my-page' }, secondary: homeRoute('transfer') },
    'voice-bill-reading': { primary: 'voice-bill-reading', secondary: homeRoute('bills') },
    'voice-enabled': {
      primary: { name: 'transfer-screen', params: { screenKey: 'transfer-listening' } },
      secondary: homeRoute('transfer'),
    },
  },
}

export function resolveProductionScreen(service, screenIdentifier) {
  return toProductionScreen(service, screenIdentifier)
}

export function isVoiceSettingsScreen(screenIdentifier) {
  const screen = resolveScreenDefinition('voice', screenIdentifier)
  return screen?.routeName === 'my-page-voice'
}

export async function loadProductionScreen(service, screenIdentifier) {
  const productionScreen = resolveProductionScreen(service, screenIdentifier)
  if (!productionScreen) return null

  const module = await referenceScreenLoaders[service]?.()
  const referenceScreen = module?.default?.find(({ key }) => key === productionScreen.screenKey)

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

export function getProductionScreenNavigation(service, screenIdentifier) {
  const screens = productionServiceScreens[service] ?? []
  const screen = resolveProductionScreen(service, screenIdentifier)
  const index = screens.findIndex(({ screenKey }) => screenKey === screen?.screenKey)

  if (index === -1) return { previous: null, next: null }

  return {
    previous: screens[index - 1] ?? null,
    next: screens[index + 1] ?? null,
  }
}

function resolveActionRoute(service, target) {
  if (!target) return null
  if (typeof target === 'object') {
    const targetService =
      target.name === 'my-page-voice'
        ? 'voice'
        : target.name?.endsWith('-screen')
          ? target.name.replace(/-screen$/, '')
          : null
    const targetIdentifier = target.params?.screenKey ?? target.params?.designId

    if (!targetService || !targetIdentifier) return target

    return screenRoute(targetService, targetIdentifier)
  }

  return screenRoute(service, target)
}

export function getProductionActionRoutes(service, screenIdentifier) {
  const screen = resolveProductionScreen(service, screenIdentifier)
  const navigation = getProductionScreenNavigation(service, screenIdentifier)
  const configured = actionRoutesByScreenKey[service]?.[screen?.screenKey] ?? {}
  const primaryTarget = Object.prototype.hasOwnProperty.call(configured, 'primary')
    ? configured.primary
    : navigation.next?.screenKey
  const secondaryTarget = Object.prototype.hasOwnProperty.call(configured, 'secondary')
    ? configured.secondary
    : navigation.previous?.screenKey

  return {
    primary: resolveActionRoute(service, primaryTarget),
    secondary: resolveActionRoute(service, secondaryTarget),
  }
}

export function getProductionHomeRoute(service) {
  return homeRoute(service)
}
