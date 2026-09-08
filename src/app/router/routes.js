import {
  isVoiceSettingsScreen,
  resolveProductionScreen,
} from '../../features/service-screen/services/productionServiceScreens.js'

function createProductionServiceRoute(service) {
  return {
    path: `/${service}/:screenKey`,
    name: `${service}-screen`,
    component: () => import('@/features/service-screen/pages/ServiceScreenPage.vue'),
    props: true,
    meta: { service },
    beforeEnter: (to) => {
      const screenKey = String(to.params.screenKey || '')
      const screen = resolveProductionScreen(service, screenKey)

      if (service === 'living' && screen?.screenKey === 'living-voice-settings') {
        return { name: 'my-page' }
      }

      if (service === 'voice' && isVoiceSettingsScreen(screenKey)) {
        return { name: 'my-page' }
      }

      if (!screen) {
        return {
          name: service === 'voice' ? 'voice-home' : `${service}-home`,
        }
      }

      if (screen.screenKey !== screenKey) {
        return {
          name: screen.routeName ?? `${service}-screen`,
          params: { screenKey: screen.screenKey },
          query: to.query,
        }
      }

      return true
    },
  }
}

function createMyPageVoiceRoute() {
  return {
    path: '/mypage/voice/:screenKey',
    name: 'my-page-voice',
    component: () => import('@/features/service-screen/pages/ServiceScreenPage.vue'),
    props: true,
    meta: { service: 'voice', myPageVoice: true },
    beforeEnter: (to) => {
      const screenKey = String(to.params.screenKey || '')
      if (isVoiceSettingsScreen(screenKey) && resolveProductionScreen('voice', screenKey)) {
        const screen = resolveProductionScreen('voice', screenKey)
        if (screen?.screenKey !== screenKey) {
          return {
            name: 'my-page-voice',
            params: { screenKey: screen.screenKey },
            query: to.query,
          }
        }

        return true
      }

      return { name: 'my-page' }
    },
  }
}

export const routes = [
  {
    path: '/',
    redirect: { name: 'onboarding', params: { stepId: 'login' } },
  },
  {
    path: '/onboarding',
    redirect: { name: 'onboarding', params: { stepId: 'login' } },
  },
  {
    path: '/onboarding/help',
    name: 'onboarding-help',
    component: () => import('@/features/onboarding/pages/OnboardingHelpPage.vue'),
  },
  {
    path: '/font-size',
    name: 'font-size',
    component: () => import('@/features/my-page/pages/FontSizePage.vue'),
  },
  {
    path: '/onboarding/:stepId',
    name: 'onboarding',
    component: () => import('@/features/onboarding/pages/OnboardingPage.vue'),
  },
  {
    path: '/transfer',
    name: 'transfer-home',
    component: () => import('@/features/transfer/pages/TransferHomePage.vue'),
  },
  {
    path: '/bills',
    name: 'bills-home',
    component: () => import('@/app/pages/ServiceHomePage.vue'),
  },
  {
    path: '/living',
    name: 'living-home',
    component: () => import('@/app/pages/ServiceHomePage.vue'),
  },
  {
    path: '/mypage',
    name: 'my-page',
    component: () => import('@/features/my-page/pages/MyPagePage.vue'),
  },
  {
    path: '/mypage/font-size',
    name: 'my-page-font-size',
    component: () => import('@/features/my-page/pages/FontSizePage.vue'),
  },
  createMyPageVoiceRoute(),
  {
    path: '/mypage/transfer-pin',
    name: 'transfer-pin',
    component: () => import('@/features/transfer/pages/TransferPinPage.vue'),
  },
  {
    path: '/voice',
    name: 'voice-home',
    redirect: { name: 'my-page' },
  },
  createProductionServiceRoute('transfer'),
  createProductionServiceRoute('bills'),
  createProductionServiceRoute('living'),
  createProductionServiceRoute('voice'),
  {
    path: '/design-system',
    name: 'design-system',
    component: () => import('@/app/pages/DesignSystemPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'onboarding', params: { stepId: 'login' } },
  },
]
