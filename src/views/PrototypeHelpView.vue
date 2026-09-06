<script setup>
import { useRouter } from 'vue-router'

import MobileScreenShell from '@/components/prototype/MobileScreenShell.vue'
import ScreenContent from '@/components/prototype/ScreenContent.vue'
import helpScreen from '@/prototype/data/help'
import { getPrototypeStartRoute } from '@/prototype/prototypeFlows'

const router = useRouter()
</script>

<template>
  <MobileScreenShell
    :primary-label="helpScreen.primaryLabel"
    :secondary-label="helpScreen.secondaryLabel"
    :show-help="false"
    :show-tabs="false"
    @back="router.push({ name: 'prototype-index' })"
    @primary="router.push(getPrototypeStartRoute('voice'))"
    @secondary="router.push({ name: 'prototype-index' })"
  >
    <ScreenContent :screen="helpScreen" />
  </MobileScreenShell>
</template>
