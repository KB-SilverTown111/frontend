import { createRouter, createWebHistory } from 'vue-router'

import { beginAppLoading, endAppLoading } from '@/services/appLoading.js'
import { routes } from './routes.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(() => {
  beginAppLoading()
})

router.afterEach(() => {
  endAppLoading()
})

export default router
