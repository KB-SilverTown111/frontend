<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import MobileScreenShell from '@/components/prototype/MobileScreenShell.vue'
import ScreenContent from '@/components/prototype/ScreenContent.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  buildPrototypeNavigation,
  resolvePrototypeScreen,
} from '@/prototype/resolvePrototypeScreen.js'

const route = useRoute()
const router = useRouter()
const result = ref(null)
const loading = ref(true)
const loadError = ref(false)
let requestId = 0

const navigation = computed(() => {
  if (!result.value) return null

  return buildPrototypeNavigation(
    String(route.params.flow),
    result.value.screens,
    result.value.index,
  )
})

async function loadScreen() {
  const currentRequest = ++requestId
  loading.value = true
  loadError.value = false

  try {
    const nextResult = await resolvePrototypeScreen(
      String(route.params.flow),
      String(route.params.screenId),
    )
    if (currentRequest === requestId) result.value = nextResult
  } catch {
    if (currentRequest === requestId) {
      result.value = null
      loadError.value = true
    }
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

function go(target) {
  if (target) router.push(target)
}

watch(() => [route.params.flow, route.params.screenId], loadScreen, { immediate: true })
</script>

<template>
  <MobileScreenShell
    v-if="result && !loading"
    :primary-label="result.screen.primaryLabel"
    :secondary-label="result.screen.secondaryLabel"
    :show-help="result.screen.showHelp"
    :show-tabs="result.screen.showTabs"
    @back="go(navigation.previous)"
    @help="go({ name: 'prototype-help' })"
    @primary="go(navigation.next)"
    @secondary="go(navigation.previous)"
  >
    <ScreenContent :screen="result.screen" />
  </MobileScreenShell>

  <div
    v-else
    class="prototype-stage"
  >
    <section class="prototype-state-card">
      <template v-if="loading">
        <p class="text-sm font-bold text-muted-foreground">화면을 불러오는 중</p>
        <Progress
          class="mt-4"
          :value="64"
        />
      </template>
      <Alert
        v-else
        :variant="loadError ? 'destructive' : 'warning'"
      >
        <AlertTitle>{{
          loadError ? '화면을 불러오지 못했어요' : '화면을 찾을 수 없어요'
        }}</AlertTitle>
        <AlertDescription>
          {{
            loadError ? '잠시 후 다시 시도해 주세요.' : '프로토타입 목록에서 화면을 선택해 주세요.'
          }}
        </AlertDescription>
      </Alert>
      <div
        v-if="!loading"
        class="mt-5 grid gap-3"
      >
        <Button
          v-if="loadError"
          @click="loadScreen"
          >다시 시도</Button
        >
        <Button
          variant="secondary"
          @click="go({ name: 'prototype-index' })"
          >화면 목록</Button
        >
      </div>
    </section>
  </div>
</template>
