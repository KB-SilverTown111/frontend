<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

import AppLoadingOverlay from '@/shared/components/feedback/AppLoadingOverlay.vue'

let releaseStableViewportHeight = () => {}

onMounted(() => {
  const root = document.documentElement
  let stableHeight = Math.round(window.innerHeight)

  const updateStableViewportHeight = () => {
    const currentHeight = Math.round(window.innerHeight)
    const textFieldFocused = document.activeElement?.matches('input, select, textarea')

    if (textFieldFocused && currentHeight <= stableHeight * 0.8) return

    stableHeight = currentHeight
    root.style.setProperty('--app-stable-height', `${stableHeight}px`)
  }

  updateStableViewportHeight()
  window.addEventListener('resize', updateStableViewportHeight)
  window.visualViewport?.addEventListener('resize', updateStableViewportHeight)

  releaseStableViewportHeight = () => {
    window.removeEventListener('resize', updateStableViewportHeight)
    window.visualViewport?.removeEventListener('resize', updateStableViewportHeight)
    root.style.removeProperty('--app-stable-height')
  }
})

onBeforeUnmount(() => {
  releaseStableViewportHeight()
  releaseStableViewportHeight = () => {}
})
</script>

<template>
  <RouterView />
  <AppLoadingOverlay />
</template>
