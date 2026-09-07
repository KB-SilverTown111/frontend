import {
  isVoiceSettingsScreen,
  resolveProductionScreen,
} from '../services/productionServiceScreens.js'

function createProductionServiceRoute(service) {
  return {
    path: `/${service}/:screenId`,
    name: `${service}-screen`,
    component: () => import('@/views/ServiceRouteView.vue'),
    props: true,
    meta: { service },
    beforeEnter: (to) => {
      if (service === 'living' && String(to.params.screenId) === '4-13') {
        return { name: 'my-page' }
      }

      if (service === 'voice' && isVoiceSettingsScreen(String(to.params.screenId))) {
        return { name: 'my-page' }
      }

      if (resolveProductionScreen(service, String(to.params.screenId))) return true

      return {
        name: service === 'voice' ? 'voice-home' : `${service}-home`,
      }
    },
  }
}

function createMyPageVoiceRoute() {
  return {
    path: '/mypage/voice/:screenId',
    name: 'my-page-voice',
    component: () => import('@/views/ServiceRouteView.vue'),
    props: true,
    meta: { service: 'voice', myPageVoice: true },
    beforeEnter: (to) => {
      if (
        isVoiceSettingsScreen(String(to.params.screenId)) &&
        resolveProductionScreen('voice', String(to.params.screenId))
      ) {
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
    component: () => import('@/views/OnboardingHelpView.vue'),
  },
  {
    path: '/font-size',
    name: 'font-size',
    component: () => import('@/views/MyPageFontSizeView.vue'),
  },
  {
    path: '/onboarding/:stepId',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
  },
  {
    path: '/transfer',
    name: 'transfer-home',
    component: () => import('@/views/TransferHomeView.vue'),
  },
  {
    path: '/bills',
    name: 'bills-home',
    component: () => import('@/views/ServiceHomeView.vue'),
  },
  {
    path: '/living',
    name: 'living-home',
    component: () => import('@/views/ServiceHomeView.vue'),
  },
  {
    path: '/mypage',
    name: 'my-page',
    component: () => import('@/views/MyPageView.vue'),
  },
  {
    path: '/mypage/font-size',
    name: 'my-page-font-size',
    component: () => import('@/views/MyPageFontSizeView.vue'),
  },
  createMyPageVoiceRoute(),
  {
    path: '/mypage/transfer-pin',
    name: 'transfer-pin',
    component: () => import('@/views/TransferPinView.vue'),
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
    component: () => import('@/views/DesignSystemView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'onboarding', params: { stepId: 'login' } },
  },
]
