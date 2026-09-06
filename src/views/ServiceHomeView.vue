<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const route = useRoute()

const serviceScreens = {
  bills: {
    title: '고지서 목록',
    description: '등록된 고지서 상태와 납부기한을 봅니다.',
    groups: [[{ label: '전기요금 · 48,200원', selected: true }, { label: '통신요금 · 납부 완료' }]],
    primaryLabel: '고지서 등록',
  },
  living: {
    title: '내 정보',
    description: '계좌·알림·이동점포로 이동합니다.',
    groups: [
      [{ label: '내 계좌', selected: true }, { label: '납부 알림' }],
      [{ label: '이동점포 정보', selected: true }, { label: '가입 정보' }],
    ],
    primaryLabel: '',
  },
}

const service = computed(() => (route.name === 'living-home' ? 'living' : 'bills'))
const screen = computed(() => serviceScreens[service.value])

function startVoiceAssist() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-transfer'))
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell service-home-device">
      <header class="app-header">
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
        <strong class="app-brand">귀편한 금융</strong>
        <Button
          aria-label="음성 도움"
          class="app-header-button service-mic-button"
          size="icon"
          variant="secondary"
          @click="startVoiceAssist"
        >
          <span
            aria-hidden="true"
            class="service-mic-icon"
          >
            <span class="service-mic-stem" />
          </span>
        </Button>
      </header>

      <main class="app-main service-home-main">
        <section class="screen-heading service-home-heading">
          <span class="service-home-kicker">{{
            service === 'bills' ? '고지서 · 홈' : '생활금융 · 홈'
          }}</span>
          <h1>{{ screen.title }}</h1>
          <p>{{ screen.description }}</p>
        </section>

        <div class="service-home-content">
          <Card class="service-list-card">
            <CardContent class="service-list-content">
              <div
                v-for="(group, groupIndex) in screen.groups"
                :key="groupIndex"
                class="service-choice-grid"
              >
                <div
                  v-for="choice in group"
                  :key="choice.label"
                  class="service-choice"
                  :class="{ selected: choice.selected }"
                >
                  <span>{{ choice.label }}</span>
                  <b v-if="choice.selected">✓</b>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer
        v-if="screen.primaryLabel"
        class="app-actions service-home-actions"
      >
        <Button class="w-full">{{ screen.primaryLabel }}</Button>
      </footer>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav three-items service-bottom-nav"
      >
        <RouterLink
          :aria-current="route.name === 'transfer-home' ? 'page' : undefined"
          :to="{ name: 'transfer-home' }"
        >
          홈
        </RouterLink>
        <RouterLink
          :aria-current="route.name === 'bills-home' ? 'page' : undefined"
          :to="{ name: 'bills-home' }"
        >
          고지서
        </RouterLink>
        <RouterLink
          :aria-current="route.name === 'living-home' ? 'page' : undefined"
          :to="{ name: 'living-home' }"
        >
          생활금융
        </RouterLink>
      </nav>
    </article>
  </div>
</template>
