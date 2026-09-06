<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPrototypeStartRoute, loadFlow, prototypeFlows } from '@/prototype/prototypeFlows'

const router = useRouter()
const expandedFlow = ref('')
const screensByFlow = ref({})
const loadingFlow = ref('')
const loadError = ref('')

function openFlow(flowKey) {
  router.push(getPrototypeStartRoute(flowKey))
}

async function toggleScreens(flowKey) {
  if (expandedFlow.value === flowKey) {
    expandedFlow.value = ''
    return
  }

  expandedFlow.value = flowKey
  loadError.value = ''
  if (screensByFlow.value[flowKey]) return

  loadingFlow.value = flowKey
  try {
    const screens = await loadFlow(flowKey)
    screensByFlow.value = { ...screensByFlow.value, [flowKey]: screens ?? [] }
  } catch {
    loadError.value = '화면 목록을 불러오지 못했어요. 다시 시도해 주세요.'
  } finally {
    loadingFlow.value = ''
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#f2f5f4] px-5 py-8 sm:px-8 lg:py-12">
    <div class="mx-auto max-w-6xl space-y-8">
      <header class="rounded-[32px] bg-foreground p-7 text-white shadow-xl sm:p-11">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <Badge class="bg-white/10 text-white">110 SCREENS</Badge>
          <RouterLink
            class="rounded-lg px-3 py-2 font-bold text-[#d9e5e8] hover:bg-white/10 hover:text-white"
            :to="{ name: 'design-system' }"
          >
            디자인시스템 보기
          </RouterLink>
        </div>
        <h1 class="mt-6 text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
          귀편한 금융 화면
        </h1>
        <p
          class="mt-4 max-w-2xl text-[length:var(--font-size-body)] leading-relaxed text-[#d9e5e8]"
        >
          흐름별 첫 화면으로 바로 이동하거나, 전체 화면 목록을 펼쳐 원하는 장면을 확인할 수 있어요.
        </p>
      </header>

      <section
        class="grid gap-5 lg:grid-cols-2"
        aria-label="프로토타입 흐름"
      >
        <Card
          v-for="flow in prototypeFlows"
          :key="flow.key"
          class="overflow-hidden"
        >
          <CardHeader>
            <div class="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{{ flow.label }}</CardTitle>
                <CardDescription class="mt-2">{{ flow.count }}개 화면</CardDescription>
              </div>
              <Badge variant="success">화면 6</Badge>
            </div>
          </CardHeader>
          <CardContent
            v-if="expandedFlow === flow.key"
            class="border-t pt-6"
          >
            <p
              v-if="loadingFlow === flow.key"
              class="text-muted-foreground"
              role="status"
            >
              화면 목록을 불러오는 중이에요…
            </p>
            <p
              v-else-if="loadError"
              class="text-destructive"
              role="alert"
            >
              {{ loadError }}
            </p>
            <div
              v-else
              class="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
            >
              <RouterLink
                v-for="screen in screensByFlow[flow.key]"
                :key="screen.id"
                class="rounded-xl border bg-background px-4 py-3 font-semibold transition-colors hover:border-primary hover:bg-muted"
                :to="{
                  name: 'prototype-screen',
                  params: { flow: flow.key, screenId: screen.id },
                }"
              >
                <span>{{ screen.title }}</span>
              </RouterLink>
            </div>
          </CardContent>
          <CardFooter class="grid grid-cols-2 gap-3">
            <Button @click="openFlow(flow.key)">첫 화면</Button>
            <Button
              variant="secondary"
              @click="toggleScreens(flow.key)"
            >
              {{ expandedFlow === flow.key ? '목록 닫기' : '전체 보기' }}
            </Button>
          </CardFooter>
        </Card>

        <Card class="border-primary/30 bg-[#fffaf0] lg:col-span-2">
          <CardHeader>
            <div class="flex items-start justify-between gap-4">
              <div>
                <CardTitle>물음표 버튼 화면 6</CardTitle>
                <CardDescription class="mt-2">
                  마이크 또는 글자로 도움을 요청하는 공통 도움말 화면입니다.
                </CardDescription>
              </div>
              <Badge>포함됨</Badge>
            </div>
          </CardHeader>
          <CardFooter>
            <Button
              class="w-full"
              @click="router.push({ name: 'prototype-help' })"
            >
              도움말 화면 보기
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  </main>
</template>
