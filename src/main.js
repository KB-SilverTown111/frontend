import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router/index.js'
import { applyFontScale, readFontScale } from './services/fontScale.js'
import { useOnboardingStore } from './stores/onboarding.js'
import './styles/globals.css'

async function bootstrap() {
  applyFontScale(readFontScale())

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  await useOnboardingStore(pinia).restoreAuthSession()
  app.mount('#app')
}

bootstrap()
