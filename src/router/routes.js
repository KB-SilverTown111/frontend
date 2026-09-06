export const routes = [
  {
    path: '/',
    redirect: { name: 'onboarding', params: { stepId: 'start' } },
  },
  {
    path: '/onboarding',
    redirect: { name: 'onboarding', params: { stepId: 'start' } },
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
    redirect: { name: 'onboarding', params: { stepId: 'start' } },
  },
]
