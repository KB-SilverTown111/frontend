import { resolveProductionScreen } from '../services/productionServiceScreens.js'

function createProductionServiceRoute(service) {
  return {
    path: `/${service}/:screenId`,
    name: `${service}-screen`,
    component: () => import('@/views/ServiceRouteView.vue'),
    props: true,
    meta: { service },
    beforeEnter: (to) => {
      if (resolveProductionScreen(service, String(to.params.screenId))) return true

      return {
        name: service === 'voice' ? 'voice-home' : `${service}-home`,
      }
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
  {
    path: '/voice',
    name: 'voice-home',
    redirect: { name: 'voice-screen', params: { screenId: '5-01' } },
  },
  createProductionServiceRoute('transfer'),
  createProductionServiceRoute('bills'),
  createProductionServiceRoute('living'),
  createProductionServiceRoute('voice'),
  {
    path: '/prototype',
    name: 'prototype-index',
    component: () => import('@/views/PrototypeIndexView.vue'),
  },
  {
    path: '/prototype/help',
    name: 'prototype-help',
    component: () => import('@/views/PrototypeHelpView.vue'),
  },
  {
    path: '/prototype/:flow/:screenId',
    name: 'prototype-screen',
    component: () => import('@/views/PrototypeScreenView.vue'),
  },
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
